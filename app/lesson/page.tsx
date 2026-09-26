import { questSnapshot } from "@/lib/economy";
import { auth } from "@/lib/session";
import { redirect } from "next/navigation";

import { getLesson, getUserProgress, getUserSubscription } from "@/db/queries";

import { Quiz } from "./quiz";

const LessonPage = async () => {
  const session = await auth.protect();

  const lessonData = getLesson();
  const userProgressData = getUserProgress();
  const userSubscriptionData = getUserSubscription();
  const questsBeforeData = questSnapshot(session.user.id);

  const [lesson, userProgress, userSubscription, questsBefore] = await Promise.all([
    lessonData,
    userProgressData,
    userSubscriptionData,
    questsBeforeData,
  ]);

  if (!lesson || !userProgress) return redirect("/learn");

  const initialPercentage =
    (lesson.challenges.filter((challenge) => challenge.completed).length /
      lesson.challenges.length) *
    100;

  return (
    <Quiz
      initialLessonId={lesson.id}
      initialLessonChallenges={lesson.challenges}
      initialHearts={userProgress.hearts}
      initialPercentage={initialPercentage}
      userSubscription={userSubscription}
      questsBefore={questsBefore}
    />
  );
};

export default LessonPage;
