import { create } from "zustand";

/*
 One tiny bus for "something good just happened". Anything can fire an event; the
 <Celebrate /> overlay in the root layout plays it: mascot, bubble, sparkles, chime.
*/
export type CelebrateEvent = {
  kind: "quest" | "purchase" | "combo" | "streak" | "lesson";
  title: string;
  subtitle?: string;
  gems?: number;      // shows "+N 💎"
  image?: string;     // mascot skin; defaults to /mascot.svg
  light?: boolean;    // no backdrop, short: mid-lesson combos
};

type CelebrateState = {
  event: (CelebrateEvent & { id: number }) | null;
  fire: (e: CelebrateEvent) => void;
  clear: () => void;
};

let seq = 0;
export const useCelebrate = create<CelebrateState>((set) => ({
  event: null,
  fire: (e) => set({ event: { ...e, id: ++seq } }),
  clear: () => set({ event: null }),
}));
