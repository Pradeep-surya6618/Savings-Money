import { Card } from "@/components/ui/card";
import { BrandPanel } from "@/components/auth/brand-panel";
import { SignupFlow } from "@/components/auth/signup-flow";

export default function SignupPage() {
  return (
    <>
      <BrandPanel slot="shield" />
      <Card className="flex flex-col justify-center">
        <SignupFlow />
      </Card>
    </>
  );
}
