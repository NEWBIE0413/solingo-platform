import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { MAX_HEARTS } from "@/constants";

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageSrc: text("image_src").notNull(),
});

export const coursesRelations = relations(courses, ({ many }) => ({
  userProgress: many(userProgress),
  units: many(units),
}));

export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // Unit 1
  description: text("description").notNull(), // Learn the basics of spanish
  courseId: integer("course_id")
    .references(() => courses.id, {
      onDelete: "cascade",
    })
    .notNull(),
  order: integer("order").notNull(),
});

export const unitsRelations = relations(units, ({ many, one }) => ({
  course: one(courses, {
    fields: [units.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
}));

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  unitId: integer("unit_id")
    .references(() => units.id, {
      onDelete: "cascade",
    })
    .notNull(),
  order: integer("order").notNull(),
});

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  unit: one(units, {
    fields: [lessons.unitId],
    references: [units.id],
  }),
  challenges: many(challenges),
}));

// SELECT/ASSIST come from the clone; the rest are Solingo's script-level exercise types.
export const challengesEnum = pgEnum("type", ["SELECT", "ASSIST", "LISTEN", "MATCH", "BUILD", "TRACE", "SPEAK"]);

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id")
    .references(() => lessons.id, {
      onDelete: "cascade",
    })
    .notNull(),
  type: challengesEnum("type").notNull(),
  question: text("question").notNull(),
  order: integer("order").notNull(),
  level: integer("level"), // e.g. TOPIK 3..6 — optional content metadata
  tag: text("tag"),        // grammar / vocab / reading … — optional content metadata
  audioSrc: text("audio_src"), // LISTEN: the clip to play; BUILD/SPEAK/TRACE: the target's clip
  meta: jsonb("meta"),         // type-specific: BUILD/SPEAK/TRACE { target, reading, meaning }
});

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  lesson: one(lessons, {
    fields: [challenges.lessonId],
    references: [lessons.id],
  }),
  challengeOptions: many(challengeOptions),
  challengeProgress: many(challengeProgress),
}));

export const challengeOptions = pgTable("challenge_options", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id")
    .references(() => challenges.id, {
      onDelete: "cascade",
    })
    .notNull(),
  text: text("text").notNull(),
  correct: boolean("correct").notNull(),
  imageSrc: text("image_src"),
  audioSrc: text("audio_src"),
  meta: jsonb("meta"), // MATCH { pair, side: "left"|"right" }; BUILD { order } on correct tiles
});

export const challengeOptionsRelations = relations(
  challengeOptions,
  ({ one }) => ({
    challenge: one(challenges, {
      fields: [challengeOptions.challengeId],
      references: [challenges.id],
    }),
  })
);

export const challengeProgress = pgTable("challenge_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  challengeId: integer("challenge_id")
    .references(() => challenges.id, {
      onDelete: "cascade",
    })
    .notNull(),
  completed: boolean("completed").notNull().default(false),
});

export const challengeProgressRelations = relations(
  challengeProgress,
  ({ one }) => ({
    challenge: one(challenges, {
      fields: [challengeProgress.challengeId],
      references: [challenges.id],
    }),
  })
);

export const userProgress = pgTable("user_progress", {
  userId: text("user_id").primaryKey(),
  userName: text("user_name").notNull().default("User"),
  userImageSrc: text("user_image_src").notNull().default("/mascot.svg"),
  activeCourseId: integer("active_course_id").references(() => courses.id, {
    onDelete: "cascade",
  }),
  hearts: integer("hearts").notNull().default(MAX_HEARTS),
  points: integer("points").notNull().default(0),
  gems: integer("gems").notNull().default(0), // 퀘스트 보상 재화 — 상점에서 쓴다
  equipped: jsonb("equipped").$type<{ frame?: string; title?: string; mascot?: string }>(), // 프로필 꾸미기 {frame,title,mascot}
});

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  activeCourse: one(courses, {
    fields: [userProgress.activeCourseId],
    references: [courses.id],
  }),
}));

export const userSubscription = pgTable("user_subscription", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripePriceId: text("stripe_price_id").notNull(),
  stripeCurrentPeriodEnd: timestamp("stripe_current_period_end").notNull(),
});

// Solingo engine state (the /kana tab): one JSON document per user per course.
// Server-authoritative — the browser only mirrors it for offline use.
export const kanaState = pgTable("kana_state", {
  userId: text("user_id").notNull(),
  courseId: text("course_id").notNull(),
  state: jsonb("state").notNull().default({}),
  session: jsonb("session"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.courseId] })]);

// 출석: a day (Asia/Seoul) counts once at least one lesson — or one 히라가나 session — is completed.
export const dailyActivity = pgTable("daily_activity", {
  userId: text("user_id").notNull(),
  day: text("day").notNull(), // YYYY-MM-DD in Asia/Seoul
  lessons: integer("lessons").notNull().default(0),
  xp: integer("xp").notNull().default(0),      // 오늘 번 XP — 퀘스트 xp50 계산용
  practice: integer("practice").notNull().default(0), // 오늘 완료한 약점 복습 수
  kana: integer("kana").notNull().default(0),  // 오늘 완료한 히라가나 세션 수
  frozen: boolean("frozen").notNull().default(false), // 출석 보호(freeze)로 채워진 날
}, (t) => [primaryKey({ columns: [t.userId, t.day] })]);

// 퀘스트 수령 대장. PK(user, quest, day)가 이중 지급을 막는다 — 지급은 이 insert가
// 성공할 때만 이뤄진다. 일회성 퀘스트(streak7 등)는 day를 '' 로 기록.
export const questClaims = pgTable("quest_claims", {
  userId: text("user_id").notNull(),
  questKey: text("quest_key").notNull(),
  day: text("day").notNull(), // YYYY-MM-DD in Asia/Seoul; '' for one-off quests
  claimedAt: timestamp("claimed_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.questKey, t.day] })]);

// 상점 소유물. 소모품(freeze)은 qty로 개수를 센다; 꾸미기는 qty 1 고정.
export const userItems = pgTable("user_items", {
  userId: text("user_id").notNull(),
  itemKey: text("item_key").notNull(),
  qty: integer("qty").notNull().default(1),
  acquiredAt: timestamp("acquired_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.itemKey] })]);

// 커플: two accounts linked by an invite code. The couple streak counts consecutive days both were active.
export const couples = pgTable("couples", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  userA: text("user_a").notNull().unique(),
  userB: text("user_b").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Every answer, right or wrong. challenge_progress only knows "eventually completed";
// the level test needs first-attempt correctness to measure a learner honestly.
export const challengeAttempts = pgTable("challenge_attempts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  challengeId: integer("challenge_id").references(() => challenges.id, { onDelete: "cascade" }).notNull(),
  correct: boolean("correct").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export * from "./auth-schema";
