import { redirect } from "next/navigation";

// 레벨 결과는 프로필로 편입됐다. 관리자의 ?user= 딥링크도 그대로 넘긴다.
export default async function LevelPage({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  const { user } = await searchParams;
  redirect(user ? `/profile?user=${encodeURIComponent(user)}` : "/profile");
}
