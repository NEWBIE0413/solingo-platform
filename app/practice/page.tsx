import { redirect } from "next/navigation";

import { getPracticeChallenges, getUserProgress, getUserSubscription } from "@/db/queries";

import { questSnapshot } from "@/lib/economy";
import { auth } from "@/lib/session";

import { Quiz } from "../lesson/quiz";

// 약점 복습: a temporary runner over the user's wrong-first-attempt challenges.
// Deliberately lesson-id-less — the Quiz runs on a bare challenges array so the
// original lessons' completion state stays untouched.
const PracticePage = async () => {
  const session = await auth.protect();

  const userProgressData = getUserProgress();
  const userSubscriptionData = getUserSubscription();
  const questsBeforeData = questSnapshot(session.user.id);

  const [userProgress, userSubscription, questsBefore] = await Promise.all([
    userProgressData,
    userSubscriptionData,
    questsBeforeData,
  ]);

  if (!userProgress) redirect("/learn");

  const challenges = await getPracticeChallenges();
  if (!challenges || challenges.length === 0) redirect("/learn");

  return (
    <Quiz
      initialLessonId={0}
      practice
      initialLessonChallenges={challenges}
      initialHearts={userProgress.hearts}
      initialPercentage={0}
      userSubscription={userSubscription}
      questsBefore={questsBefore}
    />
  );
};

export default PracticePage;
