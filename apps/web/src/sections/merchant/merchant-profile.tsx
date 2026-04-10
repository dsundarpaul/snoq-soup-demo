"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MerchantDashboardHeader } from "@/sections/merchant/merchant-dashboard-header";
import { MerchantScannerFab } from "@/sections/merchant/merchant-scanner-fab";
import { MerchantProfileInformationTab } from "@/sections/merchant/merchant-profile/merchant-profile-information-tab";
import { MerchantScannerDetailsTab } from "@/sections/merchant/merchant-profile/merchant-scanner-details-tab";
import { useStaffScannerAssignments } from "@/hooks/api/scanner";
import {
  merchantLogout,
  useMerchantMeQuery,
} from "@/hooks/api/merchant/use-merchant";

export default function MerchantProfilePage() {
  const router = useRouter();
  const scannerAssignments = useStaffScannerAssignments();

  const { data: merchant, isLoading: merchantLoading } = useMerchantMeQuery();

  const handleLogout = async () => {
    await merchantLogout();
    router.push("/merchant");
  };

  if (merchantLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MerchantDashboardHeader merchant={merchant} onLogout={handleLogout} />

      <main className="max-w-5xl mx-auto px-4 py-8 pb-24 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/merchant/dashboard">
              <ArrowLeft className="w-4 h-4" />
              Back to dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">
            Merchant profile
          </h1>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          {/* <TabsList className="mb-6"> */}
          {/* <TabsTrigger value="profile">Profile information</TabsTrigger> */}
          {/* <TabsTrigger value="scanner">Staff Voucher</TabsTrigger> */}
          {/* </TabsList> */}
          <TabsContent value="profile" className="mt-0">
            <MerchantProfileInformationTab merchant={merchant} />
          </TabsContent>
          <TabsContent value="scanner" className="mt-0">
            <MerchantScannerDetailsTab {...scannerAssignments} />
          </TabsContent>
        </Tabs>
      </main>

      <MerchantScannerFab />
    </div>
  );
}
