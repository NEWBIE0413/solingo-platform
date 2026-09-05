"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { upsertUserProgress } from "@/actions/user-progress";
import { courses, userProgress } from "@/db/schema";

import { Card } from "./card";

type ListProps = {
  courses: (typeof courses.$inferSelect)[];
  activeCourseId?: typeof userProgress.$inferSelect.activeCourseId;
};

export const List = ({ courses, activeCourseId }: ListProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // The tapped card shows as active at once; the server catches up behind it.
  const [chosen, setChosen] = useState<number | null>(null);
  const active = chosen ?? activeCourseId;

  const onClick = (id: number) => {
    if (pending) return;

    if (id === activeCourseId) return router.push("/learn");

    setChosen(id);
    startTransition(async () => {
      try {
        const res = await upsertUserProgress(id);
        if ("error" in res) {
          setChosen(null);
          toast.error(res.error);
          return;
        }
        const title = courses.find((c) => c.id === id)?.title;
        if (title) toast.success(`${title}로 바꿨어요`);
        router.push("/learn");
        router.refresh();
      } catch {
        setChosen(null);
        toast.error("연결이 불안정해요. 다시 시도해 주세요.");
      }
    });
  };

  return (
    <div className="grid grid-cols-2 gap-3 pt-6 sm:gap-4 lg:grid-cols-[repeat(auto-fill,minmax(210px,1fr))]">
      {courses.map((course) => (
        <Card
          key={course.id}
          id={course.id}
          title={course.title}
          imageSrc={course.imageSrc}
          onClick={onClick}
          disabled={pending}
          isActive={course.id === active}
          switching={pending && course.id === chosen}
        />
      ))}
    </div>
  );
};
