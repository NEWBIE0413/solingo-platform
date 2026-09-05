"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Group = { key: string | number; n: number; ok: number; answered: number; pct: number | null };
type Item = { id: number; question: string; level: number; tag: string; first: boolean | null };
type Report = { total: number; answered: number; byLevel: Group[]; byTag: Group[]; items: Item[] } | null;
type UserOption = { userId: string; userName: string; points: number };

const TAG_LABEL: Record<string, string> = {
  grammar: "문법",
  vocab: "어휘",
  reading: "읽기",
  expression: "표현",
  listening: "듣기",
  kanji: "한자",
};

const Bar = ({ pct }: { pct: number | null }) => (
  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
    <div className={`h-full ${pct === null ? "bg-slate-200" : pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-orange-400" : "bg-rose-500"}`} style={{ width: `${pct ?? 0}%` }} />
  </div>
);

const cell = (ok: number, answered: number) => (answered ? `${ok}/${answered} (${Math.round((ok / answered) * 100)}%)` : "–");

export const LevelView = ({
  report,
  users,
  targetUserId,
  targetName,
  isAdmin,
}: {
  report: Report;
  users: UserOption[];
  targetUserId: string;
  targetName: string;
  isAdmin: boolean;
}) => {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // level×tag cross table, straight from the per-item report.
  const cross = useMemo(() => {
    if (!report) return { levels: [] as number[], tags: [] as string[], at: (l: number, t: string) => null as { ok: number; answered: number } | null };
    const tags = [...new Set(report.items.map((i) => i.tag))].sort();
    const levels = [...new Set(report.items.map((i) => i.level))].sort((a, b) => a - b);
    const m = new Map<string, { ok: number; answered: number }>();
    for (const it of report.items) {
      if (it.first === null) continue;
      const k = `${it.level}|${it.tag}`;
      const g = m.get(k) ?? { ok: 0, answered: 0 };
      g.answered++;
      if (it.first) g.ok++;
      m.set(k, g);
    }
    return { levels, tags, at: (l: number, t: string) => m.get(`${l}|${t}`) ?? null };
  }, [report]);

  const markdown = useMemo(() => {
    if (!report) return "";
    const lines: string[] = [`## 레벨 테스트 결과 — ${targetName}`, "", `- 응답: ${report.answered}/${report.total} 문항 (첫 시도 기준)`, ""];
    if (cross.levels.length && cross.tags.length) {
      lines.push("### 급수×영역", "");
      lines.push(["급수", ...cross.tags.map((t) => TAG_LABEL[t] ?? t)].join(" | "));
      lines.push(["---", ...cross.tags.map(() => "---")].join(" | "));
      for (const l of cross.levels) {
        lines.push([`${l}급`, ...cross.tags.map((t) => { const g = cross.at(l, t); return g ? cell(g.ok, g.answered) : "–"; })].join(" | "));
      }
      lines.push("");
    }
    lines.push("### 급수별", "", "급수 | 정답/응답 | 정답률", "--- | --- | ---");
    for (const g of report.byLevel) lines.push(`${g.key}급 | ${g.ok}/${g.answered} | ${g.pct === null ? "–" : `${g.pct}%`}`);
    lines.push("", "### 영역별", "", "영역 | 정답/응답 | 정답률", "--- | --- | ---");
    for (const g of report.byTag) lines.push(`${TAG_LABEL[g.key as string] ?? g.key} | ${g.ok}/${g.answered} | ${g.pct === null ? "–" : `${g.pct}%`}`);
    return lines.join("\n");
  }, [report, targetName, cross]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied — nothing graceful to do here; the table is on screen anyway.
    }
  };

  return (
    <div className="flex w-full flex-col items-center">
      <h1 className="my-6 text-center text-2xl font-bold text-neutral-800">
        레벨 테스트 결과{isAdmin && targetName ? <span className="block text-base font-semibold text-neutral-500">— {targetName}</span> : null}
      </h1>

      {isAdmin && (
        <div className="mb-4 flex w-full max-w-sm flex-col gap-1">
          <label htmlFor="level-user" className="text-sm font-semibold text-neutral-600">결과를 볼 학습자</label>
          <select
            id="level-user"
            value={targetUserId}
            onChange={(e) => router.push(`/level?user=${e.target.value}`)}
            className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-neutral-700"
          >
            {users.map((u) => (
              <option key={u.userId} value={u.userId}>{u.userName} ({u.points}P)</option>
            ))}
          </select>
        </div>
      )}

      {!report ? (
        <p className="text-center text-muted-foreground">한국어 TOPIK 코스의 레벨 테스트가 아직 없어요.</p>
      ) : (
        <>
          <p className="mb-4 text-center text-lg text-muted-foreground">
            {report.answered} / {report.total} 문항 응답 · 첫 시도 기준
            {report.answered < report.total && <span className="block text-sm">코스에서 "레벨 테스트" 유닛을 끝까지 풀면 결과가 채워져요.</span>}
          </p>

          {cross.levels.length > 0 && (
            <div className="mb-4 w-full min-w-0 max-w-full overflow-x-auto rounded-2xl border-2 border-slate-200 p-4 sm:p-5">
              <h2 className="mb-3 text-lg font-bold text-neutral-700">급수×영역</h2>
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-neutral-500">
                    <th className="py-1 pr-3 font-semibold">급수</th>
                    {cross.tags.map((t) => <th key={t} className="py-1 pr-3 font-semibold">{TAG_LABEL[t] ?? t}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {cross.levels.map((l) => (
                    <tr key={l} className="border-t border-slate-100">
                      <td className="py-1.5 pr-3 font-bold text-neutral-600">{l}급</td>
                      {cross.tags.map((t) => {
                        const g = cross.at(l, t);
                        return <td key={t} className="py-1.5 pr-3 text-neutral-600">{g ? cell(g.ok, g.answered) : "–"}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="w-full rounded-2xl border-2 border-slate-200 p-5">
            <h2 className="mb-3 text-lg font-bold text-neutral-700">급수별</h2>
            <div className="flex flex-col gap-3">
              {report.byLevel.map((g) => (
                <div key={String(g.key)}>
                  <div className="mb-1 flex justify-between text-sm font-bold text-neutral-600"><span>{g.key}급</span><span>{g.pct === null ? "–" : `${g.pct}%`} <span className="font-normal text-muted-foreground">({g.ok}/{g.answered})</span></span></div>
                  <Bar pct={g.pct} />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 w-full rounded-2xl border-2 border-slate-200 p-5">
            <h2 className="mb-3 text-lg font-bold text-neutral-700">영역별</h2>
            <div className="flex flex-col gap-3">
              {report.byTag.map((g) => (
                <div key={String(g.key)}>
                  <div className="mb-1 flex justify-between text-sm font-bold text-neutral-600"><span>{TAG_LABEL[g.key as string] ?? g.key}</span><span>{g.pct === null ? "–" : `${g.pct}%`} <span className="font-normal text-muted-foreground">({g.ok}/{g.answered})</span></span></div>
                  <Bar pct={g.pct} />
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="default"
            size="lg"
            className={cn("mt-6 h-14 w-full max-w-sm text-base")}
            onClick={copy}
            disabled={report.answered === 0}
            aria-label="결과를 마크다운으로 복사"
          >
            {copied ? <Check className="mr-2 h-5 w-5" /> : <Copy className="mr-2 h-5 w-5" />}
            {copied ? "복사됐어요" : "마크다운 복사"}
          </Button>
          {report.answered === 0 && <p className="mt-2 text-sm text-muted-foreground">응답이 있으면 복사할 수 있어요.</p>}
        </>
      )}
    </div>
  );
};
