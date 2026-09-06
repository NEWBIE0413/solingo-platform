"use client";

import { useEffect, useState } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHeartsModal } from "@/store/use-hearts-modal";

export const HeartsModal = () => {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { isOpen, close } = useHeartsModal();

  useEffect(() => setIsClient(true), []);

  const onClick = () => {
    close();
    router.push("/shop");
  };

  if (!isClient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-4 flex w-full items-center justify-center">
            <Image
              src="/mascot_bad.svg"
              alt="Mascot Bad"
              height={80}
              width={80}
              className="drop-shadow-md"
            />
          </div>

          <DialogTitle className="text-center text-2xl font-black tracking-tight text-neutral-800">
            하트를 다 썼어요!
          </DialogTitle>

          <DialogDescription className="text-center text-sm font-medium text-neutral-500">
            상점에서 XP로 하트를 채우거나, Pro로 무제한 하트를 받으세요.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-2">
          <div className="flex w-full flex-col gap-y-3">
            <Button
              variant="primary"
              className="w-full"
              size="lg"
              onClick={onClick}
            >
              무제한 하트 받기
            </Button>

            <Button
              variant="primaryOutline"
              className="w-full"
              size="lg"
              onClick={close}
            >
              괜찮아요
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
