"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";
import Confetti from "react-confetti";
import { useAudio, useWindowSize, useMount } from "react-use";
import { toast } from "sonner";

import { submitAnswer } from "@/actions/attempts";
import { recordLessonComplete } from "@/actions/streak";
import { MAX_HEARTS } from "@/constants";
import { challengeOptions, challenges, userSubscription } from "@/db/schema";
import { useHeartsModal } from "@/store/use-hearts-modal";
import { usePracticeModal } from "@/store/use-practice-modal";
import { useCelebrate } from "@/store/use-celebrate";

import { type Answer, Challenge } from "./challenge";
import { installUnlock, play, prefetch } from "./audio";
import { Footer } from "./footer";
import { Header } from "./header";
import { QuestionBubble } from "./question-bubble";

const EndStat = ({ label, value, tone }: { label: string; value: string; tone: "orange" | "sky" | "green" }) => {
  const c = tone === "orange" ? "border-orange-400 bg-orange-400 text-orange-500" : tone === "green" ? "border-green-500 bg-green-500 text-green-600" : "border-sky-400 bg-sky-400 text-sky-500";
  return (
    <div className={`overflow-hidden rounded-2xl border-2 ${c.split(" ")[0]}`}>
      <div className={`px-1 py-1 text-[11px] font-bold uppercase tracking-wide text-white ${c.split(" ")[1]}`}>{label}</div>
      <div className={`bg-white px-1 py-3 text-base font-extrabold tabular-nums ${c.split(" ")[2]}`}>{value}</div>
    </div>
  );
};

type QuizProps = {
  initialPercentage: number;
  initialHearts: number;
  initialLessonId: number;
  practice?: boolean; // 약점 복습: runs on a bare challenge set; never touches challenge_progress
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

export const Quiz = ({
  initialPercentage,
  initialHearts,
  initialLessonId,
  practice = false,
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
  const { width, height } = useWindowSize();

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
  const stats = useRef({ firstTryCorrect: 0, wrong: 0, bestCombo: 0, startedAt: Date.now(), recovered: new Set<number>() });
  const [combo, setCombo] = useState(0);
  const [done, setDone] = useState<{ streak: number; firstToday: boolean; claimable: number } | null>(null);
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
    recordLessonComplete(practice ? "practice" : "lesson").then((d) => {
      setDone(d);
      if (d.firstToday && d.streak > 0) setTimeout(() => celebrate({ kind: "streak", title: `🔥 ${d.streak}일 연속!`, subtitle: "오늘 몫을 채웠어요" }), 400);
    }).catch(() => {});
  }, [challenge, practice]);

  const onNext = () => {
    setActiveIndex((current) => current + 1);
  };

  const meta = (challenge?.meta ?? {}) as { target?: string; reading?: string; explanation?: string };

  // One place that knows what "right" means for every exercise type.
  const judge = (a: Answer | null): boolean | null => {
    if (!challenge || !a) return null;
    const answer = a;
    switch (challenge.type) {
      case "SELECT": case "ASSIST": case "LISTEN": {
        const correct = options.find((o) => o.correct); return answer.kind === "option" && !!correct && correct.id === answer.id; }
      case "BUILD": return answer.kind === "build" && answer.text === meta.target;
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
      if (!reasks.current.has(challenge.id)) stats.current.firstTryCorrect++; else stats.current.recovered.add(challenge.id);
      setCombo((c) => {
        const n = c + 1; stats.current.bestCombo = Math.max(stats.current.bestCombo, n);
        if (n === 3 || n === 5 || n === 10 || (n > 10 && n % 5 === 0)) setTimeout(() => celebrate({ kind: "combo", title: `🔥 ${n}연속!`, light: true }), 120);
        return n;
      });
    } else {
      void incorrectControls.play();
      setStatus("wrong");
      stats.current.wrong++;
      setCombo(0);
      if (!practice) setHearts((prev) => (userSubscription?.isActive ? prev : Math.max(prev - 1, 0)));
    }
    if (challenge.audioSrc && challenge.type !== "TRACE") play(challenge.audioSrc);

    void submitAnswer(challenge.id, ok, practice)
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
    const xp = unique * 10;
    const accuracy = unique ? Math.round((100 * stats.current.firstTryCorrect) / unique) : 100;
    const secs = Math.max(1, Math.round((Date.now() - stats.current.startedAt) / 1000));
    const timeLabel = secs >= 60 ? `${Math.floor(secs / 60)}분 ${secs % 60}초` : `${secs}초`;
    const headline = accuracy === 100 ? "완벽해요!" : accuracy >= 80 ? "잘했어요!" : "끝까지 왔어요!";
    return (
      <>
        {finishAudio}
        <Confetti recycle={false} numberOfPieces={500} tweenDuration={10_000} width={width} height={height} />
        <div className="mx-auto flex h-full w-full max-w-lg flex-col items-center justify-center gap-y-5 px-5 text-center">
          <Image src="/finish.svg" alt="" height={100} width={100} />
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-700 lg:text-3xl">{headline}</h1>
            <p className="mt-1 text-muted-foreground">
              {practice ? "약점 복습을 끝냈어요" : "레슨을 완료했어요"}
              {unique - stats.current.firstTryCorrect > 0 && ` · 처음에 틀린 ${unique - stats.current.firstTryCorrect}개 중 ${stats.current.recovered.size}개를 다시 맞혔어요`}
            </p>
          </div>

          <div className="grid w-full grid-cols-3 gap-3">
            <EndStat label="획득 XP" value={`⚡️ ${xp}`} tone="orange" />
            <EndStat label="정확도" value={`${accuracy}%`} tone={accuracy >= 80 ? "green" : "sky"} />
            <EndStat label="시간" value={timeLabel} tone="sky" />
          </div>
          {stats.current.bestCombo >= 3 && (
            <p className="text-sm font-bold text-orange-500">🔥 최고 {stats.current.bestCombo}연속 정답</p>
          )}

          {done?.firstToday && done.streak > 0 && (
            <div className="w-full animate-[pop_.5s_ease-out] rounded-2xl border-2 border-orange-300 bg-orange-50 p-4">
              <div className="text-4xl">🔥</div>
              <div className="mt-1 text-xl font-extrabold text-orange-600">{done.streak}일 연속 출석!</div>
              <div className="text-sm text-orange-700/80">오늘 몫을 채웠어요. 내일도 하나만 하면 이어져요.</div>
            </div>
          )}
          {done && !done.firstToday && done.streak > 0 && (
            <p className="text-sm font-bold text-orange-500">🔥 연속 {done.streak}일 유지 중</p>
          )}
          {done && done.claimable > 0 && (
            <button type="button" onClick={() => router.push("/quests")} className="w-full rounded-2xl border-2 border-b-4 border-sky-500 bg-sky-400 px-4 py-3 text-base font-bold text-white active:translate-y-[2px] active:border-b-2">
              💎 퀘스트 {done.claimable}개 달성 — 젬 받으러 가기
            </button>
          )}
        </div>

        <Footer lessonId={practice ? undefined : lessonId} status="completed" onCheck={() => router.push("/learn")} />
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

      <div className="flex-1">
        <div className="flex h-full items-center justify-center">
          <div className="flex w-full flex-col gap-y-8 px-5 py-4 lg:min-h-[350px] lg:w-[600px] lg:px-0">
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
                lang="ja-JP"
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
