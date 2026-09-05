import { NotebookText } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type UnitBannerProps = {
  title: string;
  description: string;
  done: number;   // lessons finished in this unit
  total: number;
};

export const UnitBanner = ({ title, description, done, total }: UnitBannerProps) => {
  const finished = total > 0 && done >= total;
  return (
    <div className="flex w-full items-center justify-between rounded-xl bg-green-500 p-5 text-white">
      <div className="min-w-0 flex-1 space-y-2.5">
        <h3 className="text-2xl font-bold">{title}</h3>
        <p className="text-lg">{description}</p>
        {/* how far into the unit you are — the path below shows it too, but a number you can read at a glance is what pulls you to finish the unit */}
        <div className="flex items-center gap-3 pt-1">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-green-700/50">
            <div className="h-full rounded-full bg-white transition-[width] duration-500" style={{ width: total ? `${Math.round((100 * done) / total)}%` : "0%" }} />
          </div>
          <span className="flex-none text-sm font-bold">{finished ? "✅ 완료!" : `레슨 ${done}/${total}`}</span>
        </div>
      </div>

      <Link href="/lesson" prefetch>
        <Button
          size="lg"
          variant="secondary"
          className="hidden border-2 border-b-4 active:border-b-2 xl:flex"
        >
          <NotebookText className="mr-2" />
          이어서 하기
        </Button>
      </Link>
    </div>
  );
};
