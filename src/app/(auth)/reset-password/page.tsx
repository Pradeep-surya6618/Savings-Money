import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/reset-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthShell slot="lock" title="Almost there — set a new password to secure your account.">
      <ResetForm token={token ?? ""} />
    </AuthShell>
  );
}
