"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";
import Confetti from "react-confetti";
import { useAudio, useWindowSize, useMount } from "react-use";
import { toast } from "sonner";

import { upsertChallengeProgress } from "@/actions/challenge-progress";
import { recordAttempt } from "@/actions/attempts";
import { recordLessonComplete } from "@/actions/streak";
import { reduceHearts } from "@/actions/user-progress";
import { MAX_HEARTS } from "@/constants";
import { challengeOptions, challenges, userSubscription } from "@/db/schema";
import { useHeartsModal } from "@/store/use-hearts-modal";
import { usePracticeModal } from "@/store/use-practice-modal";

import { type Answer, Challenge } from "./challenge";
import { play } from "./audio";
import { Footer } from "./footer";
import { Header } from "./header";
import { QuestionBubble } from "./question-bubble";
import { ResultCard } from "./result-card";

type QuizProps = {
  initialPercentage: number;
  initialHearts: number;
  initialLessonId: number;
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
  const [pending, startTransition] = useTransition();
  const { open: openHeartsModal } = useHeartsModal();
  const { open: openPracticeModal } = usePracticeModal();

  useMount(() => {
    if (initialPercentage === 100) openPracticeModal();
  });

  const [lessonId] = useState(initialLessonId);
  const [hearts, setHearts] = useState(initialHearts);
  const [percentage, setPercentage] = useState(() => {
    return initialPercentage === 100 ? 0 : initialPercentage;
  });
  const [challenges] = useState(initialLessonChallenges);
  const [activeIndex, setActiveIndex] = useState(() => {
    const uncompletedIndex = challenges.findIndex(
      (challenge) => !challenge.completed
    );

    return uncompletedIndex === -1 ? 0 : uncompletedIndex;
  });

  const [answer, setAnswer] = useState<Answer | null>(null);
  const [attended, setAttended] = useState(false);
  const [status, setStatus] = useState<"none" | "wrong" | "correct">("none");

  const challenge = challenges[activeIndex];
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

  // 출석: the moment the lesson runs out of challenges, once.
  useEffect(() => {
    if (challenge || attended) return;
    setAttended(true);
    void recordLessonComplete().catch(() => {});
  }, [challenge, attended]);

  const onNext = () => {
    setActiveIndex((current) => current + 1);
  };

  const meta = (challenge?.meta ?? {}) as { target?: string; reading?: string; explanation?: string };

  // One place that knows what "right" means for every exercise type.
  const judge = (): boolean | null => {
    if (!challenge || !answer) return null;
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

  const onContinue = () => {
    if (!answer) return;

    if (status === "wrong") {
      // Duolingo moves on after showing the answer; the item comes back later via practice.
      onNext(); setStatus("none"); setAnswer(null); return;
    }
    if (status === "correct") { onNext(); setStatus("none"); setAnswer(null); return; }

    const ok = judge();
    if (ok === null) return;
    void recordAttempt(challenge.id, ok).catch(() => {});
    if (challenge.audioSrc && challenge.type !== "TRACE") play(challenge.audioSrc);

    if (ok) {
      startTransition(() => {
        upsertChallengeProgress(challenge.id)
          .then((response) => {
            if (response?.error === "hearts") { openHeartsModal(); return; }
            void correctControls.play();
            setStatus("correct");
            setPercentage((prev) => prev + 100 / challenges.length);
            if (initialPercentage === 100) setHearts((prev) => Math.min(prev + 1, MAX_HEARTS));
          })
          .catch(() => toast.error("문제가 생겼어요. 다시 시도해 주세요."));
      });
    } else {
      startTransition(() => {
        reduceHearts(challenge.id)
          .then((response) => {
            if (response?.error === "hearts") { openHeartsModal(); return; }
            void incorrectControls.play();
            setStatus("wrong");
            if (!response?.error) setHearts((prev) => Math.max(prev - 1, 0));
          })
          .catch(() => toast.error("문제가 생겼어요. 다시 시도해 주세요."));
      });
    }
  };

  if (!challenge) {
    return (
      <>
        {finishAudio}
        <Confetti
          recycle={false}
          numberOfPieces={500}
          tweenDuration={10_000}
          width={width}
          height={height}
        />
        <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-y-4 text-center lg:gap-y-8">
          <Image
            src="/finish.svg"
            alt="Finish"
            className="hidden lg:block"
            height={100}
            width={100}
          />

          <Image
            src="/finish.svg"
            alt="Finish"
            className="block lg:hidden"
            height={100}
            width={100}
          />

          <h1 className="text-lg font-bold text-neutral-700 lg:text-3xl">
            잘했어요! <br /> 레슨을 완료했어요.
          </h1>

          <div className="flex w-full items-center gap-x-4">
            <ResultCard variant="points" value={challenges.length * 10} />
            <ResultCard
              variant="hearts"
              value={userSubscription?.isActive ? Infinity : hearts}
            />
          </div>
        </div>

        <Footer
          lessonId={lessonId}
          status="completed"
          onCheck={() => router.push("/learn")}
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
                answer={answer}
                onAnswer={(a) => { if (status === "none") setAnswer(a); }}
                status={status}
                disabled={pending}
                lang="ja-JP"
              />
            </div>
          </div>
        </div>
      </div>

      <Footer
        disabled={pending || !answer}
        status={status}
        onCheck={onContinue}
        wrongHint={wrongHint}
        explanation={status === "wrong" ? meta.explanation : undefined}
      />
    </>
  );
};
