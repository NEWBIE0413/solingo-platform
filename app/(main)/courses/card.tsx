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
        // min-w-0: a fixed 200px minimum made two columns overlap on a 390px phone
        "flex h-full min-h-[180px] w-full min-w-0 cursor-pointer flex-col items-center justify-between rounded-xl border-2 border-b-[4px] p-3 pb-5 transition-[transform,background-color] hover:bg-black/5 active:translate-y-[2px] active:border-b-2 sm:min-h-[217px] sm:pb-6",
        isActive && "border-green-300 bg-green-50",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      <div className="flex min-h-[24px] w-full items-center justify-end">
        {switching ? (
          <div className="flex items-center justify-center rounded-md bg-green-600 p-1.5">
            <Loader2 className="h-4 w-4 animate-spin stroke-[3] text-white" />
          </div>
        ) : isActive ? (
          <div className="flex items-center justify-center rounded-md bg-green-600 p-1.5">
            <Check className="h-4 w-4 stroke-[4] text-white" />
          </div>
        ) : null}
      </div>

      <Image
        src={imageSrc}
        alt={title}
        height={70}
        width={93.33}
        className="rounded-lg border object-cover drop-shadow-md"
      />

      <p className="mt-3 text-center font-bold leading-snug text-neutral-700 [word-break:keep-all]">{title}</p>
    </div>
  );
};
