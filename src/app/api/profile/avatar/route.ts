import { getSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/mongodb/connect";
import { Avatar } from "@/models/Avatar";

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  await connectDB();
  // Hydrated doc (not .lean()) so Mongoose casts the BSON binary to a real Buffer —
  // a lean read returns a driver Binary, which serializes to the wrong bytes.
  const doc = await Avatar.findOne({ userId: session.userId });
  if (!doc) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(doc.data), {
    headers: {
      "Content-Type": doc.contentType,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
