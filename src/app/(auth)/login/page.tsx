import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell slot="wallet" title="Smart way to manage your salary, savings and future." showFeatures showFooter>
      <LoginForm />
    </AuthShell>
  );
}
