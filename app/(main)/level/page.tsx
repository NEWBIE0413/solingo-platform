import { redirect } from "next/navigation";

// 레벨 결과는 프로필의 일부로 편입됐다 — 관리자의 ?user= 열람도 /profile에서 동일하게 동작한다.
export default function LevelPage({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  return redirect("/profile");
}
