"use client";

import { useState, useTransition } from "react";

import Image from "next/image";
import { toast } from "sonner";

import { buyItemAction } from "@/actions/economy";
import { Button } from "@/components/ui/button";
import { type ShopItem, SHOP_ITEMS } from "@/lib/economy";

type Owned = Record<string, number>;

const KIND_LABEL: Record<string, string> = { consumable: "소모품", frame: "아바타 테두리", title: "칭호", mascot: "마스코트 스킨" };

export const Items = ({ gems, owned, hasActiveSubscription }: { gems: number; owned: Owned; hasActiveSubscription: boolean }) => {
  const [pending, startTransition] = useTransition();
  const [ownedQty, setOwnedQty] = useState<Owned>(owned);
  const [busy, setBusy] = useState<string | null>(null);

  const onBuy = (key: string) => {
    if (pending) return;
    setBusy(key);
    startTransition(() => {
      buyItemAction(key)
        .then((r) => {
          if (r.ok) {
            setOwnedQty((prev) => ({ ...prev, [key]: ("qty" in r && r.qty) || 1 }));
            toast.success("구매 완료!");
          } else {
            const msg: Record<string, string> = {
              "not-enough-gems": "젬이 부족해요.",
              "max-qty": "이미 최대 개수를 보유하고 있어요.",
              "already-owned": "이미 보유 중이에요.",
            };
            toast.error(msg[r.error ?? ""] ?? "문제가 생겼어요.");
          }
        })
        .catch(() => toast.error("문제가 생겼어요."))
        .finally(() => setBusy(null));
    });
  };

  return (
    <ul className="w-full">
      {SHOP_ITEMS.map((item) => {
        const qty = ownedQty[item.key] ?? owned[item.key] ?? 0;
        const isOwned = item.kind !== "consumable" && qty > 0;
        const maxed = item.kind === "consumable" && qty >= item.maxQty;
        const disabled = pending || busy === item.key || isOwned || maxed || gems < item.gems;
        return (
          <div className="flex w-full items-center gap-x-4 border-t-2 p-4" key={item.key}>
            <ItemIcon item={item} />
            <div className="flex-1">
              <p className="text-base font-bold text-neutral-700 lg:text-xl">{item.name}</p>
              <p className="text-sm text-muted-foreground">
                {("desc" in item ? item.desc : undefined) ?? KIND_LABEL[item.kind]}
                {item.kind === "consumable" && qty > 0 && <span className="ml-2 font-semibold text-sky-600">보유 {qty}</span>}
              </p>
            </div>
            <Button
              onClick={() => onBuy(item.key)}
              disabled={pending || busy === item.key || isOwned || maxed || gems < item.gems}
              variant={isOwned ? "secondary" : "default"}
            >
              {isOwned ? "보유 중" : maxed ? "최대" : (
                <span className="flex items-center gap-1">
                  <Image src="/gem.svg" alt="" height={18} width={18} />
                  {item.gems}
                </span>
              )}
            </Button>
          </div>
        );
      })}
    </ul>
  );
};

const ItemIcon = ({ item }: { item: ShopItem }) => {
  const icon = "icon" in item ? item.icon : undefined;
  if (icon) return <Image src={icon} alt="" height={60} width={60} />;
  if (item.kind === "title") return <div className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-amber-100 text-2xl">🏷️</div>;
  return <div className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-slate-100 text-2xl">🎁</div>;
};
