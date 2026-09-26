"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/*
 A header number that shows a reward arriving instead of silently changing.

 Two cases. Coming back from a lesson (the lesson route has no header, so this mounts fresh): the
 last value this tab saw is kept per key in sessionStorage, and a "+N" shows under the number
 while it bumps. The number itself is already final — the server rendered it, and rolling it
 back to the old value after the page painted would flash. When the value changes while mounted
 (a quest claimed, a purchase), the number rolls from the old value to the new one, plus the "+N".
 Decreases and first sight just show the number.
*/
const ROLL_MS = 700;

const read = (key: string) => {
  try {
    const v = sessionStorage.getItem(key);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
};
const write = (key: string, value: number) => {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {}
};
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const CountUp = ({ value, storageKey, className }: { value: number; storageKey: string; className?: string }) => {
  const stored = useRef<number | null | undefined>(undefined); // what this tab last saw, read once per mount
  const last = useRef<number | null>(null); // what this component last showed; set only once a change is played
  const [rolling, setRolling] = useState<number | null>(null); // the number mid-roll; null = show value
  const [gain, setGain] = useState<{ n: number; id: number } | null>(null);

  useEffect(() => {
    if (stored.current === undefined) stored.current = read(storageKey);
    write(storageKey, value);
    const roll = last.current !== null; // changed while mounted → roll; from storage → the number is already final
    const before = last.current ?? stored.current;
    if (before === null || !Number.isFinite(before) || before >= value) {
      last.current = value;
      return;
    }
    // Everything that plays happens in a frame callback: dev StrictMode runs this effect twice and cancels
    // the first frame, so the change is only marked as played once it actually is.
    let raf = requestAnimationFrame((t0) => {
      last.current = value;
      setGain({ n: value - before, id: t0 });
      if (!roll || reduced()) return;
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / ROLL_MS);
        setRolling(p < 1 ? Math.round(before + (value - before) * (1 - Math.pow(1 - p, 3))) : null);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [value, storageKey]);

  return (
    <span className={cn("relative inline-flex tabular-nums", className)}>
      <span key={gain?.id} className={cn("inline-block", gain && "animate-[bump_.45s] motion-reduce:animate-none")}>
        {rolling ?? value}
      </span>
      {gain && (
        // under the number: the header sits at the top edge, so there is no room above it
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2">
          <span
            key={gain.id}
            onAnimationEnd={() => setGain(null)}
            className="block animate-[gain_1.4s_ease-out_forwards] whitespace-nowrap text-[11px] font-black leading-none motion-reduce:animate-[fade_1.4s_ease-out]"
          >
            +{gain.n}
          </span>
        </span>
      )}
    </span>
  );
};
