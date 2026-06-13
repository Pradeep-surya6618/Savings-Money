import { Card } from "@/components/ui/card";
import { BrandPanel } from "@/components/auth/brand-panel";
import { ForgotForm } from "@/components/auth/forgot-form";

export default function ForgotPasswordPage() {
  return (
    <>
      <BrandPanel slot="lock" />
      <Card className="flex flex-col justify-center">
        <ForgotForm />
      </Card>
    </>
  );
}
