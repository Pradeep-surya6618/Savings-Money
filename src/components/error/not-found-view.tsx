import Image from "next/image";
import Link from "next/link";
import { Home, Lightbulb, Rocket } from "lucide-react";
import { GoBackButton } from "./go-back-button";

/** Full-screen 404. `inside` = dashboard (logged-in) variant, `outside` = public. */
export function NotFoundView({ variant }: { variant: "inside" | "outside" }) {
  const inside = variant === "inside";
  const TipIcon = inside ? Lightbulb : Rocket;
  const image = inside ? "/error/ID-img.png" : "/error/OD-img.png";

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border/60 px-6 py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label="FuFi home">
          <Image
            src="/Icons/FuFi-Logo-Transperent.png"
            alt="FuFi"
            width={44}
            height={44}
            priority
            className="h-11 w-11 object-contain"
          />
          <div className="leading-none">
            <p className="font-display text-xl font-extrabold tracking-tight">
              <span className="text-foreground">Fu</span>
              <span className="text-primary">Fi</span>
            </p>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">Fund Your Future</p>
          </div>
        </Link>
        <Link
          href={inside ? "/" : "/login"}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-card-elevated"
        >
          {inside ? "Back to Dashboard" : "Login"}
        </Link>
      </header>

      {/* Hero — content + illustration; stacks on mobile (illustration on top). */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col-reverse items-center justify-center gap-10 px-6 py-10 lg:grid lg:grid-cols-[1fr_1.1fr] lg:gap-10 lg:px-10">
        <div className="text-center lg:text-left">
          {inside && (
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> 404 — Page Not Found
            </span>
          )}
          <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            {inside ? (
              <>
                Oops! This page took a <span className="text-primary">detour.</span>
              </>
            ) : (
              <>
                Oops! Page <span className="text-primary">Not Found</span>
              </>
            )}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground lg:mx-0">
            {inside
              ? "The page you're looking for doesn't exist, may have been moved, or is temporarily unavailable."
              : "The page you're looking for doesn't exist or has been moved. Let's get you back on track toward your financial future."}
          </p>

          <div className="mx-auto mt-6 flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card-elevated/50 p-3.5 text-left text-sm text-muted-foreground lg:mx-0">
            <TipIcon className="h-5 w-5 shrink-0 text-primary" />
            <span>
              {inside
                ? "Don't worry! Your financial journey is still on track."
                : "Let's get you back on track toward your financial future."}
            </span>
          </div>

          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row lg:justify-start">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-end px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:opacity-90"
            >
              <Home className="h-4 w-4" /> {inside ? "Go to Dashboard" : "Go to Home"}
            </Link>
            <GoBackButton />
          </div>
        </div>

        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="404 — page not found" className="w-full max-w-md object-contain lg:max-w-none" />
        </div>
      </main>
    </div>
  );
}
