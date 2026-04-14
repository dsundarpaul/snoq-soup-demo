"use client";

import { useState, useEffect } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
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
import {
  Gift,
  Share2,
  Mail,
  Check,
  Copy,
  ExternalLink,
  Phone,
  Timer,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { Voucher, Drop } from "@shared/schema";
import { useLanguage } from "@/contexts/language-context";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { publicUrls, getPublicSiteUrl } from "@/lib/app-config";
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
  onShare?: () => void;
}

export function VoucherDisplay({ voucher, drop, businessName = "Merchant" }: VoucherDisplayProps) {
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
        `/api/v1/vouchers/${encodeURIComponent(voucher.id)}/promo-code?${qs.toString()}`
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
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  const hasTimer = drop.redemptionType === "timer" && drop.redemptionMinutes;
  const hasWindow =
    drop.redemptionType === "window" && Boolean(drop.redemptionDeadline);
  const hasVoucherExpiresAt = Boolean(voucher.expiresAt);
  const hasTimeLimit = hasVoucherExpiresAt || hasTimer || hasWindow;
  const isExpired = hasTimeLimit && timeRemaining !== null && timeRemaining <= 0;

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
      dialCode.replace(/\D/g, "") +
      nationalNumber.replace(/\D/g, "");
    const message = `Your Souq-Snap voucher is ready! Use this link to view your reward: ${magicLink}`;
    const whatsappUrl = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Card className="p-6 bg-card border-primary/20 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 overflow-hidden">
          {drop.logoUrl ? (
            <img 
              src={drop.logoUrl} 
              alt={drop.name} 
              className="w-full h-full object-cover"
              data-testid="img-merchant-logo"
            />
          ) : (
            <Gift className="w-8 h-8 text-primary" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          {t("voucher.rewardClaimed")}
        </h2>
        <p className="text-muted-foreground mt-1">{drop.name}</p>
      </div>

      <div className="bg-white rounded-xl p-4 mb-6 border-2 border-primary/30">
        {qrCodeUrl ? (
          <img
            src={qrCodeUrl}
            alt="Voucher QR Code"
            className="w-48 h-48 mx-auto"
            data-testid="img-voucher-qr"
          />
        ) : (
          <div className="w-48 h-48 mx-auto bg-muted animate-pulse rounded-lg" />
        )}
        <p className="text-center text-sm text-muted-foreground mt-2 font-mono">
          ID: {voucher.id.slice(0, 8)}...
        </p>
      </div>

      <div className="bg-teal/10 rounded-lg p-4 mb-6 border border-teal/30">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("voucher.rewardValue")}</span>
          <Badge className="bg-teal text-teal-foreground font-semibold">
            {drop.rewardValue}
          </Badge>
        </div>
        {voucher.redeemed && (
          <div className="flex items-center gap-2 mt-2 text-primary">
            <Check className="w-4 h-4" />
            <span className="text-sm">{t("voucher.alreadyRedeemed")}</span>
          </div>
        )}
      </div>

      {drop.termsAndConditions?.trim() ? (
        <Collapsible
          open={termsOpen}
          onOpenChange={setTermsOpen}
          className="mb-6 rounded-lg border border-border"
        >
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="flex w-full items-center justify-between px-4 py-3 h-auto font-medium text-foreground hover:bg-muted/80"
            >
              <span>{t("voucher.termsTitle")}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${
                  termsOpen ? "rotate-180" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-wrap border-t border-border pt-3">
            {drop.termsAndConditions}
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {promoCodeData?.promoCode && (
        <div className="mb-6" data-testid="section-partner-code">
          <p className="text-sm font-medium text-muted-foreground mb-2 text-center">
            {t("voucher.partnerCode")}
          </p>
          <div className="border-2 border-dashed border-primary/40 rounded-lg p-4 flex flex-col items-center gap-3">
            <span
              className="text-2xl font-bold font-mono tracking-widest text-foreground"
              data-testid="text-partner-code"
            >
              {promoCodeData.promoCode}
            </span>
            <Button
              onClick={handleCopyCode}
              variant="outline"
              className="gap-2"
              data-testid="button-copy-code"
            >
              {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {codeCopied ? t("voucher.codeCopied") : t("voucher.copyCode")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {t("voucher.useInPartnerApp")}
          </p>
        </div>
      )}

      {hasTimeLimit && !voucher.redeemed && (
        <div className={`rounded-lg p-4 mb-6 border ${isExpired ? 'bg-destructive/10 border-destructive/30' : hasTimer ? 'bg-primary/10 border-primary/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <div className="flex items-center gap-3">
            {isExpired ? (
              <AlertTriangle className="w-6 h-6 text-destructive" />
            ) : hasTimer ? (
              <Timer className="w-6 h-6 text-primary animate-pulse" />
            ) : (
              <Timer className="w-6 h-6 text-amber-500" />
            )}
            <div className="flex-1">
              <p className={`font-semibold ${isExpired ? 'text-destructive' : 'text-foreground'}`}>
                {isExpired ? t("voucher.voucherExpired") : hasTimer ? t("voucher.timeRemaining") : t("voucher.timeUntilDeadline")}
              </p>
              <p className={`text-2xl font-mono font-bold ${isExpired ? 'text-destructive' : hasTimer ? 'text-primary' : 'text-amber-600'}`}>
                {timeRemaining !== null ? formatTimeRemaining(timeRemaining, t("status.expired")) : `${t("common.loading")}`}
              </p>
              {hasWindow && !isExpired && drop.redemptionDeadline && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t("voucher.deadline")}:{" "}
                  {new Date(drop.redemptionDeadline).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          {!isExpired && (
            <p className="text-xs text-muted-foreground mt-2">
              {hasTimer 
                ? t("voucher.redeemBeforeTimer") 
                : t("voucher.redeemBeforeDeadline")}
            </p>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm text-muted-foreground">
            {t("voucher.sendToEmail")}
          </Label>
          <div className="flex gap-2">
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              disabled={emailSent || emailSending}
              data-testid="input-email"
            />
            <Button
              onClick={handleEmailSend}
              disabled={!emailValid || emailSending || emailSent}
              size="icon"
              variant={emailSent ? "default" : "outline"}
              data-testid="button-send-email"
            >
              {emailSent ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
            </Button>
          </div>
          {email.trim().length > 0 && !emailValid && (
            <p className="text-xs text-destructive">{t("voucher.invalidEmail")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone-national" className="text-sm text-muted-foreground">
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
                className="h-10 w-[118px] shrink-0"
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
              placeholder={`${t("voucher.phoneNational")} (${hunterMobileLengthHint(phoneBounds)})`}
              value={nationalNumber}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setNationalNumber(digits.slice(0, phoneBounds.max));
              }}
              className="flex-1 min-w-[140px]"
              data-testid="input-phone-national"
            />
            <Button
              onClick={handleWhatsAppSave}
              disabled={!phoneValid}
              size="icon"
              className="bg-[#25D366] hover:bg-[#25D366]/90 shrink-0"
              data-testid="button-whatsapp-save"
            >
              <Phone className="w-4 h-4 text-white" />
            </Button>
          </div>
          {nationalNumber.length > 0 && !phoneValid && (
            <p className="text-xs text-destructive">{t("voucher.phoneInvalid")}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            onClick={handleCopy}
            variant="outline"
            className="gap-2"
            data-testid="button-copy-link"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? t("voucher.copied") : t("voucher.copyLink")}
          </Button>

          <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer">
            <Button
              className="w-full bg-[#25D366] hover:bg-[#25D366]/90 gap-2"
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
            className="w-full gap-2 text-muted-foreground"
            data-testid="button-open-magic-link"
          >
            <ExternalLink className="w-4 h-4" />
            {t("voucher.openMagicLink")}
          </Button>
        </a>
      </div>
    </Card>
  );
}
