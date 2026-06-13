"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast-store";

/** After a successful email login the user is redirected to `/?signedin=1`.
 *  Show a one-time welcome toast, then strip the flag so a refresh won't repeat it. */
export function SignInToast() {
  const router = useRouter();
  const signedin = useSearchParams().get("signedin");
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || signedin !== "1") return;
    fired.current = true;
    toast.success("Welcome back! 👋");
    router.replace("/");
  }, [signedin, router]);

  return null;
}
