import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { MobileHeader } from "./mobile-header";
import { BottomTabBar } from "./bottom-tab-bar";
import { Toaster } from "@/components/ui/toaster";
import { SignInToast } from "@/components/auth/signin-toast";
import { InstallBanner } from "@/components/pwa/install-banner";
import type { NotificationsResult } from "@/services/notifications";
import type { ConversationSummary } from "@/services/assistant";

export function AppShell({
  children,
  greeting,
  name,
  image,
  notifications,
  savingsTotal,
  conversations,
}: {
  children: ReactNode;
  greeting: string;
  name: string;
  image: string | null;
  notifications: NotificationsResult;
  savingsTotal: number;
  conversations: ConversationSummary[];
}) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar conversations={conversations} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader greeting={greeting} name={name} image={image} notifications={notifications} />
        <TopBar greeting={greeting} name={name} image={image} notifications={notifications} savingsTotal={savingsTotal} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-8">
          {children}
        </main>
      </div>
      <BottomTabBar />
      <Toaster />
      <SignInToast />
      <InstallBanner />
    </div>
  );
}
