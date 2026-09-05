import type { PropsWithChildren } from "react";

import { BottomNav } from "@/components/bottom-nav";
import { MobileHeader } from "@/components/mobile-header";
import { Sidebar } from "@/components/sidebar";

const MainLayout = ({ children }: PropsWithChildren) => {
  return (
    <>
      <MobileHeader />
      <Sidebar className="hidden lg:flex" />
      <main className="h-full pt-[50px] pb-[calc(58px+env(safe-area-inset-bottom))] lg:pl-[256px] lg:pb-0 lg:pt-0">
        <div className="mx-auto h-full max-w-[1056px] pt-6">{children}</div>
      </main>
      <BottomNav />
    </>
  );
};

export default MainLayout;
