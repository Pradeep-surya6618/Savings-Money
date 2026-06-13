import { NextResponse, type NextRequest } from "next/server";

const AUTH_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];

/** Next 16 proxy (renamed middleware). Optimistic auth gate by cookie presence;
 *  the authoritative check is getCurrentUser() in the (app) layout/pages. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("fufi_session");
  const isAuthPath = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Not logged in (no cookie) and trying to reach a protected route → login.
  if (!hasSession && !isAuthPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // Logged-in users are bounced off the auth pages by the (auth) layout (it checks
  // the real session via getSession), so the proxy does NOT redirect auth paths here
  // — that avoids a redirect loop when a cookie is present but invalid.
  return NextResponse.next();
}

export const config = {
  // Run on everything except API, Next internals, and static assets (so the
  // public/ illustrations + icons load).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
