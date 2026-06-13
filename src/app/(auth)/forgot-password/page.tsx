import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/forgot-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell slot="lock" title="No worries! Reset your password in a few simple steps.">
      <ForgotForm />
    </AuthShell>
  );
}
