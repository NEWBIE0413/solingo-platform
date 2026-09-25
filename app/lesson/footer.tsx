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

/*
 Two layers, like Duolingo's feedback sheet. The check row keeps one height for the whole
 lesson; the verdict is a separate sheet fixed to the bottom edge that rises over it, so the
 question above never moves when a verdict appears. Fixed rather than absolute: a box
 translated past the bottom of the document would stretch the page's scroll height while
 it slides.
*/
export const Footer = ({
  onCheck,
  status,
  disabled,
  lessonId,
  wrongHint,
  explanation,
}: FooterProps) => {
  useKey("Enter", onCheck, {}, [onCheck]);
  const verdict = status === "correct" || status === "wrong";
  return (
    <>
      <footer
        inert={verdict}
        className="border-t-2 border-slate-200 bg-white px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3.5 sm:px-6 lg:px-10"
      >
        <div className="mx-auto flex max-w-[600px] gap-3">
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
            variant={disabled ? "locked" : "secondary"}
          >
            {status === "completed" ? "계속" : "확인"}
          </Button>
        </div>
      </footer>

      {verdict && (
        <div
          role="status"
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 animate-[sheet-up_250ms_cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-[fade_150ms_ease-out] sm:px-6 lg:px-10",
            status === "correct" ? "bg-emerald-100" : "bg-rose-100"
          )}
        >
          <div className="mx-auto flex max-w-[600px] flex-col gap-2.5">
            {status === "correct" ? (
              <div className="flex items-center text-lg font-black text-emerald-600 sm:text-xl">
                <CheckCircle className="mr-2.5 h-6 w-6 stroke-[2.5] sm:h-7 sm:w-7" />
                잘했어요!
              </div>
            ) : (
              <div className="flex flex-col gap-1">
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
            <Button
              onClick={onCheck}
              size="lg"
              className="h-12 w-full text-sm font-black shadow-sm sm:h-14 sm:text-base"
              variant={status === "wrong" ? "danger" : "secondary"}
            >
              계속
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
