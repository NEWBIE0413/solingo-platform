"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import { cn } from "@/lib/utils";
import { useCelebrate } from "@/store/use-celebrate";

/*
 The mascot shows up for the good moments — a claimed quest, a purchase, a combo, the streak.
 Duolingo's owl is half the reason those moments feel like rewards rather than database
 writes. Kept cheap: CSS sparkles, one WebAudio chime, auto-dismiss, tap to dismiss.
*/
let ac: AudioContext | null = null;
export const chime = (kind: string) => {
  try {
    ac = ac ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const t0 = ac.currentTime;
    const notes: [number, number][] = kind === "combo" ? [[784, 0], [1046, 0.08]] : kind === "purchase" ? [[659, 0], [880, 0.09], [1174, 0.18]] : [[523, 0], [659, 0.1], [784, 0.2], [1046, 0.32]];
    for (const [f, dt] of notes) {
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0, t0 + dt); g.gain.linearRampToValueAtTime(0.16, t0 + dt + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t0 + dt + 0.35);
      o.connect(g).connect(ac.destination); o.start(t0 + dt); o.stop(t0 + dt + 0.4);
    }
  } catch {}
  try { navigator.vibrate?.(kind === "combo" ? 12 : [12, 40, 24]); } catch {}
};

const SPARKS = Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * 360, d: 70 + (i % 3) * 22, s: 6 + (i % 4) * 3, delay: (i % 5) * 40 }));

const EXIT_MS = 160;

export const Celebrate = () => {
  const { event, clear } = useCelebrate();

  // id of the event on its way out; a newer event has a new id, so it is never caught mid-exit
  const [leaving, setLeaving] = useState<number | null>(null);

  useEffect(() => {
    if (!event) return;
    chime(event.kind);
    const { id, light } = event;
    // the light peek fades itself out inside its keyframes; the full overlay plays an exit first
    const t = setTimeout(() => (light ? clear(id) : setLeaving(id)), light ? 1300 : 2200);
    return () => clearTimeout(t);
  }, [event, clear]);

  useEffect(() => {
    if (leaving === null) return;
    const t = setTimeout(() => clear(leaving), EXIT_MS);
    return () => clearTimeout(t);
  }, [leaving, clear]);

  if (!event) return null;
  const isLeaving = leaving === event.id;
  const tone = event.kind === "purchase" ? "sky" : event.kind === "combo" ? "orange" : event.kind === "streak" ? "orange" : "green";
  const ring = tone === "sky" ? "bg-sky-400" : tone === "orange" ? "bg-orange-400" : "bg-green-500";
  const text = tone === "sky" ? "text-sky-600" : tone === "orange" ? "text-orange-600" : "text-green-600";

  if (event.light) {
    // mid-lesson: a peek from the top, no backdrop, never blocks the footer
    return (
      <div key={event.id} className="pointer-events-none fixed inset-x-0 top-[calc(12px+env(safe-area-inset-top))] z-[70] flex justify-center px-4">
        <div className="flex animate-[peek_1.3s_cubic-bezier(.16,1,.3,1)] motion-reduce:animate-none items-center gap-3 rounded-full border-2 border-border/80 bg-white/95 px-4 py-2 shadow-xl backdrop-blur-md">
          <Image src={event.image ?? "/mascot.svg"} alt="" width={36} height={36} className="rounded-xl drop-shadow-sm" />
          <span className={`text-base font-black tracking-tight ${text}`}>{event.title}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      key={event.id}
      onClick={() => setLeaving(event.id)}
      className={cn(
        "fixed inset-0 z-[70] flex items-center justify-center bg-black/30 px-4 backdrop-blur-[3px]",
        isLeaving
          ? "pointer-events-none animate-[fade-out_160ms_cubic-bezier(0.23,1,0.32,1)_forwards]"
          : "animate-[fade_.2s_ease-out] motion-reduce:animate-none"
      )}
    >
      <div
        className={cn(
          "relative flex w-[280px] flex-col items-center",
          isLeaving && "animate-[shrink-out_160ms_cubic-bezier(0.23,1,0.32,1)_forwards] motion-reduce:animate-none"
        )}
      >
        {/* sparkles burst from behind the mascot */}
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className={`absolute left-1/2 top-[100px] block rounded-full ${ring} motion-reduce:hidden`}
            style={{
              width: s.s,
              height: s.s,
              marginLeft: -s.s / 2,
              animation: `spark .9s ${s.delay}ms ease-out forwards`,
              transform: `rotate(${s.a}deg) translateY(-${s.d}px)`,
              ["--a" as string]: `${s.a}deg`,
              ["--d" as string]: `${s.d}px`,
            }}
          />
        ))}
        <div className="animate-[bounceIn_.6s_cubic-bezier(.16,1,.3,1)] motion-reduce:animate-none">
          <Image
            src={event.image ?? "/mascot.svg"}
            alt=""
            width={132}
            height={132}
            className="rounded-3xl drop-shadow-2xl"
            priority
          />
        </div>
        <div className="mt-3.5 w-full animate-[pop_.45s_.18s_cubic-bezier(.16,1,.3,1)_backwards] motion-reduce:animate-none rounded-2xl border-2 border-border bg-white px-5 py-4 text-center shadow-2xl">
          <div className={`text-xl font-black tracking-tight ${text}`}>{event.title}</div>
          {event.subtitle && <div className="mt-0.5 text-xs font-semibold text-neutral-500">{event.subtitle}</div>}
          {event.gems ? (
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-black text-sky-600 shadow-sm animate-[pop_.4s_.3s_cubic-bezier(.16,1,.3,1)_backwards] motion-reduce:animate-none">
              <Image src="/gem.svg" alt="" width={16} height={16} /> +{event.gems}
            </div>
          ) : null}
        </div>
        <p className="mt-3 text-[11px] font-bold text-white/80 drop-shadow-sm tracking-wide">화면을 탭하여 계속</p>
      </div>
    </div>
  );
};
