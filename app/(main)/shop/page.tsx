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
    <div className="flex flex-row-reverse gap-[48px] px-6">
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
          <h1 className="my-6 text-center text-2xl font-bold text-neutral-800">
            상점
          </h1>
          <p className="mb-6 text-center text-lg text-muted-foreground">
            퀘스트로 모은 젬으로 아이템을 사세요.
          </p>

          <Items gems={userProgress.gems} owned={owned} hasActiveSubscription={isPro} />
        </div>
      </FeedWrapper>
    </div>
  );
};

export default ShopPage;
