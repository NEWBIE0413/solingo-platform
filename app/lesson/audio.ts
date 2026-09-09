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
 - iOS owns one audio session per page and moves it around behind our back. The mic (SPEAK)
   switches it to the phone-call route — earpiece, call volume — and leaving the tab in the
   background deactivates it entirely, after which cached elements resolve play() while
   staying silent. Both are handled below: restorePlayback() pushes the session back to
   media, and returning to the tab throws the element cache away so the next play is fresh.
*/
const SILENT = "/silent.wav"; // half a second of silence: long enough for iOS to actually start a playback session
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

/* Put the audio session back on the media route (speaker, media volume). Playing a
   playback-only element is the only lever a page has; iOS picks the category from what is
   currently sounding, so a silent clip right after the mic closes is enough. */
export const restorePlayback = () => {
  try {
    const a = new Audio(SILENT);
    a.volume = 0.01; // audible to the session, inaudible to the learner
    void a.play().catch(() => {});
  } catch {}
};

/* Drop cached elements (blobs stay valid) and re-arm the unlock. Called when the tab comes
   back: iOS may have torn the session down, and a stale element then plays nothing. */
const reset = () => {
  for (const a of elements.values()) { try { a.pause(); } catch {} }
  elements.clear();
  current = null;
  unlocked = false;
  refused = null;
  // sounds rendered by the runner itself (correct/incorrect/finish) need their decoders back too
  try { document.querySelectorAll("audio").forEach((a) => a.load()); } catch {}
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
  const onVisible = () => { if (document.visibilityState === "visible") reset(); };
  const onShow = (e: PageTransitionEvent) => { if (e.persisted) reset(); };
  document.addEventListener("pointerdown", onGesture, { capture: true, passive: true });
  document.addEventListener("keydown", onGesture, { capture: true, passive: true });
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("pageshow", onShow);
  return () => {
    document.removeEventListener("pointerdown", onGesture, { capture: true } as EventListenerOptions);
    document.removeEventListener("keydown", onGesture, { capture: true } as EventListenerOptions);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("pageshow", onShow);
  };
};
