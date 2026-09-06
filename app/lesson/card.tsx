import { useCallback } from "react";

import Image from "next/image";
import { useKey } from "react-use";

import { cn } from "@/lib/utils";

import { play } from "./audio";

type CardProps = {
  id: number;
  text: string;
  imageSrc: string | null;
  audioSrc: string | null;
  shortcut: string;
  selected?: boolean;
  onClick: () => void;
  status?: "correct" | "wrong" | "none";
  disabled?: boolean;
  layout: "grid" | "list";
  big?: boolean; // kana / short glyphs get the large treatment
};

const isScript = (t: string) => /[぀-ヿ가-힣一-龯]/.test(t) && t.length <= 2;

export const Card = ({
  text,
  imageSrc,
  audioSrc,
  shortcut,
  selected,
  onClick,
  status,
  disabled,
  layout,
  big,
}: CardProps) => {
  const handleClick = useCallback(() => {
    if (disabled) return;
    play(audioSrc);
    onClick();
  }, [disabled, onClick, audioSrc]);

  useKey(shortcut, handleClick, {}, [handleClick]);
  const large = big ?? isScript(text);

  return (
    <div
      onClick={handleClick}
      className={cn(
        "cursor-pointer select-none rounded-2xl border-2 border-b-4 bg-white p-3.5 shadow-[0_2px_0_0_rgba(0,0,0,0.03)] transition-all hover:bg-slate-50 active:translate-y-[2px] active:border-b-2 sm:p-4 lg:p-6",
        layout === "grid"
          ? "flex min-h-[88px] items-center justify-center sm:min-h-[96px]"
          : "flex w-full items-center justify-between",
        selected && "border-sky-400 bg-sky-50 shadow-sm",
        selected &&
          status === "correct" &&
          "border-emerald-500 bg-emerald-50 shadow-sm",
        selected &&
          status === "wrong" &&
          "animate-[shake_.4s_ease-in-out] border-rose-500 bg-rose-50 shadow-sm",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      {imageSrc && (
        <div className="relative mb-4 aspect-square max-h-[80px] w-full lg:max-h-[150px]">
          <Image src={imageSrc} fill alt={text} />
        </div>
      )}
      <p
        className={cn(
          "text-center font-bold tracking-tight text-neutral-800 [overflow-wrap:anywhere] [word-break:keep-all]",
          large
            ? "kana text-3xl leading-none lg:text-4xl"
            : layout === "grid"
              ? "text-lg font-black lg:text-2xl"
              : "text-base font-bold lg:text-xl",
          selected && "text-sky-600",
          selected && status === "correct" && "text-emerald-600",
          selected && status === "wrong" && "text-rose-600"
        )}
      >
        {text}
      </p>
      {layout === "list" && (
        <div
          className={cn(
            "flex h-7 w-7 flex-none items-center justify-center rounded-lg border-2 text-xs font-black text-neutral-400",
            selected && "border-sky-400 bg-sky-100 text-sky-600",
            selected &&
              status === "correct" &&
              "border-emerald-500 bg-emerald-100 text-emerald-600",
            selected &&
              status === "wrong" &&
              "border-rose-500 bg-rose-100 text-rose-600"
          )}
        >
          {shortcut}
        </div>
      )}
    </div>
  );
};
