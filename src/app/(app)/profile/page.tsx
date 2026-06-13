import { redirect } from "next/navigation";
import { getProfile } from "@/services/profile";
import { ProfileView } from "@/components/profile/profile-view";

export default async function ProfilePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return <ProfileView profile={profile} />;
}
