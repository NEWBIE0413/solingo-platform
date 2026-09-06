import { InfinityIcon, X } from "lucide-react";
import Image from "next/image";

import { Progress } from "@/components/ui/progress";
import { useExitModal } from "@/store/use-exit-modal";

type HeaderProps = {
  hearts: number;
  percentage: number;
  hasActiveSubscription: boolean;
  combo?: number; // consecutive correct answers in this lesson; shown from 2
};

export const Header = ({
  hearts,
  percentage,
  hasActiveSubscription,
  combo = 0,
}: HeaderProps) => {
  const { open } = useExitModal();

  return (
    <header className="mx-auto flex w-full max-w-[1140px] items-center justify-between gap-x-4 px-4 pt-3 sm:gap-x-7 sm:px-8 sm:pt-6 lg:pt-10">
      <X
        onClick={open}
        className="cursor-pointer text-slate-500 transition hover:opacity-75 active:scale-95"
      />

      <Progress value={percentage} />

      {combo >= 2 && (
        <div
          key={combo}
          className="flex shrink-0 animate-[pop_.35s_ease-out] items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-black text-orange-600 shadow-sm"
        >
          🔥 {combo}
        </div>
      )}

      <div className="flex items-center text-sm font-extrabold text-rose-500 sm:text-base">
        <Image
          src="/heart.svg"
          height={26}
          width={26}
          alt="Heart"
          className="mr-1.5"
        />
        {hasActiveSubscription ? (
          <InfinityIcon className="h-5 w-5 shrink-0 stroke-[3]" />
        ) : (
          hearts
        )}
      </div>
    </header>
  );
};
