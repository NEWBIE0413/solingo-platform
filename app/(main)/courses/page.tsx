import { auth } from "@/lib/session";

import { getCourses, getUserProgress } from "@/db/queries";

import { List } from "./list";

const CoursesPage = async () => {
  await auth.protect();

  const coursesData = getCourses();
  const userProgressData = getUserProgress();

  const [courses, userProgress] = await Promise.all([
    coursesData,
    userProgressData,
  ]);

  return (
    <div className="mx-auto h-full max-w-[912px] px-4 pb-8 sm:px-6">
      <div className="mb-2 flex w-full flex-col">
        <h1 className="text-xl font-black tracking-tight text-neutral-800 lg:text-2xl">
          언어 코스
        </h1>
        <p className="mt-1 text-xs text-muted-foreground lg:text-sm">
          학습할 언어를 선택하세요.
        </p>
      </div>

      <List courses={courses} activeCourseId={userProgress?.activeCourseId} />
    </div>
  );
};

export default CoursesPage;
