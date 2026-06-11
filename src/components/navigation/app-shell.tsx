import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { MobileHeader } from "./mobile-header";
import { BottomTabBar } from "./bottom-tab-bar";

export function AppShell({
  children,
  greeting,
  name,
}: {
  children: ReactNode;
  greeting: string;
  name: string;
}) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar name={name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader greeting={greeting} name={name} />
        <TopBar greeting={greeting} name={name} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-8">
          {children}
        </main>
      </div>
      <BottomTabBar />
    </div>
  );
}
