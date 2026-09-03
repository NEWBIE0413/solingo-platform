"use client";

import { useState, useTransition } from "react";

import Image from "next/image";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createCoupleAction, joinCoupleAction, leaveCoupleAction } from "@/actions/streak";

type Couple = { code: string; partner: { id: string; name: string; image: string } | null; partnerTodayDone: boolean } | null;

export const CoupleCard = ({ couple }: { couple: Couple }) => {
  const [pending, start] = useTransition();
  const [code, setCode] = useState("");

  if (couple?.partner) {
    return (
      <div className="w-full rounded-2xl border-2 border-slate-200 p-5">
        <div className="flex items-center gap-4">
          <Image src={couple.partner.image} alt={couple.partner.name} width={48} height={48} className="rounded-full border-2 border-slate-200" />
          <div className="flex-1">
            <div className="text-lg font-bold text-neutral-700">{couple.partner.name}</div>
            <div className="text-sm text-muted-foreground">{couple.partnerTodayDone ? "오늘 출석했어요 🔥" : "오늘 아직 출석 전"}</div>
          </div>
          <Button variant="dangerOutline" size="sm" disabled={pending} onClick={() => { if (confirm("커플 연결을 끊을까요? 커플 연속 출석 기록이 사라져요.")) start(() => leaveCoupleAction()); }}>연결 끊기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border-2 border-slate-200 p-5">
      <div>
        <div className="text-lg font-bold text-neutral-700">커플 연결하기</div>
        <p className="text-sm text-muted-foreground">한 사람이 코드를 만들고, 다른 사람이 그 코드를 입력하면 연결돼요.</p>
      </div>
      {couple ? (
        <div className="rounded-xl bg-slate-100 p-4 text-center">
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">내 초대 코드</div>
          <div className="mt-1 font-mono text-3xl font-extrabold tracking-[.3em] text-sky-500">{couple.code}</div>
          <div className="mt-1 text-xs text-muted-foreground">상대가 로그인해서 이 코드를 입력하면 돼요</div>
        </div>
      ) : (
        <Button variant="secondary" size="lg" disabled={pending} onClick={() => start(async () => { await createCoupleAction(); toast.success("초대 코드를 만들었어요"); })}>내 초대 코드 만들기</Button>
      )}
      <div className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="상대의 코드 입력" maxLength={6} className="h-12 flex-1 rounded-xl border-2 border-slate-200 px-4 font-mono text-lg uppercase tracking-widest outline-none focus:border-sky-300" />
        <Button variant="primary" size="lg" disabled={pending || code.length < 6} onClick={() => start(async () => { const r = await joinCoupleAction(code); if (r?.error) toast.error(r.error); else toast.success("연결됐어요! 💞"); })}>연결</Button>
      </div>
    </div>
  );
};
