import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (session) redirect("/");
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-2">{children}</div>
    </div>
  );
}
