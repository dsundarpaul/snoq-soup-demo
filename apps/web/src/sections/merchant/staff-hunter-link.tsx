"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { useMerchantLinkRedeemerHunterMutation } from "@/hooks/api/merchant/use-merchant";

export function StaffHunterLink() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [hunterId, setHunterId] = useState("");

  const linkMutation = useMerchantLinkRedeemerHunterMutation({
    onSuccess: () => {
      toast({
        title: t("staffHunter.linkedToast"),
      });
      setHunterId("");
    },
    onError: (e: Error) => {
      toast({
        title: t("staffHunter.linkFailed"),
        description: e.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={hunterId}
          onChange={(e) => setHunterId(e.target.value.trim())}
          placeholder={t("staffHunter.hunterIdPlaceholder")}
          className="font-mono text-sm h-9"
          data-testid="input-staff-hunter-id"
        />
        <Button
          type="button"
          size="sm"
          className="shrink-0 gap-1"
          disabled={!hunterId || linkMutation.isPending}
          onClick={() => linkMutation.mutate(hunterId)}
          data-testid="button-link-staff-hunter"
        >
          {linkMutation.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <UserPlus className="w-3 h-3" />
          )}
          {t("staffHunter.linkButton")}
        </Button>
      </div>
    </div>
  );
}
