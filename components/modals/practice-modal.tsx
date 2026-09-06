"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePracticeModal } from "@/store/use-practice-modal";

export const PracticeModal = () => {
  const [isClient, setIsClient] = useState(false);
  const { isOpen, close } = usePracticeModal();

  useEffect(() => setIsClient(true), []);

  if (!isClient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-4 flex w-full items-center justify-center">
            <Image src="/heart.svg" alt="Heart" height={90} width={90} className="drop-shadow-md" />
          </div>

          <DialogTitle className="text-center text-2xl font-black tracking-tight text-neutral-800">
            연습 레슨
          </DialogTitle>

          <DialogDescription className="text-center text-sm font-medium text-neutral-500">
            연습 레슨으로 하트와 XP를 다시 얻을 수 있어요. 연습 레슨에서는 하트나 XP를 잃지 않아요.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-2">
          <div className="flex w-full flex-col gap-y-3">
            <Button
              variant="primary"
              className="w-full"
              size="lg"
              onClick={close}
            >
              알겠어요
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
