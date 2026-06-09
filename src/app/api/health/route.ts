import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user, settings } = await getCurrentUser();
    return NextResponse.json({ ok: true, user, settings });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
