import { getSession } from "@/lib/auth/session";
import { NotFoundView } from "@/components/error/not-found-view";

/** Global 404. Logged-in users get the dashboard (inside) variant; visitors get the public one. */
export default async function NotFound() {
  const session = await getSession();
  return <NotFoundView variant={session ? "inside" : "outside"} />;
}
