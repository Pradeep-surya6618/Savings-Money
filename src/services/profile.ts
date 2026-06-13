import { connectDB } from "@/lib/mongodb/connect";
import { getSession } from "@/lib/auth/session";
import { User } from "@/models/User";

export type ProfileData = {
  name: string;
  email: string;
  dateOfBirth: string | null; // yyyy-mm-dd
  bio: string;
  imageUrl: string | null;
  hasAvatar: boolean; // true only for an uploaded avatar (not an OAuth photo)
};

export async function getProfile(): Promise<ProfileData | null> {
  const session = await getSession();
  if (!session) return null;
  await connectDB();
  const u = await User.findById(session.userId).lean();
  if (!u) return null;
  const updatedAt = u.avatarUpdatedAt ? new Date(u.avatarUpdatedAt) : null;
  return {
    name: u.name,
    email: u.email,
    dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth).toISOString().slice(0, 10) : null,
    bio: u.bio ?? "",
    imageUrl: updatedAt ? `/api/profile/avatar?v=${updatedAt.getTime()}` : (u.image ?? null),
    hasAvatar: Boolean(updatedAt),
  };
}
