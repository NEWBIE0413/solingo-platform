"use client";

import { useEffect, useRef, useState } from "react";

import { Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { play } from "../audio";

/* Handwriting pad: faint model glyph, real strokes on top. No recognition — the learner judges; one stroke enables 확인. */
export const Trace = ({ target, reading, audioSrc, onStroke }: { target: string; reading?: string; audioSrc: string | null; onStroke: () => void }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<number[][][]>([]);
  const cur = useRef<number[][] | null>(null);
  const [ghost, setGhost] = useState(true);
  const wide = target.length > 1;

  const draw = () => {
    const cv = ref.current; if (!cv) return; const c = cv.getContext("2d"); if (!c) return;
    const dpr = window.devicePixelRatio || 1; const r = cv.getBoundingClientRect();
    if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    c.setTransform(dpr, 0, 0, dpr, 0, 0); const W = r.width, H = r.height; c.clearRect(0, 0, W, H);
    c.strokeStyle = "rgba(128,128,128,.18)"; c.lineWidth = 1; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, H); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.stroke(); c.setLineDash([]);
    if (ghost) { c.fillStyle = "rgba(128,128,128,.22)"; c.textAlign = "center"; c.textBaseline = "middle"; c.font = `${wide ? Math.min(H * 0.7, W / (target.length + 0.5)) : H * 0.72}px "Hiragino Sans","Noto Sans JP","Apple SD Gothic Neo",sans-serif`; c.fillText(target, W / 2, H / 2 + (wide ? 0 : H * 0.04)); }
    c.strokeStyle = "#404040"; c.lineWidth = Math.max(6, W / 28); c.lineCap = "round"; c.lineJoin = "round";
    for (const st of [...strokes.current, cur.current].filter(Boolean) as number[][][]) { c.beginPath(); st.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); }
  };
  useEffect(() => { draw(); play(audioSrc); const ro = new ResizeObserver(draw); if (ref.current) ro.observe(ref.current); return () => ro.disconnect(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghost, target]);
  const pt = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-2xl tracking-wider text-neutral-600">{reading}</span>
        <button type="button" onClick={() => play(audioSrc)} className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-b-4 border-sky-500 bg-sky-400 text-white active:translate-y-[2px] active:border-b-2" aria-label="듣기"><Volume2 className="h-7 w-7" /></button>
      </div>
      <canvas ref={ref} className={`w-full touch-none rounded-2xl border-2 border-slate-200 bg-white ${wide ? "aspect-[2/1]" : "aspect-square"}`}
        onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} cur.current = [pt(e)]; draw(); }}
        onPointerMove={(e) => { if (!cur.current) return; cur.current.push(pt(e)); draw(); }}
        onPointerUp={() => { if (cur.current) { strokes.current.push(cur.current); cur.current = null; draw(); onStroke(); } }}
        onPointerCancel={() => { cur.current = null; draw(); }} />
      <div className="flex gap-3">
        <Button variant="default" className="flex-1" onClick={() => { strokes.current = []; draw(); }}>지우기</Button>
        <Button variant="primaryOutline" className="flex-1" onClick={() => setGhost((g) => !g)}>{ghost ? "본보기 숨기기" : "본보기 보기"}</Button>
      </div>
    </div>
  );
};
