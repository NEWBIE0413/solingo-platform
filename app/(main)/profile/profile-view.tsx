"use client";

import { useState, useTransition } from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, ShoppingBag, Trophy } from "lucide-react";
import { toast } from "sonner";

import { equipItemAction, updateUserNameAction } from "@/actions/economy";
import { Button } from "@/components/ui/button";
import type { AchievementView } from "@/lib/achievements-defs";
import { shopItem } from "@/lib/economy-defs";
import { cn } from "@/lib/utils";

import { LevelView } from "../level/level-view";

type Report = Parameters<typeof LevelView>[0]["report"];

export const ProfileView = ({
  selfUserId,
  targetUserId,
  targetName,
  imageSrc,
  points,
  gems,
  equipped: initialEquipped,
  owned,
  streak,
  couple,
  isAdmin,
  report,
  users,
  createdLabel,
  completedLessons,
  achievements,
}: {
  selfUserId: string;
  targetUserId: string;
  targetName: string;
  imageSrc: string;
  points: number;
  gems: number;
  equipped: { frame?: string; title?: string; mascot?: string };
  owned: Record<string, number>;
  streak: { current: number; longest: number; todayDone: boolean };
  couple: { partner?: { name: string; image: string } | null; partnerTodayDone?: boolean } | null;
  isAdmin: boolean;
  report: NonNullable<Parameters<typeof LevelView>[0]["report"]> | null;
  users: { userId: string; userName: string; points: number }[];
  createdLabel: string;
  completedLessons: number;
  achievements: AchievementView[];
}) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [equipped, setEquipped] = useState(initialEquipped);
  const [name, setName] = useState(targetName);
  const isSelf = targetUserId === selfUserId;

  const equip = (slot: "frame" | "title" | "mascot", key: string | null) => {
    if (!isSelf || pending) return;
    startTransition(() => {
      equipItemAction(slot, key)
        .then((r) => {
          if (r.ok) { setEquipped((prev) => ({ ...prev, [slot]: key ?? undefined })); toast.success("장착했어요!"); }
          else toast.error("장착에 문제가 생겼어요.");
        })
        .catch(() => toast.error("장착에 문제가 생겼어요."));
    });
  };

  const equippedTitle = equipped.title ? shopItem(equipped.title)?.name : null;

  return (
    <div className="flex w-full min-w-0 flex-col items-stretch">
      <h1 className="my-6 text-center text-2xl font-bold text-neutral-800">프로필{isAdmin && !isSelf ? <span className="block text-base font-semibold text-neutral-500">— {targetName}</span> : null}</h1>

      {/* the things a phone can't reach from the tabs: rank, shop, the level-test report */}
      <div className="mb-4 grid w-full grid-cols-3 gap-2">
        <Link href="/leaderboard" prefetch className="flex h-12 items-center justify-center gap-1.5 rounded-xl border-2 border-b-4 border-amber-200 bg-amber-50 text-sm font-bold text-amber-600 active:translate-y-[2px] active:border-b-2">
          <Trophy className="h-5 w-5 fill-amber-200" /> 순위
        </Link>
        <Link href="/shop" prefetch className="flex h-12 items-center justify-center gap-1.5 rounded-xl border-2 border-b-4 border-sky-200 bg-sky-50 text-sm font-bold text-sky-600 active:translate-y-[2px] active:border-b-2">
          <ShoppingBag className="h-5 w-5" /> 상점
        </Link>
        <Link href={isSelf ? "/level" : `/level?user=${targetUserId}`} prefetch className="flex h-12 items-center justify-center gap-1.5 rounded-xl border-2 border-b-4 border-violet-200 bg-violet-50 text-sm font-bold text-violet-600 active:translate-y-[2px] active:border-b-2">
          <ClipboardList className="h-5 w-5" /> 시험 결과
        </Link>
      </div>

      <div className="flex w-full flex-col items-center rounded-2xl border-2 border-slate-200 p-6">
        <AvatarFrame frame={equipped.frame}>
          <Image src={imageSrc} alt={targetName} className="rounded-full" height={72} width={72} />
        </AvatarFrame>
        {isSelf ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { if (name.trim() && name !== targetName) void saveName(name.trim()); }}
            className="mt-3 w-full max-w-[12rem] rounded-lg border-2 border-transparent bg-transparent text-center text-xl font-bold text-neutral-800 outline-none focus:border-slate-200"
            aria-label="이름"
          />
        ) : (
          <p className="mt-2 text-xl font-bold text-neutral-800">{targetName}</p>
        )}
        {equippedTitle && <p className="mt-1 rounded-full bg-amber-100 px-3 py-0.5 text-sm font-bold text-amber-700">{equippedTitle}</p>}
      </div>

      <div className="mt-4 grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="XP" value={points} />
        <Stat label="젬" value={gems} />
        <Stat label="연속 출석" value={`${streak.current}일`} sub={`최고 ${streak.longest}일`} />
        <Stat label="완료 레슨" value={completedLessons} />
        <Stat label="가입일" value={createdLabel} />
      </div>

      <div className="mt-4 w-full rounded-2xl border-2 border-slate-200 p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-neutral-700">업적</h2>
          <span className="text-sm font-bold text-neutral-400">{achievements.filter((a) => a.unlocked).length}/{achievements.length}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
          {achievements.map((a) => (
            <div key={a.key} title={a.desc} className={cn("flex flex-col items-center rounded-2xl border-2 p-2 text-center", a.unlocked ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50")}>
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-full text-2xl", a.unlocked ? "bg-white shadow-[0_2px_0_#fcd34d]" : "bg-slate-200 opacity-50 grayscale")}>{a.emoji}</div>
              <div className={cn("mt-1.5 text-xs font-bold leading-tight", a.unlocked ? "text-neutral-700" : "text-neutral-400")}>{a.name}</div>
              {!a.unlocked && (
                <>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-amber-300" style={{ width: `${Math.round((100 * a.progress) / a.goal)}%` }} /></div>
                  <div className="mt-0.5 text-[10px] font-semibold text-neutral-400">{a.progress}/{a.goal}</div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {couple?.partner && (
        <div className="mt-4 flex w-full items-center gap-4 rounded-2xl border-2 border-rose-200 bg-rose-50 p-4">
          <Image src={couple.partner.image} alt="" height={44} width={44} className="rounded-full" />
          <div className="flex-1">
            <p className="font-bold text-neutral-700">{couple.partner.name}</p>
            <p className="text-sm text-muted-foreground">{couple.partnerTodayDone ? "오늘 출석 완료 💞" : "오늘은 아직이에요"}</p>
          </div>
          <div className="text-2xl">💞</div>
        </div>
      )}

      {isSelf && (
        <div className="mt-4 w-full rounded-2xl border-2 border-slate-200 p-5">
          <h2 className="mb-3 text-lg font-bold text-neutral-700">보유 아이템</h2>
          {Object.keys(owned).length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 없어요. 퀘스트로 젬을 모아 상점에서 사보세요.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(owned).map(([key, qty]) => {
                const item = shopItem(key);
                if (!item) return null;
                const isEquipped = equipped.frame === key || equipped.title === key || equipped.mascot === key;
                const equippable = item.kind !== "consumable";
                return (
                  <Button key={key} variant={isEquipped ? "default" : "secondary"} size="sm" className="h-9" disabled={pending} onClick={() => equip(item.kind === "frame" ? "frame" : item.kind === "title" ? "title" : item.kind === "mascot" ? "mascot" : "frame", isEquipped ? null : key)}>
                    {item.name}{item.kind === "consumable" ? ` ×${qty}` : ""}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );

  function saveName(n: string) {
    startTransition(() => {
      updateUserNameAction(n)
        .then((r) => { if (r?.ok) toast.success("이름을 바꿨어요!"); else toast.error("이름 변경에 문제가 생겼어요."); })
        .catch(() => toast.error("이름 변경에 문제가 생겼어요."));
    });
  }
};

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 p-4 text-center">
      <div className="text-lg font-extrabold text-neutral-800">{value}</div>
      <div className="text-xs font-bold text-neutral-500">{label}{sub ? ` · ${sub}` : ""}</div>
    </div>
  );
}

function AvatarFrame({ frame, children }: { frame?: string; children: React.ReactNode }) {
  const color = frame?.split("_")[1] ?? "";
  const map: Record<string, string> = { sky: "#38bdf8", rose: "#fb7185", gold: "#f59e0b" };
  return (
    <div className="rounded-full p-1" style={frame ? { border: `4px solid ${map[color] ?? "#38bdf8"}` } : undefined}>
      {children}
    </div>
  );
}
