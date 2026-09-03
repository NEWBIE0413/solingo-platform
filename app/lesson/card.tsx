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

const isScript = (t: string) => /[぀-ヿ가-힣一-龯]/.test(t) && t.length <= 6;

export const Card = ({ text, imageSrc, audioSrc, shortcut, selected, onClick, status, disabled, layout, big }: CardProps) => {
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
        "cursor-pointer select-none rounded-xl border-2 border-b-4 bg-white p-4 hover:bg-black/5 active:border-b-2 active:translate-y-[2px] lg:p-6",
        layout === "grid" ? "flex min-h-[92px] items-center justify-center" : "flex w-full items-center justify-between",
        selected && "border-sky-300 bg-sky-100 hover:bg-sky-100",
        selected && status === "correct" && "border-green-300 bg-green-100 hover:bg-green-100",
        selected && status === "wrong" && "border-rose-300 bg-rose-100 hover:bg-rose-100",
        disabled && "pointer-events-none hover:bg-white"
      )}
    >
      {imageSrc && (
        <div className="relative mb-4 aspect-square max-h-[80px] w-full lg:max-h-[150px]">
          <Image src={imageSrc} fill alt={text} />
        </div>
      )}
      <p
        className={cn(
          "text-center text-neutral-700",
          large ? "kana text-4xl leading-none lg:text-5xl" : layout === "grid" ? "text-2xl font-bold lg:text-3xl" : "text-xl font-bold lg:text-2xl",
          selected && "text-sky-500",
          selected && status === "correct" && "text-green-500",
          selected && status === "wrong" && "text-rose-500"
        )}
      >
        {text}
      </p>
      {layout === "list" && (
        <div className={cn("flex h-[28px] w-[28px] flex-none items-center justify-center rounded-lg border-2 text-sm font-semibold text-neutral-400", selected && "border-sky-300 text-sky-500", selected && status === "correct" && "border-green-500 text-green-500", selected && status === "wrong" && "border-rose-500 text-rose-500")}>
          {shortcut}
        </div>
      )}
    </div>
  );
};
