"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { signOut, useSession } from "@/lib/auth-client";

// Avatar + name + sign out; replaces Clerk's <UserButton />.
export const UserButton = ({ compact }: { compact?: boolean }) => {
  const router = useRouter();
  const { data, isPending } = useSession();
  if (isPending || !data) return null;
  const u = data.user;
  return (
    <div className="flex items-center gap-x-3">
      <Image src={u.image || "/mascot.svg"} alt={u.name} width={32} height={32} className="rounded-full border-2 border-slate-200" />
      {!compact && <span className="max-w-[120px] truncate text-sm font-bold text-neutral-600">{u.name}</span>}
      <Button
        size="sm"
        variant="ghost"
        onClick={async () => {
          await signOut();
          router.push("/");
          router.refresh();
        }}
      >
        로그아웃
      </Button>
    </div>
  );
};
