import { Card } from "@/components/ui/card";
import { BrandPanel } from "@/components/auth/brand-panel";
import { ResetForm } from "@/components/auth/reset-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <>
      <BrandPanel slot="lock" />
      <Card className="flex flex-col justify-center">
        <ResetForm token={token ?? ""} />
      </Card>
    </>
  );
}
