"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { countChars, joinBlanks, MAX_SUBMISSION_CHARS } from "@/lib/writing-shared";

type Props = { course: string; taskId: string; blanks: string[]; minChars: number | null; maxChars: number | null };

/*
 Fill-in tasks (blanks) get one input per blank and are submitted as "㉠: …" lines; everything else is a
 textarea with a live count. The draft is kept in this browser until it is submitted — a 700-character
 essay lost to a reload is the one thing that would make someone stop doing these.
*/
export const WritingEditor = ({ course, taskId, blanks, minChars, maxChars }: Props) => {
  const router = useRouter();
  const key = `solingo.writing.${course}.${taskId}`;
  const [text, setText] = useState("");
  const [answers, setAnswers] = useState<string[]>(() => blanks.map(() => ""));
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "null") as { text?: string; answers?: string[] } | null;
      if (saved?.text) setText(saved.text);
      if (saved?.answers?.length) setAnswers(blanks.map((_, i) => saved.answers?.[i] ?? ""));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify({ text, answers })); } catch {}
  }, [key, text, answers]);

  const body = blanks.length ? joinBlanks(blanks, answers) : text;
  const empty = blanks.length ? answers.every((a) => !a.trim()) : !text.trim();
  const n = useMemo(() => countChars(text), [text]);
  const tone = minChars && n < minChars ? "text-amber-600" : maxChars && n > maxChars ? "text-rose-600" : n ? "text-green-600" : "text-neutral-400";

  const submit = () => start(async () => {
    const res = await fetch("/api/writing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ course, promptId: taskId, text: body }) });
    if (!res.ok) { toast.error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "제출하지 못했어요."); return; }
    try { localStorage.removeItem(key); } catch {}
    setText(""); setAnswers(blanks.map(() => ""));
    toast.success("제출했어요. 채점되면 여기서 첨삭을 볼 수 있어요.");
    router.refresh();
  });

  return (
    <section className="mt-4 rounded-2xl border-2 border-slate-200 bg-white p-4">
      {blanks.length ? (
        <div className="flex flex-col gap-3">
          {blanks.map((b, i) => (
            <label key={b} className="flex items-center gap-2">
              <span className="w-7 flex-none text-center text-lg font-bold text-violet-600">{b}</span>
              <input
                value={answers[i] ?? ""}
                onChange={(e) => setAnswers((a) => a.map((v, j) => (j === i ? e.target.value : v)))}
                className="h-12 min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-3 text-base outline-none focus:border-sky-400"
                placeholder="한 문장으로"
                aria-label={`${b} 답`}
              />
            </label>
          ))}
        </div>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={maxChars && maxChars > 400 ? 14 : 9}
            maxLength={MAX_SUBMISSION_CHARS + 500}
            className="w-full resize-y rounded-xl border-2 border-slate-200 p-3 text-base leading-relaxed outline-none [word-break:keep-all] focus:border-sky-400"
            placeholder="여기에 답안을 쓰세요."
            aria-label="답안"
          />
          <p className={cn("mt-1 text-right text-sm font-bold tabular-nums", tone)}>
            {n}자{minChars || maxChars ? ` / ${minChars ?? 0}~${maxChars ?? ""}` : ""}
            <span className="ml-1 text-xs font-medium text-neutral-400">(띄어쓰기 포함, 줄바꿈 제외)</span>
          </p>
        </>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={pending || empty}
        className="mt-3 h-12 w-full rounded-2xl border-2 border-b-4 border-green-600 bg-green-500 text-base font-bold text-white transition-transform active:translate-y-[2px] active:border-b-2 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-neutral-400"
      >
        {pending ? "제출 중…" : "제출하기"}
      </button>
    </section>
  );
};
