import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { MobileHeader } from "./mobile-header";
import { BottomTabBar } from "./bottom-tab-bar";

export function AppShell({
  children,
  name,
  greeting,
}: {
  children: ReactNode;
  name: string;
  greeting: string;
}) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader name={name} greeting={greeting} />
        <TopBar greeting={greeting} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-8">
          {children}
        </main>
      </div>
      <BottomTabBar />
    </div>
  );
}
