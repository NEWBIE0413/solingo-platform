"use client";

import { useEffect, useState } from "react";

import { KANA_TRAINER_TITLE } from "@/constants";

/*
 히라가나 훈련 keeps its own adaptive home (start button, kana chart, words) — the engine decides what
 to study next. Design-wise it sits where any course's path sits: between the stat header and the
 tabs, its own stat row hidden (embed=1) because the header already shows streak/gems. When a session
 starts the engine tells us and the box grows to the full screen, like any lesson; when it ends, back.
*/
export const KanaHome = () => {
  const [session, setSession] = useState(false);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const type = (e.data as { type?: string } | null)?.type;
      if (type === "solingo:session-start") setSession(true);
      if (type === "solingo:session-end") setSession(false);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("trainer-session", session);
    return () => document.documentElement.classList.remove("trainer-session");
  }, [session]);
  return (
    <div className={session ? "fixed inset-0 z-[60] bg-white" : "fixed inset-x-0 top-[50px] bottom-[calc(58px+env(safe-area-inset-bottom))] bg-white lg:left-[256px] lg:top-0 lg:bottom-0"}>
      <iframe src="/kana/index.html?course=ja-kana&embed=1" title={KANA_TRAINER_TITLE} className="h-full w-full border-0" allow="microphone; autoplay" />
    </div>
  );
};
