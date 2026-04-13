"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import { VoucherDisplay } from "@/components/voucher-display";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Trophy, Home } from "lucide-react";
import type { Voucher, Drop } from "@shared/schema";
import { useVoucherByMagicTokenQuery } from "@/hooks/api/voucher/use-voucher";
import { mapVoucherMagicDetailToView } from "@/lib/nest-mappers";

interface VoucherData {
  voucher: Voucher;
  drop: Drop;
  businessName: string;
}

export default function VoucherViewPage() {
  const { t } = useLanguage();
  const { token } = useParams<{ token: string }>();

  const rawQuery = useVoucherByMagicTokenQuery(token ?? "");
  const data = useMemo((): VoucherData | undefined => {
    if (!rawQuery.data) return undefined;
    return mapVoucherMagicDetailToView(
      rawQuery.data as Record<string, unknown>
    );
  }, [rawQuery.data]);

  const isLoading = rawQuery.isLoading;
  const error = rawQuery.error;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t("voucher.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                {t("voucher.notFound")}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t("voucher.notFoundDesc")}
              </p>
              <Button className="gap-2" data-testid="button-go-home" asChild>
                <Link href="/">
                  <Home className="w-4 h-4" />
                  {t("nav.goToApp")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto mb-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/30">
            <Trophy className="w-8 h-8 text-teal" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Souq-Snap
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("voucher.yourRewardAwaits")}
          </p>
        </div>
      </div>

      <VoucherDisplay
        voucher={data.voucher}
        drop={data.drop}
        businessName={data.businessName}
      />

      <div className="text-center mt-6">
        <Link href="/" className="text-sm text-primary hover:underline">
          {t("voucher.startYourHunt")}
        </Link>
      </div>
    </div>
  );
}
