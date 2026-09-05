"use client";

import { useEffect } from "react";

import Image from "next/image";

import { useCelebrate } from "@/store/use-celebrate";

/*
 The mascot shows up for the good moments — a claimed quest, a purchase, a combo, the streak.
 Duolingo's owl is half the reason those moments feel like rewards rather than database
 writes. Kept cheap: CSS sparkles, one WebAudio chime, auto-dismiss, tap to dismiss.
*/
let ac: AudioContext | null = null;
const chime = (kind: string) => {
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

export const Celebrate = () => {
  const { event, clear } = useCelebrate();

  useEffect(() => {
    if (!event) return;
    chime(event.kind);
    const t = setTimeout(clear, event.light ? 1300 : 2200);
    return () => clearTimeout(t);
  }, [event, clear]);

  if (!event) return null;
  const tone = event.kind === "purchase" ? "sky" : event.kind === "combo" ? "orange" : event.kind === "streak" ? "orange" : "green";
  const ring = tone === "sky" ? "bg-sky-400" : tone === "orange" ? "bg-orange-400" : "bg-green-500";
  const text = tone === "sky" ? "text-sky-600" : tone === "orange" ? "text-orange-600" : "text-green-600";

  if (event.light) {
    // mid-lesson: a peek from the top, no backdrop, never blocks the footer
    return (
      <div key={event.id} className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex justify-center">
        <div className="flex animate-[peek_1.3s_cubic-bezier(.2,.8,.2,1)] items-center gap-3 rounded-full border-2 border-orange-300 bg-white px-4 py-2 shadow-lg">
          <Image src={event.image ?? "/mascot.svg"} alt="" width={36} height={36} className="rounded-lg" />
          <span className={`text-lg font-extrabold ${text}`}>{event.title}</span>
        </div>
      </div>
    );
  }

  return (
    <div key={event.id} onClick={clear} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/25 backdrop-blur-[2px] animate-[fade_.2s_ease-out]">
      <div className="relative flex w-[300px] flex-col items-center">
        {/* sparkles burst from behind the mascot */}
        {SPARKS.map((s, i) => (
          <span key={i} className={`absolute left-1/2 top-[110px] block rounded-full ${ring}`} style={{ width: s.s, height: s.s, marginLeft: -s.s / 2, animation: `spark .9s ${s.delay}ms ease-out forwards`, transform: `rotate(${s.a}deg) translateY(-${s.d}px)`, ["--a" as string]: `${s.a}deg`, ["--d" as string]: `${s.d}px` }} />
        ))}
        <div className="animate-[bounceIn_.55s_cubic-bezier(.2,.8,.2,1)]">
          <Image src={event.image ?? "/mascot.svg"} alt="" width={140} height={140} className="rounded-3xl drop-shadow-2xl" priority />
        </div>
        <div className="mt-4 animate-[pop_.4s_.15s_ease-out_backwards] rounded-2xl border-2 border-white/60 bg-white px-6 py-4 text-center shadow-xl">
          <div className={`text-2xl font-extrabold ${text}`}>{event.title}</div>
          {event.subtitle && <div className="mt-0.5 text-sm font-semibold text-neutral-500">{event.subtitle}</div>}
          {event.gems ? <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-base font-extrabold text-sky-600 animate-[pop_.4s_.35s_ease-out_backwards]"><Image src="/gem.svg" alt="" width={18} height={18} /> +{event.gems}</div> : null}
        </div>
      </div>
    </div>
  );
};
