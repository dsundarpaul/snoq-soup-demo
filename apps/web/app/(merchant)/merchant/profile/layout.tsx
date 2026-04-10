import { RequireMerchantSession } from "@/components/require-merchant-session";

export default function MerchantProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireMerchantSession>{children}</RequireMerchantSession>;
}
