"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Check, Flame, Snowflake } from "lucide-react";
import Image from "next/image";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { toast } from "sonner";

import { claimQuestAction } from "@/actions/economy";
import { chime } from "@/components/celebrate";
import { Button } from "@/components/ui/button";
import { type QuestView, questEmoji } from "@/lib/economy-defs";
import type { Bonus } from "@/lib/xp";
import { cn } from "@/lib/utils";

import { Footer } from "./footer";

/*
 The end of a lesson as a short run of screens the learner steps through with 계속, like
 Duolingo's: what you did → the streak → quests that moved → new badges. Each reward gets the
 whole screen and its own moment instead of timed overlays stacking on one results page.
 Steps that don't apply are skipped; the summary shows at once, the rest wait for the server.
*/
export type LessonDone = {
  streak: number;
  firstToday: boolean;
  week: { day: string; isToday: boolean; frozen: boolean; attended: boolean }[];
  quests: QuestView[];
  achievements: { key: string; name: string; desc: string; emoji: string }[];
  goal: { done: number; goal: number };
  bonus: Bonus;
};

export type LessonStats = {
  practice: boolean;
  xp: number; // answer XP this run earned (lib/xp.ts); the session bonus arrives with LessonDone
  accuracy: number; // first-try, percent
  timeLabel: string;
  bestCombo: number;
  missed: number; // items wrong on the first try
  recovered: number; // of those, answered right later in the lesson
};

type Step = "summary" | "streak" | "quests" | "badges";

const WEEK_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

const prefersReduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Counts up to `target` (ease-out cubic), from 0 after `delay` ms at first and from where it is when the
 target later grows (the session bonus lands while the answer XP is counting). Reduced motion shows the target. */
const useCounter = (target: number, delay: number, duration = 700) => {
  const [n, setN] = useState(() => (prefersReduced() ? target : 0));
  const shown = useRef(prefersReduced() ? target : 0);
  useEffect(() => {
    const from = shown.current;
    const start = performance.now() + (from === 0 ? delay : 0);
    let raf = 0;
    const tick = (now: number) => {
      const p = prefersReduced() ? 1 : Math.max(0, Math.min(1, (now - start) / duration));
      shown.current = Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3)));
      setN(shown.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, delay, duration]);
  return n;
};

/** Quests worth showing after this lesson: the ones that moved since it began, or that wait to be claimed. */
const movedQuests = (quests: QuestView[], before: Record<string, number>) =>
  quests.filter((q) => (!q.claimed && q.done) || (!q.claimed && q.have > (before[q.key] ?? 0) && (before[q.key] ?? 0) < q.goal));

export const RewardSteps = ({
  lessonId,
  stats,
  done,
  failed,
  questsBefore,
  onFinish,
}: {
  lessonId: number;
  stats: LessonStats;
  done: LessonDone | null;
  failed: boolean;
  questsBefore: Record<string, number>;
  onFinish: () => void;
}) => {
  const [index, setIndex] = useState(0);
  // The server's answer usually lands while the summary counts up; if it never comes, let the learner leave.
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGaveUp(true), 6000);
    return () => clearTimeout(t);
  }, []);

  const quests = useMemo(() => (done ? movedQuests(done.quests, questsBefore) : []), [done, questsBefore]);
  const steps = useMemo(() => {
    const s: Step[] = ["summary"];
    if (!done) return s;
    if (done.firstToday && done.streak > 0) s.push("streak");
    if (quests.length || done.goal.goal > 1) s.push("quests");
    if (done.achievements.length) s.push("badges");
    return s;
  }, [done, quests]);
  const step = steps[index];

  useEffect(() => {
    if (index > 0) chime(step === "quests" ? "combo" : "lesson");
  }, [index, step]);

  const ready = done !== null || failed || gaveUp;
  const next = () => {
    if (!ready) return;
    if (index < steps.length - 1) setIndex(index + 1);
    else onFinish();
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-clip">
        <div
          key={step}
          className="mx-auto flex min-h-full w-full max-w-lg animate-[challenge-in_220ms_cubic-bezier(0.23,1,0.32,1)] flex-col items-center justify-center gap-y-4 px-5 py-6 text-center motion-reduce:animate-[fade_150ms_ease-out]"
        >
          {step === "summary" && <Summary stats={stats} bonus={done?.bonus} />}
          {step === "streak" && done && <StreakStep streak={done.streak} week={done.week} />}
          {step === "quests" && done && <QuestStep quests={quests} before={questsBefore} goal={done.goal} />}
          {step === "badges" && done && <BadgeStep achievements={done.achievements} />}
        </div>
      </div>
      <Footer
        lessonId={step === "summary" && !stats.practice ? lessonId : undefined}
        status="completed"
        disabled={!ready}
        onCheck={next}
      />
    </>
  );
};

const EndStat = ({ label, value, tone, delay }: { label: string; value: string; tone: "orange" | "sky" | "green"; delay: number }) => {
  const c =
    tone === "orange"
      ? { border: "border-orange-300", header: "bg-orange-500 text-white", text: "text-orange-600" }
      : tone === "green"
        ? { border: "border-green-300", header: "bg-green-500 text-white", text: "text-green-600" }
        : { border: "border-sky-300", header: "bg-sky-500 text-white", text: "text-sky-600" };
  return (
    <div
      className={cn("overflow-hidden rounded-2xl border-2 bg-white shadow-sm animate-[pop_.4s_cubic-bezier(0.23,1,0.32,1)_backwards] motion-reduce:animate-none", c.border)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`px-1 py-1 text-[11px] font-bold uppercase tracking-wide ${c.header}`}>{label}</div>
      <div className={`bg-white px-1 py-3 text-base font-black tabular-nums ${c.text}`}>{value}</div>
    </div>
  );
};

const Summary = ({ stats, bonus }: { stats: LessonStats; bonus?: Bonus }) => {
  const { width, height } = useWindowSize();
  const xp = useCounter(stats.xp + (bonus?.total ?? 0), 350);
  const bonusParts = bonus
    ? [bonus.perfect && `완벽 +${bonus.perfect}`, bonus.combo && `콤보 +${bonus.combo}`, bonus.goal && `오늘 목표 +${bonus.goal}`].filter(Boolean)
    : [];
  const accuracy = useCounter(stats.accuracy, 430);
  const headline = stats.accuracy === 100 ? "완벽해요!" : stats.accuracy >= 80 ? "잘했어요!" : "끝까지 왔어요!";
  return (
    <>
      <Confetti recycle={false} numberOfPieces={500} tweenDuration={10_000} width={width} height={height} />
      <div className="animate-[bounceIn_.6s_cubic-bezier(.16,1,.3,1)] motion-reduce:animate-none">
        <Image src="/finish.svg" alt="" height={104} width={104} className="drop-shadow-lg" />
      </div>
      <div className="animate-[pop_.4s_.15s_cubic-bezier(.16,1,.3,1)_backwards] motion-reduce:animate-none">
        <h1 className="text-2xl font-black tracking-tight text-neutral-800 lg:text-3xl">{headline}</h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          {stats.practice ? "약점 복습을 끝냈어요" : "레슨을 완료했어요"}
          {stats.missed > 0 && ` · 처음에 틀린 ${stats.missed}개 중 ${stats.recovered}개를 다시 맞혔어요`}
        </p>
      </div>
      <div className="grid w-full grid-cols-3 gap-2.5">
        <EndStat label="획득 XP" value={`⚡️ ${xp}`} tone="orange" delay={250} />
        <EndStat label="정확도" value={`${accuracy}%`} tone={stats.accuracy >= 80 ? "green" : "sky"} delay={330} />
        <EndStat label="시간" value={stats.timeLabel} tone="sky" delay={410} />
      </div>
      {/* one line kept for the bonus even before it arrives, so nothing below it moves when it does */}
      <p className="h-5 text-sm font-black text-amber-600">
        {bonusParts.length > 0 && (
          <span className="inline-block animate-[pop_.4s_cubic-bezier(0.23,1,0.32,1)] motion-reduce:animate-none">
            ⚡️ 보너스 {bonusParts.join(" · ")}
          </span>
        )}
      </p>
      {stats.bestCombo >= 3 && (
        <p className="animate-[pop_.4s_.6s_cubic-bezier(.16,1,.3,1)_backwards] text-sm font-bold text-orange-600 motion-reduce:animate-none">
          🔥 최고 {stats.bestCombo}연속 정답
        </p>
      )}
    </>
  );
};

const StreakStep = ({ streak, week }: { streak: number; week: LessonDone["week"] }) => (
  <>
    <Flame
      className="h-24 w-24 animate-[ignite_.7s_.1s_backwards] fill-orange-400 text-orange-500 motion-reduce:animate-none"
      strokeWidth={1.5}
    />
    <div>
      <div className="flex items-baseline justify-center gap-1.5">
        {/* the count flips from yesterday's number to today's */}
        <span className="relative inline-block overflow-hidden text-6xl font-black leading-[1.1] tabular-nums text-orange-500">
          <span className="block animate-[flip-in_.4s_.55s_cubic-bezier(0.23,1,0.32,1)_backwards] motion-reduce:animate-none">{streak}</span>
          <span
            aria-hidden
            className="absolute inset-0 block animate-[flip-out_.4s_.55s_cubic-bezier(0.23,1,0.32,1)_forwards] motion-reduce:hidden"
          >
            {streak - 1}
          </span>
        </span>
        <span className="text-2xl font-black text-orange-500">일</span>
      </div>
      <h1 className="mt-1 text-2xl font-black tracking-tight text-neutral-800">연속 출석!</h1>
      <p className="mt-1 text-sm font-medium text-muted-foreground">오늘 몫을 채웠어요. 내일도 하나만 하면 이어져요.</p>
    </div>
    <div className="mt-2 grid w-full grid-cols-7 gap-1 rounded-2xl border-2 border-slate-200 bg-white p-3.5 shadow-[0_2px_0_0_rgba(0,0,0,0.03)]">
      {week.map((d, i) => (
        <div key={d.day} className="flex flex-col items-center gap-1.5">
          <span className={cn("text-xs font-bold", d.isToday ? "font-black text-green-600" : "text-neutral-400")}>
            {WEEK_LABELS[i]}
          </span>
          <span className="relative flex h-9 w-9 items-center justify-center">
            {d.isToday && d.attended ? (
              <>
                <span className="absolute inset-0 rounded-full border-2 border-dashed border-green-500 bg-green-50/40" />
                <span className="absolute inset-0 flex animate-[stamp_.45s_1s_backwards] items-center justify-center rounded-full border-2 border-green-500 bg-green-500 text-white shadow-sm motion-reduce:animate-none">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              </>
            ) : (
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border-2",
                  d.attended && "border-green-500 bg-green-500 text-white shadow-sm",
                  d.frozen && "border-sky-300 bg-sky-100 text-sky-500 shadow-sm",
                  !d.attended && !d.frozen && "border-slate-200 bg-slate-50"
                )}
              >
                {d.attended ? <Check className="h-4 w-4" strokeWidth={3} /> : d.frozen ? <Snowflake className="h-4 w-4" /> : null}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  </>
);

const Bar = ({ from, to, delay, tone = "bg-emerald-500" }: { from: number; to: number; delay: number; tone?: string }) => {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return (
    <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={cn("h-full origin-left animate-[fill-bar_.8s_cubic-bezier(0.23,1,0.32,1)_both] rounded-full motion-reduce:animate-none", tone)}
        style={
          {
            "--from": clamp(from),
            "--to": clamp(to),
            transform: `scaleX(${clamp(to)})`,
            animationDelay: `${delay}ms`,
          } as React.CSSProperties
        }
      />
    </div>
  );
};

const QuestStep = ({
  quests,
  before,
  goal,
}: {
  quests: QuestView[];
  before: Record<string, number>;
  goal: LessonDone["goal"];
}) => {
  const [pending, startTransition] = useTransition();
  const [paid, setPaid] = useState<Record<string, number>>({}); // quest key → gems received here

  const claim = (key: string) =>
    startTransition(async () => {
      const r = await claimQuestAction(key).catch(() => null);
      if (r?.ok) {
        setPaid((p) => ({ ...p, [key]: ("reward" in r && typeof r.reward === "number" ? r.reward : 0) }));
        chime("purchase");
      } else {
        toast.error(r?.error === "already-claimed" ? "이미 받았어요." : "문제가 생겼어요.");
      }
    });

  return (
    <>
      <div className="text-5xl">📜</div>
      <h1 className="text-2xl font-black tracking-tight text-neutral-800">일일 퀘스트</h1>
      <ul className="w-full space-y-2.5 text-left">
        {goal.goal > 1 && (
          <li className="rounded-2xl border-2 border-slate-200 bg-white p-3.5 shadow-[0_2px_0_0_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-neutral-800">🎯 오늘 목표</p>
              <span className="text-xs font-black tabular-nums text-neutral-500">
                {Math.min(goal.done, goal.goal)}/{goal.goal}
              </span>
            </div>
            <Bar from={(goal.done - 1) / goal.goal} to={goal.done / goal.goal} delay={250} tone="bg-sky-500" />
            <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
              {goal.done >= goal.goal ? "오늘 목표를 채웠어요!" : `목표까지 ${goal.goal - goal.done}번 남았어요`}
            </p>
          </li>
        )}
        {quests.map((q, i) => {
          const got = paid[q.key];
          return (
            <li
              key={q.key}
              className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-3.5 shadow-[0_2px_0_0_rgba(0,0,0,0.03)]"
            >
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                {questEmoji(q)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-neutral-800">{q.name}</p>
                  <span className="flex-none text-xs font-black tabular-nums text-neutral-500">
                    {Math.min(q.have, q.goal)}/{q.goal}
                  </span>
                </div>
                <Bar from={(before[q.key] ?? 0) / q.goal} to={q.have / q.goal} delay={350 + i * 120} />
              </div>
              {got !== undefined ? (
                <span className="flex-none animate-[stamp_.45s] rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-600 motion-reduce:animate-none">
                  +{got} 💎
                </span>
              ) : q.done ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => claim(q.key)}
                  className="h-10 min-w-[64px] flex-none text-xs font-black"
                >
                  받기 {q.gems}💎
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
};

const BadgeStep = ({ achievements }: { achievements: LessonDone["achievements"] }) => (
  <>
    <div className="animate-[bounceIn_.6s_cubic-bezier(.16,1,.3,1)] motion-reduce:animate-none">
      <Image src="/mascot.svg" alt="" width={96} height={96} className="rounded-3xl drop-shadow-lg" />
    </div>
    <h1 className="text-2xl font-black tracking-tight text-neutral-800">
      {achievements.length > 1 ? `새 업적 ${achievements.length}개!` : "새 업적!"}
    </h1>
    <div className="w-full space-y-2.5 text-left">
      {achievements.map((a, i) => (
        <div
          key={a.key}
          className="flex animate-[card-flip_.5s_cubic-bezier(0.23,1,0.32,1)_backwards] items-center gap-3.5 rounded-2xl border-2 border-amber-200 bg-amber-50 p-3.5 shadow-sm motion-reduce:animate-none"
          style={{ animationDelay: `${250 + i * 120}ms` }}
        >
          <span className="text-4xl leading-none">{a.emoji}</span>
          <div className="min-w-0">
            <p className="text-base font-black text-amber-900">{a.name}</p>
            <p className="text-xs font-semibold text-amber-800/80">{a.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </>
);
