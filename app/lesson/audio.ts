"use client";

// One shared player so clips never overlap; tiny cache so repeated taps are instant.
const cache = new Map<string, HTMLAudioElement>();
let current: HTMLAudioElement | null = null;
export const play = (src?: string | null) => {
  if (!src) return;
  try {
    current?.pause();
    const a = cache.get(src) ?? new Audio(src);
    cache.set(src, a);
    a.currentTime = 0;
    current = a;
    void a.play().catch(() => {});
  } catch {}
};
