"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerField } from "@/components/date-picker-field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Copy, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { UseStaffScannerAssignmentsResult } from "@/hooks/api/scanner";
import { dateInputToEndOfDayIso } from "@/hooks/api/scanner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STAFF_PHONE_COUNTRY_CONFIG,
  formatStaffPhoneE164,
  isCompleteStaffPhone,
  normalizeStaffPhoneNational,
  type StaffPhoneCountryCode,
} from "@/utils/phone-country";
import { StaffScannerQrThumb } from "./staff-scanner-qr-thumb";
import {
  ScannerAssignmentExpiryDisplay,
  ScannerAssignmentStatusBadge,
} from "./scanner-assignment-expiry-badges";

export function MerchantScannerDetailsTab({
  assignments,
  isLoading,
  createAssignment,
  removeAssignment,
  setAssignmentDisabled,
}: UseStaffScannerAssignmentsResult) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] =
    useState<StaffPhoneCountryCode>("966");
  const [phoneNational, setPhoneNational] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setStaffName("");
    setPhoneCountryCode("966");
    setPhoneNational("");
    setExpiryDate("");
  };

  const handleCreate = async () => {
    if (!staffName.trim()) {
      toast({
        title: "Name required",
        description: "Enter the staff member’s name.",
        variant: "destructive",
      });
      return;
    }
    if (!isCompleteStaffPhone(phoneCountryCode, phoneNational)) {
      const max = STAFF_PHONE_COUNTRY_CONFIG[phoneCountryCode].maxDigits;
      toast({
        title: "Phone incomplete",
        description: `Enter all ${max} digits for ${STAFF_PHONE_COUNTRY_CONFIG[phoneCountryCode].shortLabel}.`,
        variant: "destructive",
      });
      return;
    }
    if (!expiryDate) {
      toast({
        title: "Expiry required",
        description: "Choose when this scanner link should stop working.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const expiresAtIso = dateInputToEndOfDayIso(expiryDate);
      await createAssignment({
        staffName: staffName.trim(),
        staffPhone: formatStaffPhoneE164(phoneCountryCode, phoneNational),
        expiresAtIso,
      });
      toast({
        title: "Scanner assigned",
        description: "Share the link or QR with this staff member.",
      });
      resetForm();
      setDialogOpen(false);
    } catch (e) {
      toast({
        title: "Could not create",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copied" });
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm("Remove this staff scanner assignment?")) return;
    try {
      await removeAssignment(id);
      toast({ title: "Removed" });
    } catch {
      toast({ title: "Remove failed", variant: "destructive" });
    }
  };

  const handleDisabledChange = async (id: string, disabled: boolean) => {
    try {
      await setAssignmentDisabled(id, disabled);
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Staff scanner QR codes</CardTitle>
          <CardDescription>
            Each row is a dedicated scan link for a staff member. When they open
            it on a device, they can scan customer voucher QR codes to redeem
            them—without your merchant dashboard login. Turn off Active to pause
            a voucher QR without deleting the row.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Assign new staff scanner
          </Button>

          {isLoading ? (
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center border rounded-lg bg-muted/20">
              No assignments yet. Create one to generate a QR and link.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[88px]">QR</TableHead>
                    <TableHead>Staff member</TableHead>
                    <TableHead className="min-w-[140px]">Expires</TableHead>
                    <TableHead className="w-[130px]">Status</TableHead>
                    <TableHead className="w-[100px] text-center">
                      Active
                    </TableHead>
                    <TableHead className="w-[72px] text-right">Link</TableHead>
                    <TableHead className="w-[72px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <StaffScannerQrThumb
                          scanUrl={row.scanUrl}
                          size={64}
                          disabled={row.disabled ?? false}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{row.staffName}</div>
                        {row.staffPhone && (
                          <div className="text-xs text-muted-foreground">
                            {row.staffPhone}
                          </div>
                        )}
                        {row.staffEmail && (
                          <div className="text-xs text-muted-foreground">
                            {row.staffEmail}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <ScannerAssignmentExpiryDisplay
                          expiresAtIso={row.expiresAtIso}
                        />
                      </TableCell>
                      <TableCell>
                        <ScannerAssignmentStatusBadge
                          expiresAtIso={row.expiresAtIso}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={!(row.disabled ?? false)}
                            onCheckedChange={(v) =>
                              void handleDisabledChange(row.id, !v)
                            }
                            aria-label={
                              row.disabled ?? false
                                ? "Activate voucher QR"
                                : "Deactivate voucher QR"
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={row.disabled ?? false}
                          onClick={() => void handleCopy(row.scanUrl)}
                          aria-label="Copy scan link"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void handleRemove(row.id)}
                          aria-label="Remove assignment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign staff scanner</DialogTitle>
            <DialogDescription>
              Enter staff name and phone, then an expiry date. A unique scan URL
              and QR code will be generated (mock until your API stores
              assignments).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="staff-name">Staff name</Label>
              <Input
                id="staff-name"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="e.g. Ahmed — Counter A"
                autoComplete="name"
                data-testid="input-staff-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-phone-national">Phone</Label>
              <div className="flex gap-2">
                <Select
                  value={phoneCountryCode}
                  onValueChange={(v) => {
                    const next = v as StaffPhoneCountryCode;
                    setPhoneCountryCode(next);
                    setPhoneNational((prev) =>
                      normalizeStaffPhoneNational(next, prev)
                    );
                  }}
                >
                  <SelectTrigger
                    id="staff-phone-country"
                    className="w-[140px] shrink-0"
                    data-testid="select-staff-phone-country"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="966">
                      {STAFF_PHONE_COUNTRY_CONFIG["966"].label}
                    </SelectItem>
                    <SelectItem value="91">
                      {STAFF_PHONE_COUNTRY_CONFIG["91"].label}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="staff-phone-national"
                  type="tel"
                  inputMode="numeric"
                  className="min-w-0 flex-1"
                  value={phoneNational}
                  maxLength={
                    STAFF_PHONE_COUNTRY_CONFIG[phoneCountryCode].maxDigits
                  }
                  onChange={(e) =>
                    setPhoneNational(
                      normalizeStaffPhoneNational(
                        phoneCountryCode,
                        e.target.value
                      )
                    )
                  }
                  placeholder={
                    phoneCountryCode === "966"
                      ? "5XXXXXXXX (9 digits)"
                      : "XXXXXXXXXX (10 digits)"
                  }
                  autoComplete="tel-national"
                  data-testid="input-staff-phone-national"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                National number only —{" "}
                {STAFF_PHONE_COUNTRY_CONFIG[phoneCountryCode].maxDigits} digits
                for {STAFF_PHONE_COUNTRY_CONFIG[phoneCountryCode].shortLabel}.
              </p>
            </div>
            <div className="space-y-2">
              <DatePickerField
                id="scanner-expiry"
                label="QR / link expiry date"
                preset="future-only"
                value={expiryDate}
                onChange={setExpiryDate}
                data-testid="input-scanner-expiry"
              />
              <p className="text-xs text-muted-foreground">
                Access ends at the end of this day (local time).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Generate link & QR"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
