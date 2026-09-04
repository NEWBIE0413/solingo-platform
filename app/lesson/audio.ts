"use client";

// One shared player so clips never overlap; a small cache so repeated taps are instant.
const cache = new Map<string, HTMLAudioElement>();
const warmed = new Set<string>();
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
 Warm upcoming clips by pulling the bytes into the HTTP cache. Serving one mp3 through the
 tunnel costs ~0.6-0.9s, heard as silence after a listening prompt or a tapped tile.

 fetch(), not <audio preload>: an audio element decides for itself how much to buffer, and
 measured on production it still sat at HAVE_METADATA when playback started. A plain fetch
 downloads the whole file, and /audio is served immutable, so the element then reads it
 straight from cache.
*/
export const prefetch = (srcs: (string | null | undefined)[]) => {
  for (const src of srcs) {
    if (!src || warmed.has(src)) continue;
    warmed.add(src);
    void fetch(src, { credentials: "omit" }).catch(() => warmed.delete(src));
  }
};
