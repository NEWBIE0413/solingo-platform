"use client";

import { useEffect } from "react";

import { Volume2 } from "lucide-react";

import { play } from "../audio";

// Big speaker that auto-plays on mount; the option grid is rendered by the parent below it.
export const ListenPrompt = ({ audioSrc }: { audioSrc: string | null }) => {
  useEffect(() => { const t = setTimeout(() => play(audioSrc), 250); return () => clearTimeout(t); }, [audioSrc]);
  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={() => play(audioSrc)}
        className="flex h-[140px] w-[140px] items-center justify-center rounded-3xl border-2 border-b-8 border-sky-500 bg-sky-400 text-white active:translate-y-[4px] active:border-b-2"
        aria-label="다시 듣기"
      >
        <Volume2 className="h-16 w-16" strokeWidth={2.5} />
      </button>
    </div>
  );
};
