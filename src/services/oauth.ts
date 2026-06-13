import { connectDB } from "@/lib/mongodb/connect";
import { User } from "@/models/User";
import { Settings } from "@/models/Settings";
import { Savings } from "@/models/Savings";
import { decideOAuthLink, type OAuthProfile, type OAuthProvider } from "@/lib/auth/oauth-link";

/** Resolve (link or create) the user for a verified OAuth profile; returns the userId.
 *  Throws `oauth_unverified_email` for an unverified profile. */
export async function linkOrCreateOAuthUser(profile: OAuthProfile, provider: OAuthProvider): Promise<string> {
  await connectDB();
  const existing = await User.findOne({ email: profile.email });
  const decision = decideOAuthLink(
    profile,
    existing ? { providers: existing.providers ?? [] } : null,
    provider,
  );

  if (decision.action === "reject") throw new Error(`oauth_${decision.reason}`);

  if (existing) {
    if (decision.action === "login" && decision.addProvider) {
      existing.providers = [...new Set([...(existing.providers ?? []), provider])];
      existing.emailVerified = true;
      await existing.save();
    }
    return String(existing._id);
  }

  const user = await User.create({
    email: profile.email,
    name: profile.name.trim() || profile.email.split("@")[0],
    emailVerified: true,
    providers: [provider],
  });
  await Settings.create({ userId: user._id });
  await Savings.create({ userId: user._id });
  return String(user._id);
}
