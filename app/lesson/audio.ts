"use client";

/*
 Lesson audio. Two things the desktop measurements missed but a phone feels:

 - iOS loads media through its own loader, with range requests that bypass the page's fetch
   cache and ignore <audio preload>. So "warming the HTTP cache" did nothing on an iPhone:
   every clip was still fetched through the tunnel at play time. Clips are therefore
   prefetched as Blobs and played from object URLs — in-memory, no loader involved.
 - iOS refuses programmatic play until a user gesture has played media on this page. A
   lesson is a fresh document, so its first listening item stays silent until tapped. The
   first pointerdown anywhere unlocks audio and replays whatever was refused.
*/
const elements = new Map<string, HTMLAudioElement>(); // src → element
const blobs = new Map<string, string>();               // src → object URL
const warming = new Set<string>();
let current: HTMLAudioElement | null = null;
let unlocked = false;
let refused: string | null = null;

const element = (src: string) => {
  let a = elements.get(src);
  if (!a) {
    a = new Audio(blobs.get(src) ?? src);
    a.preload = "auto";
    elements.set(src, a);
  }
  return a;
};

export const play = (src?: string | null) => {
  if (!src) return;
  try {
    current?.pause();
    const a = element(src);
    a.currentTime = 0;
    current = a;
    void a.play().then(
      () => { unlocked = true; if (refused === src) refused = null; },
      (e: unknown) => { if ((e as { name?: string })?.name === "NotAllowedError") refused = src; }
    );
  } catch {}
};

export const prefetch = (srcs: (string | null | undefined)[]) => {
  for (const src of srcs) {
    if (!src || blobs.has(src) || warming.has(src)) continue;
    warming.add(src);
    void fetch(src, { credentials: "omit" })
      .then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
      .then((b) => {
        blobs.set(src, URL.createObjectURL(b));
        // an element created before the bytes arrived keeps streaming from the network;
        // swap its source so the next play is local too
        const a = elements.get(src);
        if (a && a.paused) a.src = blobs.get(src)!;
      })
      .catch(() => {})
      .finally(() => warming.delete(src));
  }
};

/* Call once per lesson page. The first gesture plays media inside the gesture, which is what unlocks iOS. */
export const installUnlock = () => {
  if (typeof document === "undefined") return () => {};
  const onGesture = () => {
    if (unlocked) return;
    if (refused) { play(refused); return; }
    // nothing pending: unlock with a silent element so later auto-plays are allowed
    try {
      const a = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=");
      void a.play().then(() => { unlocked = true; }, () => {});
    } catch {}
  };
  document.addEventListener("pointerdown", onGesture, { capture: true, passive: true });
  document.addEventListener("keydown", onGesture, { capture: true, passive: true });
  return () => {
    document.removeEventListener("pointerdown", onGesture, { capture: true } as EventListenerOptions);
    document.removeEventListener("keydown", onGesture, { capture: true } as EventListenerOptions);
  };
};
