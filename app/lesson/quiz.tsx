"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";
import { useAudio, useMount } from "react-use";
import { toast } from "sonner";

import { completeLesson, submitAnswer } from "@/actions/attempts";
import { recordLessonComplete } from "@/actions/streak";
import { MAX_HEARTS } from "@/constants";
import { challengeOptions, challenges, userSubscription } from "@/db/schema";
import { useHeartsModal } from "@/store/use-hearts-modal";
import { usePracticeModal } from "@/store/use-practice-modal";
import { useCelebrate } from "@/store/use-celebrate";
import { answerXp } from "@/lib/xp";

import { type Answer, Challenge } from "./challenge";
import { installUnlock, play, prefetch } from "./audio";
import { Footer } from "./footer";
import { Header } from "./header";
import { QuestionBubble } from "./question-bubble";
import { type LessonDone, RewardSteps } from "./reward-steps";

type QuizProps = {
  initialPercentage: number;
  initialHearts: number;
  initialLessonId: number;
  practice?: boolean; // 약점 복습: runs on a bare challenge set; never touches challenge_progress
  questsBefore: Record<string, number>; // each quest's progress when the lesson began (lib/economy questSnapshot)
  initialLessonChallenges: (typeof challenges.$inferSelect & {
    completed: boolean;
    challengeOptions: (typeof challengeOptions.$inferSelect)[];
  })[];
  userSubscription:
    | (typeof userSubscription.$inferSelect & {
        isActive: boolean;
      })
    | null;
};

// Speech-recognition language for SPEAK: an explicit meta.lang wins; otherwise the script of the text
// decides. Covers the scripts courses actually use; anything else should set meta.lang (docs/COURSES.md).
const speechLang = (explicit: string | undefined, text: string) =>
  explicit || (/[가-힣]/.test(text) ? "ko-KR" : /[぀-ヿ一-龯]/.test(text) ? "ja-JP" : /[一-鿿]/.test(text) ? "zh-CN" : "en-US");

// whitespace-insensitive compare for BUILD: authored targets may carry stray spaces around tiles
const squash = (t: string) => t.replace(/\s+/g, " ").trim();

export const Quiz = ({
  initialPercentage,
  initialHearts,
  initialLessonId,
  practice = false,
  questsBefore,
  initialLessonChallenges,
  userSubscription,
}: QuizProps) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [correctAudio, _c, correctControls] = useAudio({ src: "/correct.wav" });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [incorrectAudio, _i, incorrectControls] = useAudio({
    src: "/incorrect.wav",
  });
  const [finishAudio] = useAudio({
    src: "/finish.mp3",
    autoPlay: true,
  });
  const router = useRouter();
  const { open: openHeartsModal } = useHeartsModal();
  const { open: openPracticeModal } = usePracticeModal();
  const celebrate = useCelebrate((s) => s.fire);

  useMount(() => {
    if (initialPercentage === 100) openPracticeModal();
  });

  const [lessonId] = useState(initialLessonId);
  const [hearts, setHearts] = useState(initialHearts);
  /*
   The lesson is a queue, not a fixed list: a missed item is appended and comes back before
   the lesson can end (Duolingo's "you get it right eventually" mechanic, and the reason a
   lesson only counts as complete once every item was answered correctly). Capped at two
   re-asks per item so a lesson always ends.
  */
  const [queue, setQueue] = useState(initialLessonChallenges);
  const [activeIndex, setActiveIndex] = useState(() => {
    const uncompletedIndex = initialLessonChallenges.findIndex((challenge) => !challenge.completed);
    return uncompletedIndex === -1 ? 0 : uncompletedIndex;
  });
  const reasks = useRef(new Map<number, number>());
  // combos: runs of correct answers that reached a multiple of 5 (the session bonus counts them)
  const stats = useRef({ firstTryCorrect: 0, wrong: 0, bestCombo: 0, combos: 0, startedAt: Date.now(), recovered: new Set<number>() });
  const [combo, setCombo] = useState(0);
  const [runXp, setRunXp] = useState(0); // what this run earned per lib/xp.ts — the server credits the same
  const [done, setDone] = useState<LessonDone | null>(null);
  const [doneFailed, setDoneFailed] = useState(false);
  const unique = initialLessonChallenges.length;
  const percentage = queue.length ? Math.min(100, (activeIndex / queue.length) * 100) : 0;

  const [answer, setAnswer] = useState<Answer | null>(null);
  const attended = useRef(false); // ref, not state: React dev StrictMode runs effects twice before state settles → double attendance
  const [status, setStatus] = useState<"none" | "wrong" | "correct">("none");

  const challenge = queue[activeIndex];
  // Deterministic per-challenge shuffle: content authors can't always balance the correct
  // position, and answer-position patterns defeat the measurement. Stable per challenge so
  // re-renders (and re-checks) don't reorder under the user's finger.
  const options = useMemo(() => {
    const list = challenge?.challengeOptions ?? [];
    if (list.length < 2 || !challenge) return list;
    let seed = 0;
    for (const ch of String(challenge.id)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rand = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 2 ** 32; };
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }, [challenge]);

  // iOS: allow auto-play after the first tap on this page.
  useEffect(() => installUnlock(), []);

  // Warm upcoming clips while the learner answers this one. Options carry audio too — a
  // 짝 맞추기 board is a dozen tappable tiles, each of which would otherwise fetch on tap.
  useEffect(() => {
    const upcoming = queue.slice(activeIndex, activeIndex + 5);
    prefetch(upcoming.flatMap((c) => [c.audioSrc, ...c.challengeOptions.map((o) => o.audioSrc)]));
  }, [queue, activeIndex]);

  // 출석: the moment the lesson runs out of challenges, once.
  useEffect(() => {
    if (challenge || attended.current) return;
    attended.current = true;
    // mark the lesson done first so the /learn revalidation inside recordLessonComplete sees it
    // the rewards are shown as step screens (reward-steps.tsx) built from this answer
    (practice ? Promise.resolve() : completeLesson(lessonId))
      .then(() => recordLessonComplete(practice ? "practice" : "lesson", { perfect: stats.current.firstTryCorrect === unique, combos: stats.current.combos }))
      .then(setDone)
      .catch(() => setDoneFailed(true));
  }, [challenge, practice]);

  const onNext = () => {
    setActiveIndex((current) => current + 1);
  };

  const meta = (challenge?.meta ?? {}) as { target?: string; reading?: string; explanation?: string; lang?: string };

  // One place that knows what "right" means for every exercise type.
  const judge = (a: Answer | null): boolean | null => {
    if (!challenge || !a) return null;
    const answer = a;
    switch (challenge.type) {
      case "SELECT": case "ASSIST": case "LISTEN": {
        const correct = options.find((o) => o.correct); return answer.kind === "option" && !!correct && correct.id === answer.id; }
      case "BUILD": return answer.kind === "build" && squash(answer.text) === squash(meta.target ?? "");
      case "MATCH": return answer.kind === "match";           // finishing the board is the win; misses just cost taps
      case "TRACE": return answer.kind === "trace";           // self-judged
      case "SPEAK": return answer.kind === "speak" && answer.ok;
      default: return null;
    }
  };
  const wrongHint = challenge?.type === "BUILD" ? `정답: ${meta.target ?? ""}` : ["SELECT", "LISTEN"].includes(challenge?.type ?? "") ? `정답: ${options.find((o) => o.correct)?.text ?? ""}` : challenge?.type === "ASSIST" ? `정답: ${options.find((o) => o.correct)?.text ?? ""}` : undefined;

  const check = (a: Answer) => {
    const ok = judge(a);
    if (ok === null) return;

    // Paint the verdict from the client's own judgement. Waiting for the server first cost
    // ~650ms of dead time per item and made the platform lessons feel sluggish next to the
    // 히라가나 tab, which judges locally. Persistence follows in the background.
    if (ok) {
      void correctControls.play();
      setStatus("correct");
      const recovered = reasks.current.has(challenge.id);
      if (!recovered) stats.current.firstTryCorrect++; else stats.current.recovered.add(challenge.id);
      const gained = answerXp({ practice, recovered, replay: challenge.completed });
      setRunXp((x) => x + gained);
      // counted here, not in a state updater: dev StrictMode runs updaters twice
      const n = combo + 1;
      setCombo(n);
      stats.current.bestCombo = Math.max(stats.current.bestCombo, n);
      if (n % 5 === 0) stats.current.combos++;
      if (n === 3 || n === 5 || n === 10 || (n > 10 && n % 5 === 0)) setTimeout(() => celebrate({ kind: "combo", title: `🔥 ${n}연속!`, light: true }), 120);
    } else {
      void incorrectControls.play();
      setStatus("wrong");
      stats.current.wrong++;
      setCombo(0);
      if (!practice) setHearts((prev) => (userSubscription?.isActive ? prev : Math.max(prev - 1, 0)));
    }
    if (challenge.audioSrc && challenge.type !== "TRACE") play(challenge.audioSrc);

    void submitAnswer(challenge.id, ok, practice, reasks.current.has(challenge.id))
      .then((res) => { if (res?.error === "hearts") openHeartsModal(); })
      .catch(() => toast.error("기록을 저장하지 못했어요. 연결을 확인해 주세요."));
  };

  const onAnswer = (a: Answer | null) => {
    if (status !== "none") return;
    setAnswer(a);
    // A finished 짝 맞추기 board is already the answer — asking for 확인 on top of the last
    // pair is a tap that carries no decision.
    if (a && challenge?.type === "MATCH") check(a);
  };

  const onContinue = () => {
    if (status === "wrong") {
      // Show the answer, move on — and bring the item back before the lesson ends.
      const n = reasks.current.get(challenge.id) ?? 0;
      if (n < 2) { reasks.current.set(challenge.id, n + 1); setQueue((q) => [...q, challenge]); }
      onNext(); setStatus("none"); setAnswer(null); return;
    }
    if (status === "correct") { onNext(); setStatus("none"); setAnswer(null); return; }
    if (answer) check(answer);
  };

  if (!challenge) {
    const secs = Math.max(1, Math.round((Date.now() - stats.current.startedAt) / 1000));
    const missed = unique - stats.current.firstTryCorrect;
    return (
      <>
        {finishAudio}
        <RewardSteps
          lessonId={lessonId}
          stats={{
            practice,
            xp: runXp,
            accuracy: unique ? Math.round((100 * stats.current.firstTryCorrect) / unique) : 100,
            timeLabel: secs >= 60 ? `${Math.floor(secs / 60)}분 ${secs % 60}초` : `${secs}초`,
            bestCombo: stats.current.bestCombo,
            missed,
            recovered: stats.current.recovered.size,
          }}
          done={done}
          failed={doneFailed}
          questsBefore={questsBefore}
          // a first completion comes back to the path with ?done so the node fills and the next one opens
          onFinish={() => router.push(practice || initialPercentage === 100 ? "/learn" : `/learn?done=${lessonId}`)}
        />
      </>
    );
  }

  // ASSIST prompts differ by what the token is: a kana asks for its reading, anything else asks for meaning/the fitting answer.
  const title =
    challenge.type === "ASSIST"
      ? challenge.tag === "kana" ? "어떻게 읽어요?" : ["word", "vocab", "expression"].includes(challenge.tag ?? "") ? "무슨 뜻일까요?" : "알맞은 것을 고르세요"
      : challenge.question;
  const longTitle = title.length > 60 || title.includes("\n");

  return (
    <>
      {incorrectAudio}
      {correctAudio}
      <Header
        hearts={hearts}
        percentage={percentage}
        hasActiveSubscription={!!userSubscription?.isActive}
        combo={combo}
      />

      <div className="flex-1 overflow-x-clip">
        <div className="flex h-full items-center justify-center">
          {/* keyed by queue position: every item, a re-ask included, mounts fresh and slides in */}
          <div
            key={activeIndex}
            className="flex w-full animate-[challenge-in_220ms_cubic-bezier(0.23,1,0.32,1)] flex-col gap-y-8 px-5 py-4 motion-reduce:animate-[fade_150ms_ease-out] lg:min-h-[350px] lg:w-[600px] lg:px-0"
          >
            <h1 className={longTitle ? "whitespace-pre-line text-left text-lg font-semibold leading-relaxed [word-break:keep-all] [overflow-wrap:anywhere] text-neutral-700 lg:text-xl" : "whitespace-pre-line text-center text-2xl font-bold [word-break:keep-all] [overflow-wrap:anywhere] text-neutral-700 lg:text-start lg:text-3xl"}>
              {title}
            </h1>

            <div>
              {challenge.type === "ASSIST" && (
                <QuestionBubble question={challenge.question} />
              )}

              <Challenge
                challenge={challenge}
                options={options}
                answer={answer}
                onAnswer={onAnswer}
                status={status}
                lang={speechLang(meta.lang, meta.target ?? challenge.question)}
              />
            </div>
          </div>
        </div>
      </div>

      <Footer
        disabled={!answer}
        status={status}
        onCheck={onContinue}
        wrongHint={wrongHint}
        explanation={status === "wrong" ? meta.explanation : undefined}
      />
    </>
  );
};
