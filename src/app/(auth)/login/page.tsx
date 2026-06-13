import { Card } from "@/components/ui/card";
import { BrandPanel } from "@/components/auth/brand-panel";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <>
      <BrandPanel slot="wallet" />
      <Card className="flex flex-col justify-center">
        <LoginForm />
      </Card>
    </>
  );
}
