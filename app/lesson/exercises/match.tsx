"use client";

import { useMemo, useState } from "react";

import { challengeOptions } from "@/db/schema";
import { cn } from "@/lib/utils";

import { play } from "../audio";

type Opt = typeof challengeOptions.$inferSelect;
type Meta = { pair: string; side: "left" | "right" };

/* Two columns; tap one from each side. Right pairs lock green, wrong pairs flash rose. Done when every pair is matched. */
export const Match = ({ options, onDone, disabled }: { options: Opt[]; onDone: (wrong: number) => void; disabled?: boolean }) => {
  const left = useMemo(() => options.filter((o) => (o.meta as Meta)?.side === "left"), [options]);
  const right = useMemo(() => options.filter((o) => (o.meta as Meta)?.side === "right"), [options]);
  const [sel, setSel] = useState<Opt | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState(0);

  const tap = (o: Opt) => {
    if (disabled) return;
    const m = o.meta as Meta;
    if (done.has(m.pair)) return;
    play(o.audioSrc);
    if (!sel) return setSel(o);
    const sm = sel.meta as Meta;
    if (sm.side === m.side) return setSel(o);
    if (sm.pair === m.pair) {
      const next = new Set(done).add(m.pair);
      setDone(next); setSel(null);
      if (next.size === left.length) onDone(wrong);
    } else {
      setWrong((w) => w + 1);
      const f = new Set([o.id, sel.id]); setFlash(f); setSel(null);
      setTimeout(() => setFlash(new Set()), 450);
    }
  };

  const cell = (o: Opt) => {
    const m = o.meta as Meta; const isDone = done.has(m.pair); const isSel = sel?.id === o.id; const isFlash = flash.has(o.id);
    const script = /[぀-ヿ가-힣]/.test(o.text);
    return (
      <button key={o.id} type="button" onClick={() => tap(o)}
        className={cn("flex min-h-[72px] w-full items-center justify-center rounded-xl border-2 border-b-4 bg-white px-2 text-neutral-700 active:translate-y-[2px] active:border-b-2",
          script ? "kana text-4xl" : "text-xl font-bold",
          isSel && "border-sky-300 bg-sky-100 text-sky-500",
          isDone && "pointer-events-none border-green-300 bg-green-100 text-green-500 opacity-60",
          isFlash && "border-rose-300 bg-rose-100 text-rose-500 animate-[shake_.4s]")}>
        {o.text}
      </button>
    );
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-3">{left.map(cell)}</div>
      <div className="flex flex-col gap-3">{right.map(cell)}</div>
    </div>
  );
};
