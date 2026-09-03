"use client";

import { useEffect, useState } from "react";

import { Volume2 } from "lucide-react";

import { challengeOptions } from "@/db/schema";
import { cn } from "@/lib/utils";

import { play } from "../audio";

type Opt = typeof challengeOptions.$inferSelect;

/* Word bank → answer line. The parent checks the joined text against meta.target. */
export const Build = ({ options, audioSrc, reading, meaning, onChange, status, disabled }: { options: Opt[]; audioSrc: string | null; reading?: string; meaning?: string; onChange: (text: string) => void; status: "none" | "correct" | "wrong"; disabled?: boolean }) => {
  const [chosen, setChosen] = useState<Opt[]>([]);
  useEffect(() => { const t = setTimeout(() => play(audioSrc), 250); return () => clearTimeout(t); }, [audioSrc]);
  useEffect(() => { if (status === "none") setChosen([]); }, [status]);
  const set = (next: Opt[]) => { setChosen(next); onChange(next.map((o) => o.text).join("")); };
  const bank = options.filter((o) => !chosen.some((c) => c.id === o.id));
  const tile = (o: Opt, onTap: () => void, tone?: string) => (
    <button key={o.id} type="button" disabled={disabled} onClick={onTap}
      className={cn("kana flex h-16 min-w-[60px] items-center justify-center rounded-xl border-2 border-b-4 bg-white px-4 text-3xl text-neutral-700 active:translate-y-[2px] active:border-b-2", tone)}>
      {o.text}
    </button>
  );
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-center gap-4">
        <button type="button" onClick={() => play(audioSrc)} className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl border-2 border-b-4 border-sky-500 bg-sky-400 text-white active:translate-y-[2px] active:border-b-2" aria-label="듣기"><Volume2 className="h-8 w-8" /></button>
        <div className="text-center"><div className="font-mono text-2xl tracking-wider text-neutral-600">{reading}</div>{meaning && <div className="text-lg text-muted-foreground">{meaning}</div>}</div>
      </div>
      <div className={cn("flex min-h-[80px] flex-wrap items-center gap-2 border-b-2 pb-3", status === "correct" ? "border-green-400" : status === "wrong" ? "border-rose-400" : "border-slate-200")}>
        {chosen.map((o) => tile(o, () => set(chosen.filter((c) => c.id !== o.id)), "border-sky-300 bg-sky-100 text-sky-500"))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">{bank.map((o) => tile(o, () => set([...chosen, o])))}</div>
    </div>
  );
};
