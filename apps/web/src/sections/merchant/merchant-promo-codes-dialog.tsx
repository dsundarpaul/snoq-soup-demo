"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tag, Loader2, Upload, FileText, Trash2 } from "lucide-react";
import type { PromoCodesResponse } from "./merchant-dashboard.types";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-teal-500" />
            Partner Promo Codes
          </DialogTitle>
          <DialogDescription>
            Upload codes that will be assigned one-per-user when they claim this
            drop.
          </DialogDescription>
        </DialogHeader>

        {codesQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted rounded-lg p-3 text-center">
                <div
                  className="text-2xl font-bold"
                  data-testid="text-codes-total"
                >
                  {codesQuery.data?.stats?.total || 0}
                </div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 text-center">
                <div
                  className="text-2xl font-bold text-green-600"
                  data-testid="text-codes-available"
                >
                  {codesQuery.data?.stats?.available || 0}
                </div>
                <div className="text-xs text-muted-foreground">Available</div>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                <div
                  className="text-2xl font-bold text-blue-600"
                  data-testid="text-codes-assigned"
                >
                  {codesQuery.data?.stats?.assigned || 0}
                </div>
                <div className="text-xs text-muted-foreground">Assigned</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Add Codes</Label>
              <Textarea
                placeholder="Paste codes here, one per line or comma-separated..."
                value={codesText}
                onChange={(e) => onCodesTextChange(e.target.value)}
                rows={5}
                className="font-mono text-sm"
                data-testid="textarea-promo-codes"
              />
              <div className="flex gap-2">
                <Button
                  onClick={onUploadCodes}
                  disabled={!codesText.trim() || uploadPending}
                  className="flex-1"
                  data-testid="button-upload-codes"
                >
                  {uploadPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload Codes
                </Button>
                <Button
                  variant="outline"
                  className="relative"
                  data-testid="button-import-csv"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Import CSV
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={onImportFile}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </Button>
              </div>
            </div>

            {(codesQuery.data?.codes?.length || 0) > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Code List</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={onDeleteAllCodes}
                    disabled={deletePending}
                    data-testid="button-delete-all-codes"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete All
                  </Button>
                </div>
                <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                  {codesQuery.data?.codes.map((code) => (
                    <div
                      key={code.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <span className="font-mono truncate min-w-0">
                        {code.code}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={
                            code.status === "available"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {code.status}
                        </Badge>
                        {code.status === "available" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            disabled={deletingCodeId === code.id}
                            onClick={() => onDeleteCode(code.id)}
                            data-testid={`button-delete-code-${code.id}`}
                            title="Delete code"
                          >
                            {deletingCodeId === code.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
