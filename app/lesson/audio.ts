"use client";

// One shared player so clips never overlap; a small cache so repeated taps are instant.
const cache = new Map<string, HTMLAudioElement>();
let current: HTMLAudioElement | null = null;

const get = (src: string) => {
  let a = cache.get(src);
  if (!a) {
    a = new Audio(src);
    a.preload = "auto";
    cache.set(src, a);
  }
  return a;
};

export const play = (src?: string | null) => {
  if (!src) return;
  try {
    current?.pause();
    const a = get(src);
    a.currentTime = 0;
    current = a;
    void a.play().catch(() => {});
  } catch {}
};

/*
 Warm upcoming clips. Serving one mp3 through the tunnel costs ~0.8s cold, which a learner
 hears as silence after a listening prompt appears. Fetching the next few items' audio while
 they answer the current one hides that entirely.
*/
export const prefetch = (srcs: (string | null | undefined)[]) => {
  for (const src of srcs) {
    if (!src || cache.has(src)) continue;
    try {
      get(src).load();
    } catch {}
  }
};
