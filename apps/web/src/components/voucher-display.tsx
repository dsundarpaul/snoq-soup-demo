"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Gift,
  Mail,
  Check,
  Copy,
  ExternalLink,
  Phone,
  Clock,
  Timer,
  AlertTriangle,
  ChevronDown,
  MapPin,
  Store,
  Trophy,
  QrCode,
  FileText,
  Sparkles,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { Voucher, Drop } from "@shared/schema";
import { useLanguage } from "@/contexts/language-context";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { publicUrls, getPublicSiteUrl } from "@/lib/app-config";
import { APP_NAME } from "@/lib/app-brand";
import {
  apiFetch,
  apiFetchMaybeRetry,
  throwIfResNotOk,
} from "@/lib/api-client";
import {
  PHONE_DIAL_CODE_CHOICES,
  getHunterNationalNumberBounds,
  hunterMobileLengthHint,
} from "@/lib/hunter-phone-bounds";
import { cn } from "@/lib/utils";

function InfoTile({
  icon: Icon,
  label,
  children,
  valueTone = "default",
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  valueTone?: "default" | "destructive" | "amber";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-gradient-to-br from-muted/40 to-muted/10 p-3.5 flex gap-3 min-h-[4.25rem] shadow-sm"
      )}
    >
      <div className="shrink-0 w-10 h-10 rounded-lg bg-background/90 border border-border/50 flex items-center justify-center shadow-sm">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div
          className={cn(
            "text-sm font-medium leading-snug",
            valueTone === "destructive" && "text-destructive",
            valueTone === "amber" && "text-amber-600 dark:text-amber-400",
            valueTone === "default" && "text-foreground"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function isValidVoucherEmail(value: string): boolean {
  const s = value.trim();
  return s.length > 4 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function formatTimeRemaining(seconds: number, expiredLabel: string): string {
  if (seconds <= 0) return expiredLabel;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

interface VoucherDisplayProps {
  voucher: Voucher;
  drop: Drop;
  businessName?: string;
  merchantStoreLocation?: {
    lat: number;
    lng: number;
    address?: string;
    landmark?: string;
    howToReach?: string;
  } | null;
  merchantBusinessPhone?: string | null;
  merchantBusinessHours?: string | null;
  onShare?: () => void;
  layout?: "default" | "dialog";
}

export function VoucherDisplay({
  voucher,
  drop,
  businessName = "Merchant",
  merchantStoreLocation,
  merchantBusinessPhone,
  merchantBusinessHours,
  layout = "default",
}: VoucherDisplayProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const { data: promoCodeData } = useQuery<{ promoCode: string | null }>({
    queryKey: [
      "/api/v1/vouchers",
      voucher.id,
      "promo-code",
      voucher.magicToken,
    ],
    queryFn: async () => {
      const qs = new URLSearchParams({
        magicToken: voucher.magicToken,
      });
      const res = await apiFetch(
        "GET",
        `/api/v1/vouchers/${encodeURIComponent(
          voucher.id
        )}/promo-code?${qs.toString()}`
      );
      await throwIfResNotOk(res);
      return res.json() as Promise<{ promoCode: string | null }>;
    },
    enabled: Boolean(voucher.magicToken),
  });

  const handleCopyCode = async () => {
    if (!promoCodeData?.promoCode) return;
    try {
      await navigator.clipboard.writeText(promoCodeData.promoCode);
      setCodeCopied(true);
      toast({ title: t("voucher.codeCopied") });
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  };
  const [email, setEmail] = useState("");
  const [dialCode, setDialCode] = useState("+966");
  const [nationalNumber, setNationalNumber] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);

  const appUrl = getPublicSiteUrl();
  const magicLink = publicUrls.voucher(voucher.magicToken);
  const shareMessage = `I just caught a reward at ${businessName}! Join the hunt here: ${appUrl}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    shareMessage
  )}`;

  const hasTimer = drop.redemptionType === "timer" && drop.redemptionMinutes;
  const hasWindow =
    drop.redemptionType === "window" && Boolean(drop.redemptionDeadline);
  const hasVoucherExpiresAt = Boolean(voucher.expiresAt);
  const hasTimeLimit = hasVoucherExpiresAt || hasTimer || hasWindow;
  const isExpired =
    hasTimeLimit && timeRemaining !== null && timeRemaining <= 0;

  useEffect(() => {
    const voucherExpiryMs = voucher.expiresAt
      ? new Date(voucher.expiresAt).getTime()
      : NaN;
    if (!Number.isNaN(voucherExpiryMs)) {
      const calculateTimeRemaining = () => {
        const remaining = Math.max(
          0,
          Math.floor((voucherExpiryMs - Date.now()) / 1000)
        );
        setTimeRemaining(remaining);
      };
      calculateTimeRemaining();
      const interval = setInterval(calculateTimeRemaining, 1000);
      return () => clearInterval(interval);
    }

    if (!hasTimer && !hasWindow) return;

    const calculateTimeRemaining = () => {
      let expiryTime: number;

      if (hasTimer && voucher.claimedAt) {
        const claimedTime = new Date(voucher.claimedAt).getTime();
        expiryTime = claimedTime + drop.redemptionMinutes! * 60 * 1000;
      } else if (hasWindow && drop.redemptionDeadline) {
        expiryTime = new Date(drop.redemptionDeadline).getTime();
      } else {
        return;
      }

      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setTimeRemaining(remaining);
    };

    calculateTimeRemaining();
    const intervalMs = hasTimer ? 1000 : 60000;
    const interval = setInterval(calculateTimeRemaining, intervalMs);
    return () => clearInterval(interval);
  }, [
    hasTimer,
    hasWindow,
    voucher.claimedAt,
    voucher.expiresAt,
    drop.redemptionMinutes,
    drop.redemptionDeadline,
  ]);

  useEffect(() => {
    const generateQR = async () => {
      try {
        const QRCode = await import("qrcode");
        const qrPayload = `${voucher.id}|${voucher.magicToken}`;
        const url = await QRCode.toDataURL(qrPayload, {
          width: 200,
          margin: 2,
          color: {
            dark: "#7C3AED",
            light: "#FFFFFF",
          },
        });
        setQrCodeUrl(url);
      } catch (error) {
        console.error("Failed to generate QR code:", error);
      }
    };

    generateQR();
  }, [voucher.id, voucher.magicToken]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(magicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const phoneBounds = getHunterNationalNumberBounds(dialCode);
  const phoneValid =
    nationalNumber.length >= phoneBounds.min &&
    nationalNumber.length <= phoneBounds.max;
  const emailValid = isValidVoucherEmail(email);

  const handleEmailSend = async () => {
    if (!emailValid || !voucher.magicToken) return;

    setEmailSending(true);
    try {
      const response = await apiFetchMaybeRetry(
        "POST",
        "/api/v1/vouchers/send-email",
        {
          body: {
            voucherId: voucher.id,
            email: email.trim(),
            magicToken: voucher.magicToken,
            magicLink,
          },
        }
      );
      await throwIfResNotOk(response, "/api/v1/vouchers/send-email");
      setEmailSent(true);
      toast({ title: t("voucher.emailSendSuccess") });
    } catch (error) {
      console.error("Failed to send email:", error);
      toast({
        title: t("voucher.emailSendError"),
        variant: "destructive",
      });
    } finally {
      setEmailSending(false);
    }
  };

  const handleWhatsAppSave = () => {
    if (!phoneValid) {
      toast({
        title: t("voucher.phoneInvalid"),
        variant: "destructive",
      });
      return;
    }
    const digits =
      dialCode.replace(/\D/g, "") + nationalNumber.replace(/\D/g, "");
    const message = `Your ${APP_NAME} voucher is ready! Use this link to view your reward: ${magicLink}`;
    const whatsappUrl = `https://wa.me/${digits}?text=${encodeURIComponent(
      message
    )}`;
    window.open(whatsappUrl, "_blank");
  };

  const showMerchantBlock =
    merchantBusinessPhone || merchantBusinessHours || merchantStoreLocation;

  const shellClass = cn(
    "flex w-full flex-col overflow-hidden bg-card",
    layout === "dialog"
      ? "min-h-0 flex-1 h-full"
      : "max-w-lg mx-auto rounded-xl border border-border/60 shadow-sm"
  );

  const bodyClass = cn(
    "px-6 py-5 space-y-6",
    layout === "dialog" && "flex-1 min-h-0 overflow-y-auto"
  );

  return (
    <div className={shellClass} data-testid="voucher-display-root">
      {layout === "dialog" ? (
        <p className="sr-only">{t("voucher.rewardClaimed")}</p>
      ) : null}

      <div className="relative shrink-0 bg-gradient-to-br from-primary/20 via-primary/8 to-teal/10 px-6 pt-8 pb-6 border-b border-border/60">
        <div className="flex gap-4 items-start">
          {drop.logoUrl ? (
            <img
              src={drop.logoUrl}
              alt=""
              className="w-16 h-16 rounded-xl object-cover bg-background border border-border/50 shadow-md shrink-0"
              data-testid="img-merchant-logo"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 shadow-inner">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <h2 className="text-xl font-semibold text-foreground leading-tight pr-2">
              {t("voucher.rewardClaimed")}
            </h2>
            <p className="text-sm text-muted-foreground leading-snug">
              {drop.name}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-teal/15 text-teal border-teal/25 hover:bg-teal/20 gap-1 font-medium">
                <Gift className="w-3.5 h-3.5" />
                {drop.rewardValue}
              </Badge>
              {voucher.redeemed ? (
                <Badge
                  variant="secondary"
                  className="gap-1 border border-primary/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  {t("voucher.alreadyRedeemed")}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className={bodyClass}>
        {drop.description.trim() ? (
          <div data-testid="section-drop-description">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              {t("voucher.dropDescription")}
            </h4>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
              {drop.description}
            </p>
          </div>
        ) : null}

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <QrCode className="w-3.5 h-3.5" />
            {t("voucher.voucherId")}
          </h4>
          <div className="rounded-xl border border-border/70 bg-gradient-to-br from-muted/35 to-muted/10 p-5 shadow-inner flex flex-col items-center">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt=""
                className="w-48 h-48 rounded-lg border border-border/50 bg-background shadow-sm"
                data-testid="img-voucher-qr"
              />
            ) : (
              <div className="w-48 h-48 mx-auto bg-muted/80 animate-pulse rounded-lg border border-border/40" />
            )}
            {/* <p className="text-center text-xs text-muted-foreground mt-3 font-mono tracking-tight">
              ID: {voucher.id.slice(0, 8)}…
            </p> */}
          </div>
        </div>
        {hasTimeLimit && !voucher.redeemed ? (
          <div
            className={cn(
              "rounded-xl border p-4 shadow-sm flex gap-3",
              isExpired
                ? "bg-destructive/10 border-destructive/25"
                : hasTimer
                ? "bg-primary/8 border-primary/25"
                : "bg-amber-500/8 border-amber-500/25"
            )}
          >
            {isExpired ? (
              <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
            ) : hasTimer ? (
              <Timer className="w-6 h-6 text-primary shrink-0 mt-0.5 animate-pulse" />
            ) : (
              <Timer className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-semibold",
                  isExpired ? "text-destructive" : "text-foreground"
                )}
              >
                {isExpired
                  ? t("voucher.voucherExpired")
                  : hasTimer
                  ? t("voucher.timeRemaining")
                  : t("voucher.timeUntilDeadline")}
              </p>
              <p
                className={cn(
                  "text-2xl font-mono font-bold mt-1",
                  isExpired
                    ? "text-destructive"
                    : hasTimer
                    ? "text-primary"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                {timeRemaining !== null
                  ? formatTimeRemaining(timeRemaining, t("status.expired"))
                  : t("common.loading")}
              </p>
              {hasWindow && !isExpired && drop.redemptionDeadline ? (
                <p className="text-xs text-muted-foreground mt-2">
                  {t("voucher.deadline")}:{" "}
                  {new Date(drop.redemptionDeadline).toLocaleString()}
                </p>
              ) : null}
              {!isExpired ? (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {hasTimer
                    ? t("voucher.redeemBeforeTimer")
                    : t("voucher.redeemBeforeDeadline")}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {showMerchantBlock ? (
          <div
            className="rounded-xl border border-border/70 bg-gradient-to-br from-primary/[0.07] via-muted/25 to-teal/[0.06] p-4 sm:p-5 shadow-sm space-y-4"
            data-testid="section-way-to-redeem"
          >
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <Store className="w-3.5 h-3.5 shrink-0 text-primary" />
                {t("voucher.wayToRedeem")}
              </h4>
              {businessName.trim() ? (
                <p className="text-lg font-semibold text-foreground leading-snug text-left">
                  {businessName}
                </p>
              ) : null}
            </div>

            {merchantBusinessPhone || merchantBusinessHours ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {merchantBusinessPhone ? (
                  <InfoTile icon={Phone} label={t("voucher.storePhone")}>
                    <a
                      href={`tel:${merchantBusinessPhone.replace(/\s/g, "")}`}
                      className="text-primary hover:underline break-all"
                    >
                      {merchantBusinessPhone}
                    </a>
                  </InfoTile>
                ) : null}
                {merchantBusinessHours ? (
                  <InfoTile icon={Clock} label={t("voucher.storeHours")}>
                    {merchantBusinessHours}
                  </InfoTile>
                ) : null}
              </div>
            ) : null}

            {merchantStoreLocation ? (
              <div className="space-y-3 pt-1 border-t border-border/50">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${merchantStoreLocation.lat},${merchantStoreLocation.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button
                    className="w-full justify-start gap-3 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                    data-testid="button-get-directions"
                  >
                    <MapPin className="w-4 h-4 shrink-0 opacity-90" />
                    <span className="text-left flex-1 min-w-0 font-medium leading-snug">
                      {t("voucher.getDirections")}
                    </span>
                    <ExternalLink className="w-4 h-4 shrink-0 opacity-80 ml-auto" />
                  </Button>
                </a>
                {merchantStoreLocation.address ? (
                  <div className="flex items-start gap-3 rounded-xl border border-dashed border-primary/25 bg-background/60 px-3.5 py-3 text-sm text-foreground">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                    <span className="leading-relaxed text-left min-w-0">
                      {merchantStoreLocation.address}
                    </span>
                  </div>
                ) : null}
                {merchantStoreLocation.landmark ? (
                  <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/25 px-3.5 py-3 text-sm">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0 pt-0.5 w-20 sm:w-24">
                      {t("voucher.landmark")}
                    </span>
                    <span className="text-foreground/90 leading-relaxed text-left min-w-0 flex-1">
                      {merchantStoreLocation.landmark}
                    </span>
                  </div>
                ) : null}
                {merchantStoreLocation.howToReach ? (
                  <div className="rounded-xl border border-border/50 bg-muted/20 px-3.5 py-3 text-sm text-foreground/90 leading-relaxed text-left">
                    {merchantStoreLocation.howToReach}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {drop.termsAndConditions?.trim() ? (
          <Collapsible
            open={termsOpen}
            onOpenChange={setTermsOpen}
            className="rounded-xl border border-border/70 overflow-hidden shadow-sm"
          >
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="flex w-full items-center justify-between px-4 py-3.5 h-auto font-medium text-foreground hover:bg-muted/60 rounded-none"
              >
                <span className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-primary" />
                  {t("voucher.termsTitle")}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform text-muted-foreground",
                    termsOpen && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-border/60">
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap px-4 py-3 border-l-4 border-primary/40 bg-muted/25">
                {drop.termsAndConditions}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : null}

        {promoCodeData?.promoCode ? (
          <div data-testid="section-partner-code">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              {t("voucher.partnerCode")}
            </h4>
            <div className="rounded-xl border-2 border-dashed border-primary/35 bg-muted/20 p-5 flex flex-col items-center gap-4 shadow-sm">
              <span
                className="text-2xl font-bold font-mono tracking-widest text-foreground"
                data-testid="text-partner-code"
              >
                {promoCodeData.promoCode}
              </span>
              <Button
                onClick={handleCopyCode}
                variant="outline"
                className="gap-2 shadow-sm"
                data-testid="button-copy-code"
              >
                {codeCopied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {codeCopied ? t("voucher.codeCopied") : t("voucher.copyCode")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2 leading-relaxed">
              {t("voucher.useInPartnerApp")}
            </p>
          </div>
        ) : null}

        <Separator className="bg-border/60" />

        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" />
            {t("voucher.sendToEmail")}
          </h4>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-background/80 border-border/70"
                disabled={emailSent || emailSending}
                data-testid="input-email"
              />
              <Button
                onClick={handleEmailSend}
                disabled={!emailValid || emailSending || emailSent}
                size="icon"
                variant={emailSent ? "default" : "outline"}
                className="shrink-0 shadow-sm"
                data-testid="button-send-email"
              >
                {emailSent ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
              </Button>
            </div>
            {email.trim().length > 0 && !emailValid ? (
              <p className="text-xs text-destructive">
                {t("voucher.invalidEmail")}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="phone-national"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t("voucher.saveViaWhatsApp")}
            </Label>
            <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
              <Select
                value={dialCode}
                onValueChange={(v) => {
                  setDialCode(v);
                  setNationalNumber("");
                }}
              >
                <SelectTrigger
                  className="h-10 w-[118px] shrink-0 bg-background/80 border-border/70"
                  aria-label={t("voucher.countryCode")}
                  data-testid="select-phone-dial"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {PHONE_DIAL_CODE_CHOICES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="phone-national"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder={`${t(
                  "voucher.phoneNational"
                )} (${hunterMobileLengthHint(phoneBounds)})`}
                value={nationalNumber}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  setNationalNumber(digits.slice(0, phoneBounds.max));
                }}
                className="flex-1 min-w-[140px] bg-background/80 border-border/70"
                data-testid="input-phone-national"
              />
              <Button
                onClick={handleWhatsAppSave}
                disabled={!phoneValid}
                size="icon"
                className="bg-[#25D366] hover:bg-[#25D366]/90 shrink-0 shadow-sm"
                data-testid="button-whatsapp-save"
              >
                <SiWhatsapp className="w-4 h-4 text-white" />
              </Button>
            </div>
            {nationalNumber.length > 0 && !phoneValid ? (
              <p className="text-xs text-destructive">
                {t("voucher.phoneInvalid")}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="shrink-0 flex flex-col gap-2 border-t border-border/60 p-4 bg-muted/15">
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleCopy}
            variant="outline"
            className="gap-2 shadow-sm"
            data-testid="button-copy-link"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? t("voucher.copied") : t("voucher.copyLink")}
          </Button>
          <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer">
            <Button
              className="w-full bg-[#25D366] hover:bg-[#25D366]/90 gap-2 shadow-sm"
              data-testid="button-share-whatsapp"
            >
              <SiWhatsapp className="w-4 h-4" />
              {t("voucher.share")}
            </Button>
          </a>
        </div>
        <a
          href={magicLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Button
            variant="ghost"
            className="w-full gap-2 text-muted-foreground hover:text-foreground"
            data-testid="button-open-magic-link"
          >
            <ExternalLink className="w-4 h-4" />
            {t("voucher.openMagicLink")}
          </Button>
        </a>
      </div>
    </div>
  );
}
