import { CheckCircle, XCircle } from "lucide-react";
import { useKey } from "react-use";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FooterProps = {
  onCheck: () => void;
  status: "correct" | "wrong" | "none" | "completed";
  disabled?: boolean;
  lessonId?: number;
  wrongHint?: string;
  explanation?: string;
};

// Verdict row + one full-width button, like Solingo's engine. Green / rose wash on the whole footer.
export const Footer = ({
  onCheck,
  status,
  disabled,
  lessonId,
  wrongHint,
  explanation,
}: FooterProps) => {
  useKey("Enter", onCheck, {}, [onCheck]);
  return (
    <footer
      className={cn(
        "border-t-2 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3.5 transition-colors sm:px-6 lg:px-10",
        status === "correct" &&
          "border-transparent bg-emerald-100/90 backdrop-blur-md",
        status === "wrong" &&
          "border-transparent bg-rose-100/90 backdrop-blur-md",
        status === "none" && "border-slate-200 bg-white"
      )}
    >
      <div className="mx-auto flex max-w-[600px] flex-col gap-2.5">
        {status === "correct" && (
          <div className="flex items-center text-lg font-black text-emerald-600 duration-150 animate-in fade-in sm:text-xl">
            <CheckCircle className="mr-2.5 h-6 w-6 stroke-[2.5] sm:h-7 sm:w-7" />
            잘했어요!
          </div>
        )}
        {status === "wrong" && (
          <div className="flex flex-col gap-1 duration-150 animate-in fade-in">
            <div className="flex items-center text-lg font-black text-rose-600 sm:text-xl">
              <XCircle className="mr-2.5 h-6 w-6 stroke-[2.5] sm:h-7 sm:w-7" />
              아쉬워요
              {wrongHint ? (
                <span className="ml-2.5 text-sm font-bold text-rose-500/90 sm:text-base">
                  {wrongHint}
                </span>
              ) : null}
            </div>
            {explanation && (
              <p className="whitespace-pre-line text-xs leading-relaxed text-rose-950/80 [overflow-wrap:anywhere] [word-break:keep-all] sm:text-sm">
                {explanation}
              </p>
            )}
          </div>
        )}
        <div className="flex gap-3">
          {status === "completed" && lessonId != null && (
            <Button
              variant="default"
              size="lg"
              className="h-12 flex-1 text-sm font-black sm:h-14 sm:text-base"
              onClick={() => (window.location.href = `/lesson/${lessonId}`)}
            >
              다시 연습하기
            </Button>
          )}
          <Button
            disabled={disabled}
            aria-disabled={disabled}
            onClick={onCheck}
            size="lg"
            className="h-12 flex-1 text-sm font-black shadow-sm sm:h-14 sm:text-base"
            variant={
              status === "wrong"
                ? "danger"
                : status === "correct"
                  ? "secondary"
                  : disabled
                    ? "locked"
                    : "secondary"
            }
          >
            {status === "none" && "확인"}
            {status === "correct" && "계속"}
            {status === "wrong" && "계속"}
            {status === "completed" && "계속"}
          </Button>
        </div>
      </div>
    </footer>
  );
};
