import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Toaster } from "@/components/ui/toaster";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (session) redirect("/");
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
