import { cache } from "react";

import { auth } from "@/lib/session";
import { eq, inArray, sql } from "drizzle-orm";

import { EVERYONE_IS_PRO } from "@/constants";

import db from "./drizzle";
import {
  challengeProgress,
  challenges,
  courses,
  lessons,
  units,
  userProgress,
  userSubscription,
} from "./schema";

const DAY_IN_MS = 86_400_000;

/*
 What counts as weak (약점), read straight from challenge_attempts — no table of its own:
 an item whose first answer on some day (KST) was wrong stays weak until, on two later days,
 its first answer of the day was right. Before this, "weak" meant "never answered right", but a
 lesson brings a missed item back until it is answered right, so nearly every mistake left the
 list the same day and 약점 복습 held only items missed three times in a row.
 Weakest first: fewest clean days since the last miss, then the oldest miss.
 Attempts are stored as timestamp-without-zone in the database session's zone (UTC in production,
 local in dev), hence the two-step conversion.
*/
const weakItems = (userId: string, courseId: number, limit?: number) => sql`
  WITH course_challenges AS (
    SELECT c.id FROM challenges c
    JOIN lessons l ON l.id = c.lesson_id
    JOIN units u ON u.id = l.unit_id
    WHERE u.course_id = ${courseId}
  ),
  firsts AS (
    SELECT DISTINCT ON (a.challenge_id, a.day) a.challenge_id, a.day, a.correct
    FROM (
      SELECT ca.challenge_id, ca.correct, ca.created_at,
             to_char((ca.created_at AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS day
      FROM challenge_attempts ca
      JOIN course_challenges cc ON cc.id = ca.challenge_id
      WHERE ca.user_id = ${userId}
    ) a
    ORDER BY a.challenge_id, a.day, a.created_at
  ),
  misses AS (
    SELECT challenge_id, max(day) AS miss_day FROM firsts WHERE NOT correct GROUP BY challenge_id
  )
  SELECT m.challenge_id AS id
  FROM misses m
  LEFT JOIN firsts f ON f.challenge_id = m.challenge_id AND f.day > m.miss_day AND f.correct
  GROUP BY m.challenge_id, m.miss_day
  HAVING count(f.challenge_id) < 2
  ORDER BY count(f.challenge_id) ASC, m.miss_day ASC
  ${limit ? sql`LIMIT ${limit}` : sql``}
`;

// 약점 복습: the engine's "틀린 것이 다시 나온다" promise. Weak items first (weakItems above);
// falls back to completed challenges — 오래된 순(first-seen)으로 — to always offer 10.
// /practice redirects only when there is nothing to replay at all.
export const getPracticeChallenges = cache(async () => {
  const { userId } = await auth();
  if (!userId) return null;

  const courseProgress = await getUserProgress();
  const courseId = courseProgress?.activeCourseId;
  if (!courseId) return null;

  const wrongs = await db.execute(weakItems(userId, courseId, 12));
  let ids = wrongs.rows.map((r) => Number(r.id));

  if (ids.length < 10) {
    const notIn = ids.length
      ? sql`c.id NOT IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`
      : sql`TRUE`;
    const fill = await db.execute(sql`
      SELECT c.id
      FROM challenges c
      JOIN challenge_progress p ON p.challenge_id = c.id AND p.user_id = ${userId} AND p.completed
      JOIN lessons l ON l.id = c.lesson_id
      JOIN units u ON u.id = l.unit_id
      LEFT JOIN challenge_attempts a ON a.challenge_id = c.id AND a.user_id = ${userId}
      WHERE u.course_id = ${courseId} AND ${notIn}
      GROUP BY c.id
      ORDER BY MIN(a.created_at) ASC NULLS LAST, c.id ASC
      LIMIT ${10 - ids.length}
    `);
    ids = [...ids, ...fill.rows.map((r) => Number(r.id))];
  }

  if (!ids.length) return null;

  const data = await db.query.challenges.findMany({
    where: inArray(challenges.id, ids),
    with: {
      challengeOptions: true,
      challengeProgress: {
        where: eq(challengeProgress.userId, userId),
      },
    },
  });
  const byId = new Map(data.map((c) => [c.id, c]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((c): c is (typeof data)[number] => !!c && c.challengeOptions.length > 0);

  // Practice never reads or writes completion state; mark everything undone so
  // the runner starts from the first card.
  return ordered.map((c) => ({ ...c, completed: false }));
});

/** 사이드바·학습 길의 "약점 복습" 카드에 보여줄 개수 — 위 쿼리의 가벼운 버전. */
export const countWeakChallenges = cache(async () => {
  const { userId } = await auth();
  if (!userId) return 0;
  const progress = await getUserProgress();
  const courseId = progress?.activeCourseId;
  if (!courseId) return 0;
  const r = await db.execute(sql`SELECT COUNT(*)::int AS n FROM (${weakItems(userId, courseId)}) w`);
  const first = r.rows[0] as { n?: number } | undefined;
  return first?.n ?? 0;
});

/** 학습 카드 문구용: 활성 코스에서 완료한 문항 수 — 복습 폴백이 열리는지 판단한다. */
export const countCompletedChallenges = cache(async () => {
  const { userId } = await auth();
  if (!userId) return 0;
  const progress = await getUserProgress();
  const courseId = progress?.activeCourseId;
  if (!courseId) return 0;
  const r = await db.execute(sql`
    SELECT COUNT(*)::int AS n
    FROM challenge_progress p
    JOIN challenges c ON c.id = p.challenge_id
    JOIN lessons l ON l.id = c.lesson_id
    JOIN units u ON u.id = l.unit_id
    WHERE p.user_id = ${userId} AND p.completed AND u.course_id = ${courseId}`);
  const first = r.rows[0] as { n?: number } | undefined;
  return first?.n ?? 0;
});

export const getCourses = cache(async () => {
  const data = await db.query.courses.findMany();

  return data;
});

export const getUserProgress = cache(async () => {
  const { userId } = await auth();

  if (!userId) return null;

  const data = await db.query.userProgress.findFirst({
    where: eq(userProgress.userId, userId),
    with: {
      activeCourse: true,
    },
  });

  return data;
});

export const getUnits = cache(async () => {
  const { userId } = await auth();
  const userProgress = await getUserProgress();

  if (!userId || !userProgress?.activeCourseId) return [];

  const data = await db.query.units.findMany({
    where: eq(units.courseId, userProgress.activeCourseId),
    orderBy: (units, { asc }) => [asc(units.order)],
    with: {
      lessons: {
        orderBy: (lessons, { asc }) => [asc(lessons.order)],
        with: {
          challenges: {
            orderBy: (challenges, { asc }) => [asc(challenges.order)],
            with: {
              challengeProgress: {
                where: eq(challengeProgress.userId, userId),
              },
            },
          },
        },
      },
    },
  });

  const normalizedData = data.map((unit) => {
    const lessonsWithCompletedStatus = unit.lessons.map((lesson) => {
      if (lesson.challenges.length === 0)
        return { ...lesson, completed: false };

      const allCompletedChallenges = lesson.challenges.every((challenge) => {
        return (
          challenge.challengeProgress &&
          challenge.challengeProgress.length > 0 &&
          challenge.challengeProgress.every((progress) => progress.completed)
        );
      });

      return { ...lesson, completed: allCompletedChallenges };
    });

    return { ...unit, lessons: lessonsWithCompletedStatus };
  });

  return normalizedData;
});

export const getCourseById = cache(async (courseId: number) => {
  const data = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      units: {
        orderBy: (units, { asc }) => [asc(units.order)],
        with: {
          lessons: {
            orderBy: (lessons, { asc }) => [asc(lessons.order)],
          },
        },
      },
    },
  });

  return data;
});

export const getCourseProgress = cache(async () => {
  const { userId } = await auth();
  const userProgress = await getUserProgress();

  if (!userId || !userProgress?.activeCourseId) return null;

  const unitsInActiveCourse = await db.query.units.findMany({
    orderBy: (units, { asc }) => [asc(units.order)],
    where: eq(units.courseId, userProgress.activeCourseId),
    with: {
      lessons: {
        orderBy: (lessons, { asc }) => [asc(lessons.order)],
        with: {
          unit: true,
          challenges: {
            with: {
              challengeProgress: {
                where: eq(challengeProgress.userId, userId),
              },
            },
          },
        },
      },
    },
  });

  const firstUncompletedLesson = unitsInActiveCourse
    .flatMap((unit) => unit.lessons)
    .find((lesson) => {
      return lesson.challenges.some((challenge) => {
        return (
          !challenge.challengeProgress ||
          challenge.challengeProgress.length === 0 ||
          challenge.challengeProgress.some((progress) => !progress.completed)
        );
      });
    });

  return {
    activeLesson: firstUncompletedLesson,
    activeLessonId: firstUncompletedLesson?.id,
  };
});

export const getLesson = cache(async (id?: number) => {
  const { userId } = await auth();

  if (!userId) return null;

  const courseProgress = await getCourseProgress();
  const lessonId = id || courseProgress?.activeLessonId;

  if (!lessonId) return null;

  const data = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
    with: {
      challenges: {
        orderBy: (challenges, { asc }) => [asc(challenges.order)],
        with: {
          challengeOptions: true,
          challengeProgress: {
            where: eq(challengeProgress.userId, userId),
          },
        },
      },
    },
  });

  if (!data || !data.challenges) return null;

  const normalizedChallenges = data.challenges.map((challenge) => {
    const completed =
      challenge.challengeProgress &&
      challenge.challengeProgress.length > 0 &&
      challenge.challengeProgress.every((progress) => progress.completed);

    return { ...challenge, completed };
  });

  return { ...data, challenges: normalizedChallenges };
});

export const getLessonPercentage = cache(async () => {
  const courseProgress = await getCourseProgress();

  if (!courseProgress?.activeLessonId) return 0;

  const lesson = await getLesson(courseProgress?.activeLessonId);

  if (!lesson) return 0;

  const completedChallenges = lesson.challenges.filter(
    (challenge) => challenge.completed
  );

  const percentage = Math.round(
    (completedChallenges.length / lesson.challenges.length) * 100
  );

  return percentage;
});

export const getUserSubscription = cache(async () => {
  const { userId } = await auth();

  if (!userId) return null;

  if (EVERYONE_IS_PRO) {
    // Synthetic active subscription: every signed-in user is on the 슈퍼 plan.
    return {
      id: 0,
      userId,
      stripeCustomerId: "",
      stripeSubscriptionId: "",
      stripePriceId: "super",
      stripeCurrentPeriodEnd: new Date(Date.now() + 365 * DAY_IN_MS),
      isActive: true,
    };
  }

  const data = await db.query.userSubscription.findFirst({
    where: eq(userSubscription.userId, userId),
  });

  if (!data) return null;

  const isActive =
    data.stripePriceId &&
    data.stripeCurrentPeriodEnd?.getTime() + DAY_IN_MS > Date.now();

  return {
    ...data,
    isActive: !!isActive,
  };
});

export const getTopTenUsers = cache(async () => {
  const { userId } = await auth();

  if (!userId) return [];

  const data = await db.query.userProgress.findMany({
    orderBy: (userProgress, { desc }) => [desc(userProgress.points)],
    limit: 10,
    columns: {
      userId: true,
      userName: true,
      userImageSrc: true,
      points: true,
      equipped: true,
    },
  });

  return data;
});

// Admin 레벨 결과 열람: the picker's options (everyone with progress rows).
export const getUsersWithProgress = cache(async () => {
  return db.query.userProgress.findMany({
    orderBy: (userProgress, { desc }) => [desc(userProgress.points)],
    columns: { userId: true, userName: true, userImageSrc: true, points: true },
  });
});
