import { RequireMerchantSession } from "@/components/require-merchant-session";

export default function MerchantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireMerchantSession>{children}</RequireMerchantSession>;
}
