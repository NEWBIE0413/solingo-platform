import { auth } from "@/lib/session";
import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import { getUserProgress, getUserSubscription } from "@/db/queries";
import db from "@/db/drizzle";
import { userItems } from "@/db/schema";
import { eq } from "drizzle-orm";

import { Items } from "./items";

const ShopPage = async () => {
  const { userId } = await auth.protect().then((s) => ({ userId: s.user.id }));
  const [userProgress, userSubscription, ownedRows] = await Promise.all([
    getUserProgress(),
    getUserSubscription(),
    db.select().from(userItems).where(eq(userItems.userId, userId)),
  ]);

  if (!userProgress || !userProgress.activeCourse) redirect("/courses");
  const owned = Object.fromEntries(ownedRows.map((r) => [r.itemKey, r.qty]));

  const isPro = !!userSubscription?.isActive;

  return (
    <div className="flex flex-row-reverse gap-[48px] px-4 sm:px-6">
      <StickyWrapper>
        <UserProgress
          activeCourse={userProgress.activeCourse}
          hearts={userProgress.hearts}
          points={userProgress.points}
          gems={userProgress.gems}
          hasActiveSubscription={isPro}
        />
      </StickyWrapper>

      <FeedWrapper>
        <div className="flex w-full flex-col items-center">
          <div className="mb-4 flex w-full flex-col items-center text-center lg:mb-6">
            <h1 className="text-xl font-black tracking-tight text-neutral-800 lg:text-2xl">
              상점
            </h1>
            <p className="mt-1 text-xs text-muted-foreground lg:text-sm">
              퀘스트로 모은 젬으로 아이템을 사세요.
            </p>
          </div>

          <Items
            gems={userProgress.gems}
            owned={owned}
            hasActiveSubscription={isPro}
          />
        </div>
      </FeedWrapper>
    </div>
  );
};

export default ShopPage;
