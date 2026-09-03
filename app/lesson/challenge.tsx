"use client";

import { challengeOptions, challenges } from "@/db/schema";
import { cn } from "@/lib/utils";

import { Card } from "./card";
import { Build } from "./exercises/build";
import { ListenPrompt } from "./exercises/listen";
import { Match } from "./exercises/match";
import { Speak } from "./exercises/speak";
import { Trace } from "./exercises/trace";

export type Answer =
  | { kind: "option"; id: number }
  | { kind: "build"; text: string }
  | { kind: "match"; wrong: number }
  | { kind: "trace" }
  | { kind: "speak"; ok: boolean; heard?: string; skipped?: boolean };

type Meta = { target?: string; reading?: string; meaning?: string };
type ChallengeProps = {
  challenge: typeof challenges.$inferSelect & { challengeOptions: (typeof challengeOptions.$inferSelect)[] };
  answer: Answer | null;
  onAnswer: (a: Answer | null) => void;
  status: "correct" | "wrong" | "none";
  disabled?: boolean;
  lang: string;
};

/* Renders one exercise by type. Option-based types share the Card grid; the rest are Solingo's own components. */
export const Challenge = ({ challenge, answer, onAnswer, status, disabled, lang }: ChallengeProps) => {
  const { type, challengeOptions: options } = challenge;
  const meta = (challenge.meta ?? {}) as Meta;
  const selected = answer?.kind === "option" ? answer.id : undefined;

  if (type === "MATCH") return <Match key={challenge.id} options={options} disabled={disabled} onDone={(wrong) => onAnswer({ kind: "match", wrong })} />;
  if (type === "BUILD") return <Build key={challenge.id} options={options} audioSrc={challenge.audioSrc} reading={meta.reading} meaning={meta.meaning} status={status} disabled={disabled} onChange={(text) => onAnswer(text ? { kind: "build", text } : null)} />;
  if (type === "TRACE") return <Trace key={challenge.id} target={meta.target ?? ""} reading={meta.reading} audioSrc={challenge.audioSrc} onStroke={() => onAnswer({ kind: "trace" })} />;
  if (type === "SPEAK") return <Speak key={challenge.id} target={meta.target ?? ""} reading={meta.reading} meaning={meta.meaning} audioSrc={challenge.audioSrc} lang={lang} onResult={(r) => onAnswer("skip" in r ? { kind: "speak", ok: true, skipped: true } : { kind: "speak", ok: r.ok, heard: r.heard })} />;

  const list = type === "ASSIST";
  return (
    <div className="flex flex-col gap-6">
      {type === "LISTEN" && <ListenPrompt audioSrc={challenge.audioSrc} />}
      <div className={cn("grid gap-3", list ? "grid-cols-1" : "grid-cols-2")}>
        {options.map((option, i) => (
          <Card key={option.id} id={option.id} text={option.text} imageSrc={option.imageSrc} audioSrc={type === "LISTEN" ? null : option.audioSrc} shortcut={`${i + 1}`}
            selected={selected === option.id} onClick={() => onAnswer({ kind: "option", id: option.id })} status={status} disabled={disabled} layout={list ? "list" : "grid"} />
        ))}
      </div>
    </div>
  );
};
