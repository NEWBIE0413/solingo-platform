import { Check, Loader2 } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type CardProps = {
  title: string;
  id: number;
  imageSrc: string;
  onClick: (id: number) => void;
  disabled?: boolean;
  isActive?: boolean;
  switching?: boolean;
};

export const Card = ({
  title,
  id,
  imageSrc,
  onClick,
  disabled,
  isActive,
  switching,
}: CardProps) => {
  return (
    <div
      onClick={() => onClick(id)}
      className={cn(
        "flex h-full min-h-[170px] w-full min-w-0 cursor-pointer flex-col items-center justify-between rounded-2xl border-2 border-b-4 p-3.5 pb-4 shadow-[0_2px_0_0_rgba(0,0,0,0.03)] transition-all active:translate-y-[2px] active:border-b-2 sm:min-h-[200px] sm:pb-5",
        isActive
          ? "border-emerald-400 bg-emerald-50/60 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      <div className="flex min-h-[24px] w-full items-center justify-end">
        {switching ? (
          <div className="flex items-center justify-center rounded-full bg-emerald-600 p-1 shadow-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin stroke-[3] text-white" />
          </div>
        ) : isActive ? (
          <div className="flex items-center justify-center rounded-full bg-emerald-500 p-1 shadow-sm">
            <Check className="h-3.5 w-3.5 stroke-[3.5] text-white" />
          </div>
        ) : null}
      </div>

      <Image
        src={imageSrc}
        alt={title}
        height={64}
        width={85}
        className="rounded-xl border border-slate-200 object-cover shadow-sm"
      />

      <p className="mt-2.5 text-center text-sm font-bold leading-snug tracking-tight text-neutral-800 [word-break:keep-all] sm:text-base">
        {title}
      </p>
    </div>
  );
};
