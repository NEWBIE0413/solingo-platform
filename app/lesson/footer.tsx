import { CheckCircle, XCircle } from "lucide-react";
import { useKey } from "react-use";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FooterProps = { onCheck: () => void; status: "correct" | "wrong" | "none" | "completed"; disabled?: boolean; lessonId?: number; wrongHint?: string; explanation?: string };

// Verdict row + one full-width button, like Solingo's engine. Green / rose wash on the whole footer.
export const Footer = ({ onCheck, status, disabled, lessonId, wrongHint, explanation }: FooterProps) => {
  useKey("Enter", onCheck, {}, [onCheck]);
  return (
    <footer className={cn("border-t-2 px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 lg:px-10", status === "correct" && "border-transparent bg-green-100", status === "wrong" && "border-transparent bg-rose-100")}>
      <div className="mx-auto flex max-w-[600px] flex-col gap-3">
        {status === "correct" && <div className="flex items-center text-xl font-bold text-green-500"><CheckCircle className="mr-3 h-7 w-7" />잘했어요!</div>}
        {status === "wrong" && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center text-xl font-bold text-rose-500"><XCircle className="mr-3 h-7 w-7" />아쉬워요{wrongHint ? <span className="ml-3 text-base font-semibold text-rose-500/80">{wrongHint}</span> : null}</div>
            {explanation && <p className="whitespace-pre-line text-sm leading-relaxed text-rose-900/80 [word-break:keep-all] [overflow-wrap:anywhere]">{explanation}</p>}
          </div>
        )}
        <div className="flex gap-3">
          {status === "completed" && (
            <Button variant="default" size="lg" className="flex-1" onClick={() => (window.location.href = `/lesson/${lessonId}`)}>다시 연습하기</Button>
          )}
          <Button disabled={disabled} aria-disabled={disabled} onClick={onCheck} size="lg" className="h-14 flex-1 text-base" variant={status === "wrong" ? "danger" : "secondary"}>
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
