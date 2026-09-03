"use client";

import { useEffect, useRef, useState } from "react";

import { Mic, Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { play } from "../audio";

const norm = (s: string) => (s || "").replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/[\s。、．，.!?！？ー]/g, "").toLowerCase();
const similar = (a: string, b: string) => { a = norm(a); b = norm(b); if (!a || !b) return 0; if (a === b || a.includes(b) || b.includes(a)) return 1; const m = a.length, n = b.length; const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return 1 - d[m][n] / Math.max(m, n); };

/* Say the word; Web Speech grades leniently. Unsupported or silent → the learner may skip (counts as done). */
export const Speak = ({ target, reading, meaning, audioSrc, lang, onResult }: { target: string; reading?: string; meaning?: string; audioSrc: string | null; lang: string; onResult: (r: { ok: boolean; heard: string } | { skip: true }) => void }) => {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [verdict, setVerdict] = useState<"" | "ok" | "no">("");
  const rec = useRef<any>(null);
  const SR = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
  useEffect(() => { const t = setTimeout(() => play(audioSrc), 250); const s = setTimeout(() => onResult({ skip: true }), 4000); return () => { clearTimeout(t); clearTimeout(s); }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSrc]);

  const start = () => {
    if (!SR) { setHeard("이 브라우저는 음성 인식을 지원하지 않아요"); return; }
    if (rec.current) { rec.current.stop(); return; }
    const r = new SR(); rec.current = r; r.lang = lang; r.maxAlternatives = 5; r.interimResults = true; r.continuous = false;
    r.onstart = () => { setListening(true); setHeard(""); setVerdict(""); };
    r.onresult = (e: any) => { const alts: string[] = [...e.results].flatMap((res: any) => [...res].map((a: any) => a.transcript)); const best = Math.max(...alts.map((a) => similar(a, target)), 0); setHeard(alts[0] || ""); if (e.results[e.results.length - 1].isFinal) { const hasKanji = /[一-龯]/.test(alts[0] || ""); const ok = best >= 0.6 || (hasKanji && (alts[0] || "").length <= target.length + 1); setVerdict(ok ? "ok" : "no"); onResult({ ok, heard: alts[0] || "" }); } };
    r.onerror = (e: any) => { setListening(false); setHeard(e.error === "not-allowed" ? "마이크 권한이 필요해요" : e.error === "no-speech" ? "소리가 안 들렸어요" : "인식 오류"); rec.current = null; };
    r.onend = () => { setListening(false); rec.current = null; };
    r.start();
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="kana text-6xl text-neutral-700">{target}</div>
      <div className="text-center"><div className="font-mono text-2xl tracking-wider text-neutral-600">{reading}</div>{meaning && <div className="text-lg text-muted-foreground">{meaning}</div>}</div>
      <button type="button" onClick={() => play(audioSrc)} className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-b-4 border-sky-500 bg-sky-400 text-white active:translate-y-[2px] active:border-b-2" aria-label="듣기"><Volume2 className="h-7 w-7" /></button>
      <button type="button" onClick={start} className={cn("flex h-16 w-full items-center justify-center gap-3 rounded-2xl border-2 border-b-4 text-lg font-bold uppercase tracking-wide text-white active:translate-y-[2px] active:border-b-2", listening ? "animate-pulse border-rose-600 bg-rose-500" : "border-sky-500 bg-sky-400")}>
        <Mic className="h-6 w-6" /> {listening ? "듣는 중… 다시 누르면 멈춰요" : verdict === "ok" ? "잘했어요" : verdict === "no" ? "다시 말하기" : "눌러서 말하기"}
      </button>
      <div className={cn("min-h-[32px] text-center text-xl", verdict === "ok" ? "text-green-500" : verdict === "no" ? "text-rose-500" : "text-neutral-500")}>{heard}</div>
      <p className="text-center text-sm text-muted-foreground">인식이 안 되면 잠시 뒤 건너뛸 수 있어요.</p>
    </div>
  );
};
