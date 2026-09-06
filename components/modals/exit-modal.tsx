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
import { useExitModal } from "@/store/use-exit-modal";

export const ExitModal = () => {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { isOpen, close } = useExitModal();

  useEffect(() => setIsClient(true), []);

  if (!isClient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-4 flex w-full items-center justify-center">
            <Image
              src="/mascot_sad.svg"
              alt="Mascot Sad"
              height={80}
              width={80}
              className="drop-shadow-md"
            />
          </div>

          <DialogTitle className="text-center text-2xl font-black tracking-tight text-neutral-800">
            잠깐, 가지 마세요!
          </DialogTitle>

          <DialogDescription className="text-center text-sm font-medium text-neutral-500">
            레슨을 나가려고 해요. 정말 나갈까요?
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
              계속 학습하기
            </Button>

            <Button
              variant="dangerOutline"
              className="w-full"
              size="lg"
              onClick={() => {
                close();
                router.push("/learn");
              }}
            >
              세션 끝내기
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
