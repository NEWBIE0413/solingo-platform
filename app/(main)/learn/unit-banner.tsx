import { NotebookText } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UnitBannerProps = {
  order?: number;
  title: string;
  description: string;
  done: number; // lessons finished in this unit
  total: number;
  grownFrom?: number; // lessons done before the one just finished: the bar fills from there
};

export const UnitBanner = ({
  order,
  title,
  description,
  done,
  total,
  grownFrom,
}: UnitBannerProps) => {
  const finished = total > 0 && done >= total;
  const percentage = total ? Math.round((100 * done) / total) : 0;

  return (
    <div className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white shadow-sm lg:p-5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          {order !== undefined ? (
            <span className="text-[11px] font-black uppercase tracking-wider text-green-100/90">
              유닛 {order}
            </span>
          ) : (
            <span />
          )}
          <span className="flex-none rounded-full bg-black/15 px-2.5 py-0.5 text-[11px] font-black tracking-tight text-white backdrop-blur-sm">
            {finished ? "완료!" : `${done}/${total} 레슨`}
          </span>
        </div>

        <h3 className="mt-1 text-base font-black tracking-tight text-white sm:text-lg lg:text-xl">
          {title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs font-medium text-green-50/90 lg:text-sm">
          {description}
        </p>

        {/* progress bar */}
        <div className="mt-2.5 flex items-center gap-2.5">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/20">
            <div
              className={cn(
                "h-full origin-left rounded-full bg-white",
                grownFrom !== undefined && done > 0 && "animate-[fill-bar_.8s_.2s_cubic-bezier(0.23,1,0.32,1)_both] motion-reduce:animate-none"
              )}
              style={
                {
                  width: `${percentage}%`,
                  "--from": grownFrom !== undefined && done > 0 ? Math.max(0, grownFrom) / done : 1,
                  "--to": 1,
                } as React.CSSProperties
              }
            />
          </div>
          <span className="flex-none text-[11px] font-bold text-green-100">
            {percentage}%
          </span>
        </div>
      </div>

      <Link href="/lesson" prefetch className="ml-4">
        <Button
          size="lg"
          variant="secondary"
          className="hidden border-2 border-b-4 border-slate-200 bg-white text-green-600 hover:bg-slate-50 active:border-b-2 xl:flex"
        >
          <NotebookText className="mr-2 h-5 w-5" />
          이어서 하기
        </Button>
      </Link>
    </div>
  );
};
