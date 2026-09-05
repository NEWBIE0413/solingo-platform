"use client";

import { BookOpen, Flame, ListChecks, Store, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/learn", label: "학습", icon: BookOpen },
  { href: "/quests", label: "퀘스트", icon: ListChecks },
  { href: "/streak", label: "출석", icon: Flame },
  { href: "/shop", label: "상점", icon: Store },
  { href: "/profile", label: "프로필", icon: User },
] as const;

// 폰 전용 하단 탭. 러너(/lesson, /practice)는 전체 화면이라 그 안에서는 숨긴다.
export const BottomNav = () => {
  const pathname = usePathname();
  if (pathname === "/practice" || pathname.startsWith("/lesson")) return null;

  return (
    <nav className="fixed bottom-0 left-0 z-50 flex w-full items-stretch border-t-2 border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            prefetch
            className={cn(
              "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-1",
              active ? "text-green-500" : "text-slate-400",
            )}
          >
            <Icon className="h-6 w-6" strokeWidth={active ? 2.75 : 2} />
            <span className={cn("text-[11px]", active ? "font-extrabold" : "font-semibold")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
