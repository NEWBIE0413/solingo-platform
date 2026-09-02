"use client";
import { useState } from "react";

import Image from "next/image";
import Link from "next/link";

import { UserButton } from "@/components/auth/user-button";
import Banner from "@/components/banner";
import { Button } from "@/components/ui/button";
import { links } from "@/config";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export const Header = () => {
  const { data: session } = useSession();
  const isSignedIn = !!session;
  const [hideBanner, setHideBanner] = useState(true);

  return (
    <>
      <Banner hide={hideBanner} setHide={setHideBanner} />

      <header
        className={cn(
          "h-20 w-full border-b-2 border-slate-200 px-4",
          !hideBanner ? "mt-20 sm:mt-16 lg:mt-10" : "mt-0"
        )}
      >
        <div className="mx-auto flex h-full items-center justify-between lg:max-w-screen-lg">
          <Link
            href="/"
            prefetch
            className="flex items-center gap-x-3 pb-7 pl-4 pt-8"
          >
            <Image src="/mascot.svg" alt="Mascot" height={40} width={40} />

            <h1 className="text-2xl font-extrabold tracking-wide text-green-600">
              Lingo
            </h1>
          </Link>

          <div className="flex gap-x-3">
            {isSignedIn ? (
              <UserButton compact />
            ) : (
              <Button size="lg" variant="ghost" asChild>
                <Link href="/sign-in" prefetch>
                  Login
                </Link>
              </Button>
            )}

            <Link
              href={links.sourceCode}
              target="_blank"
              rel="noreferrer noopener"
              className={isSignedIn ? "pt-1.5" : "pt-3"}
            >
              <Image
                src="/github.svg"
                alt="Source Code"
                height={20}
                width={20}
              />
            </Link>
          </div>
        </div>
      </header>
    </>
  );
};
