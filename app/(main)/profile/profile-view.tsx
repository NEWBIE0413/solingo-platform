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
  couple: {
    partner?: { name: string; image: string } | null;
    partnerTodayDone?: boolean;
  } | null;
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
          if (r.ok) {
            setEquipped((prev) => ({ ...prev, [slot]: key ?? undefined }));
            toast.success("장착했어요!");
          } else toast.error("장착에 문제가 생겼어요.");
        })
        .catch(() => toast.error("장착에 문제가 생겼어요."));
    });
  };

  const equippedTitle = equipped.title ? shopItem(equipped.title)?.name : null;

  return (
    <div className="flex w-full min-w-0 flex-col items-stretch pb-8">
      <h1 className="mb-4 text-center text-xl font-black tracking-tight text-neutral-800 lg:text-2xl">
        프로필
        {isAdmin && !isSelf ? (
          <span className="block text-sm font-semibold text-neutral-500">
            — {targetName}
          </span>
        ) : null}
      </h1>

      {/* the things a phone can't reach from the tabs: rank, shop, the level-test report */}
      <div className="mb-3.5 grid w-full grid-cols-3 gap-2">
        <Link
          href="/leaderboard"
          prefetch
          className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border-2 border-b-4 border-amber-200 bg-amber-50 text-xs font-black text-amber-700 transition-all active:translate-y-[2px] active:border-b-2"
        >
          <Trophy className="h-4 w-4 fill-amber-300 text-amber-600" /> 순위
        </Link>
        <Link
          href="/shop"
          prefetch
          className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border-2 border-b-4 border-sky-200 bg-sky-50 text-xs font-black text-sky-700 transition-all active:translate-y-[2px] active:border-b-2"
        >
          <ShoppingBag className="h-4 w-4 text-sky-600" /> 상점
        </Link>
        <Link
          href={isSelf ? "/level" : `/level?user=${targetUserId}`}
          prefetch
          className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border-2 border-b-4 border-violet-200 bg-violet-50 text-xs font-black text-violet-700 transition-all active:translate-y-[2px] active:border-b-2"
        >
          <ClipboardList className="h-4 w-4 text-violet-600" /> 시험 결과
        </Link>
      </div>

      <div className="flex w-full flex-col items-center rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-[0_2px_0_0_rgba(0,0,0,0.03)]">
        <AvatarFrame frame={equipped.frame}>
          <Image
            src={imageSrc}
            alt={targetName}
            className="rounded-full"
            height={68}
            width={68}
          />
        </AvatarFrame>
        {isSelf ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name.trim() && name !== targetName)
                void saveName(name.trim());
            }}
            className="mt-2.5 w-full max-w-[12rem] rounded-lg border-2 border-transparent bg-transparent text-center text-lg font-black text-neutral-800 outline-none transition-colors focus:border-slate-200"
            aria-label="이름"
          />
        ) : (
          <p className="mt-2 text-lg font-black text-neutral-800">
            {targetName}
          </p>
        )}
        {equippedTitle && (
          <p className="mt-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-xs font-black text-amber-700">
            {equippedTitle}
          </p>
        )}
      </div>

      <div className="mt-3.5 grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        <Stat label="XP" value={points} />
        <Stat label="젬" value={gems} />
        <Stat
          label="연속 출석"
          value={`${streak.current}일`}
          sub={`최고 ${streak.longest}일`}
        />
        <Stat label="완료 레슨" value={completedLessons} />
        <Stat label="가입일" value={createdLabel} />
      </div>

      <div className="mt-3.5 w-full rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-[0_2px_0_0_rgba(0,0,0,0.03)] sm:p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-bold text-neutral-800 sm:text-base">
            업적
          </h2>
          <span className="text-xs font-bold text-neutral-400">
            {achievements.filter((a) => a.unlocked).length}/
            {achievements.length}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
          {achievements.map((a) => (
            <div
              key={a.key}
              title={a.desc}
              className={cn(
                "flex flex-col items-center rounded-2xl border-2 p-2 text-center transition-all",
                a.unlocked
                  ? "border-amber-300 bg-amber-50/60 shadow-sm"
                  : "border-slate-200 bg-slate-50/50"
              )}
            >
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full text-2xl shadow-inner",
                  a.unlocked ? "bg-white" : "bg-slate-200 opacity-50 grayscale"
                )}
              >
                {a.emoji}
              </div>
              <div
                className={cn(
                  "mt-1.5 text-xs font-bold leading-tight",
                  a.unlocked ? "text-neutral-800" : "text-neutral-400"
                )}
              >
                {a.name}
              </div>
              {!a.unlocked && (
                <>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{
                        width: `${Math.round((100 * a.progress) / a.goal)}%`,
                      }}
                    />
                  </div>
                  <div className="mt-0.5 text-[10px] font-semibold text-neutral-400">
                    {a.progress}/{a.goal}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {couple?.partner && (
        <div className="mt-3.5 flex w-full items-center gap-3.5 rounded-2xl border-2 border-rose-200 bg-rose-50/60 p-3.5 shadow-sm sm:p-4">
          <Image
            src={couple.partner.image}
            alt=""
            height={44}
            width={44}
            className="flex-none rounded-full border-2 border-rose-200"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight text-neutral-800 sm:text-base">
              {couple.partner.name}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {couple.partnerTodayDone
                ? "오늘 출석 완료 💞"
                : "오늘은 아직이에요"}
            </p>
          </div>
          <div className="flex-none text-2xl">💞</div>
        </div>
      )}

      {isSelf && (
        <div className="mt-3.5 w-full rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-[0_2px_0_0_rgba(0,0,0,0.03)] sm:p-5">
          <h2 className="mb-3 text-sm font-bold text-neutral-800 sm:text-base">
            보유 아이템
          </h2>
          {Object.keys(owned).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              아직 없어요. 퀘스트로 젬을 모아 상점에서 사보세요.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(owned).map(([key, qty]) => {
                const item = shopItem(key);
                if (!item) return null;
                const isEquipped =
                  equipped.frame === key ||
                  equipped.title === key ||
                  equipped.mascot === key;
                return (
                  <Button
                    key={key}
                    variant={isEquipped ? "default" : "secondary"}
                    size="sm"
                    className={cn(
                      "h-9 text-xs font-bold",
                      isEquipped &&
                        "border-green-500 bg-green-50 text-green-700"
                    )}
                    disabled={pending}
                    onClick={() =>
                      equip(
                        item.kind === "frame"
                          ? "frame"
                          : item.kind === "title"
                            ? "title"
                            : item.kind === "mascot"
                              ? "mascot"
                              : "frame",
                        isEquipped ? null : key
                      )
                    }
                  >
                    {item.name}
                    {item.kind === "consumable" ? ` ×${qty}` : ""}
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
        .then((r) => {
          if (r?.ok) toast.success("이름을 바꿨어요!");
          else toast.error("이름 변경에 문제가 생겼어요.");
        })
        .catch(() => toast.error("이름 변경에 문제가 생겼어요."));
    });
  }
};

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-3 text-center shadow-[0_2px_0_0_rgba(0,0,0,0.03)] sm:p-3.5">
      <div className="text-base font-black tracking-tight text-neutral-800 sm:text-lg">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-bold text-neutral-500">
        {label}
        {sub ? ` · ${sub}` : ""}
      </div>
    </div>
  );
}

function AvatarFrame({
  frame,
  children,
}: {
  frame?: string;
  children: React.ReactNode;
}) {
  const color = frame?.split("_")[1] ?? "";
  const map: Record<string, string> = {
    sky: "#38bdf8",
    rose: "#fb7185",
    gold: "#f59e0b",
  };
  return (
    <div
      className="rounded-full p-1"
      style={
        frame ? { border: `4px solid ${map[color] ?? "#38bdf8"}` } : undefined
      }
    >
      {children}
    </div>
  );
}
