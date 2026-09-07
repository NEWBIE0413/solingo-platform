"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { finishTrainerLesson } from "@/actions/attempts";

export const TrainerFrame = ({ lessonId, focus, title }: { lessonId: number; focus: string; title: string }) => {
  const router = useRouter();
  const done = useRef(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const type = (e.data as { type?: string } | null)?.type;
      if (type === "solingo:lesson-done" && !done.current) {
        done.current = true;
        setFinishing(true);
        finishTrainerLesson(lessonId).finally(() => router.push("/learn"));
      } else if (type === "solingo:exit") router.push("/learn");
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [lessonId, router]);

  const src = `/kana/index.html?course=ja-kana&embed=1&lesson=${lessonId}&focus=${encodeURIComponent(focus)}`;
  return (
    <div className="fixed inset-0 bg-white">
      <iframe src={src} title={title} className="h-full w-full border-0" allow="microphone; autoplay" />
      {finishing && <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-lg font-bold text-neutral-500">기록 중…</div>}
    </div>
  );
};
