"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tag } from "lucide-react";
import type { PromoCodesResponse } from "./merchant-dashboard.types";
import { PromoCodesManageBlock } from "@/components/promo-codes-manage-block";
import { useLanguage } from "@/contexts/language-context";

export interface MerchantPromoCodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codesText: string;
  onCodesTextChange: (text: string) => void;
  codesQuery: {
    isLoading: boolean;
    data: PromoCodesResponse | undefined;
  };
  uploadPending: boolean;
  deletePending: boolean;
  deletingCodeId?: string | null;
  onUploadCodes: () => void;
  onDeleteAllCodes: () => void;
  onDeleteCode: (codeId: string) => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function MerchantPromoCodesDialog({
  open,
  onOpenChange,
  codesText,
  onCodesTextChange,
  codesQuery,
  uploadPending,
  deletePending,
  deletingCodeId = null,
  onUploadCodes,
  onDeleteAllCodes,
  onDeleteCode,
  onImportFile,
}: MerchantPromoCodesDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-teal-500" />
            {t("promoCodes.partnerTitle")}
          </DialogTitle>
          <DialogDescription>{t("promoCodes.description")}</DialogDescription>
        </DialogHeader>

        <PromoCodesManageBlock
          variant="merchant"
          isLoading={codesQuery.isLoading}
          data={codesQuery.data}
          codesText={codesText}
          onCodesTextChange={onCodesTextChange}
          uploadPending={uploadPending}
          onUploadCodes={onUploadCodes}
          onImportFile={onImportFile}
          deletePending={deletePending}
          onDeleteAllCodes={onDeleteAllCodes}
          onDeleteCode={onDeleteCode}
          deletingCodeId={deletingCodeId}
        />
      </DialogContent>
    </Dialog>
  );
}
