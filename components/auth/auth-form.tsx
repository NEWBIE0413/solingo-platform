"use client";

import { useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { signIn, signUp } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

export const AuthForm = ({ mode }: { mode: Mode }) => {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/learn";
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    const name = String(f.get("name") ?? "").trim();
    setPending(true);
    const res =
      mode === "sign-up"
        ? await signUp.email({ email, password, name: name || email.split("@")[0] })
        : await signIn.email({ email, password });
    setPending(false);
    if (res.error) {
      toast.error(res.error.message ?? "실패했어요. 다시 시도해 주세요.");
      return;
    }
    router.push(next);
    router.refresh();
  };

  const field = "h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base outline-none focus:border-sky-300";

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-[360px] flex-col gap-y-3 px-4">
      <h1 className="mb-2 text-center text-2xl font-bold text-neutral-700">
        {mode === "sign-up" ? "계정 만들기" : "로그인"}
      </h1>
      {mode === "sign-up" && <input name="name" placeholder="이름" className={field} autoComplete="name" />}
      <input name="email" type="email" required placeholder="이메일" className={field} autoComplete="email" />
      <input
        name="password"
        type="password"
        required
        minLength={6}
        placeholder="비밀번호 (6자 이상)"
        className={field}
        autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
      />
      <Button type="submit" size="lg" variant="secondary" className="mt-2 w-full" disabled={pending}>
        {mode === "sign-up" ? "시작하기" : "로그인"}
      </Button>
      <a
        href={mode === "sign-up" ? "/sign-in" : "/sign-up"}
        className="mt-2 text-center text-sm font-bold uppercase tracking-wide text-sky-500"
      >
        {mode === "sign-up" ? "이미 계정이 있어요" : "계정 만들기"}
      </a>
    </form>
  );
};
