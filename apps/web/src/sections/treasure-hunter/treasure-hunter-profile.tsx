"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDeviceId } from "@/hooks/use-device-id";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePickerField } from "@/components/date-picker-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Trophy,
  Ticket,
  ArrowLeft,
  ChevronRight,
  Crown,
  User,
  Mail,
  LogOut,
  Pencil,
  Save,
  X,
  QrCode,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { HUNTER_COUNTRY_CODES as COUNTRY_CODES } from "@/lib/hunter-country-codes";
import {
  useTreasureHunterProfileQuery,
  useTreasureHunterPatchProfileMutation,
  useTreasureHunterLogoutMutation,
} from "@/hooks/api/treasure-hunter/use-treasure-hunter";

export default function ProfilePage() {
  const deviceId = useDeviceId();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editMobileCountryCode, setEditMobileCountryCode] =
    useState("+966_Saudi Arabia");
  const [editMobileNumber, setEditMobileNumber] = useState("");

  const { data: profile, isLoading } = useTreasureHunterProfileQuery(
    deviceId ?? ""
  );

  useEffect(() => {
    if (!deviceId || isLoading) return;
    if (!profile?.email) {
      router.replace(`/login?next=${encodeURIComponent("/profile")}`);
    }
  }, [deviceId, isLoading, profile?.email, router]);

  const updateProfileMutation = useTreasureHunterPatchProfileMutation({
    onSuccess: () => {
      toast({
        title: t("toast.profileUpdated"),
        description: t("toast.detailsSaved"),
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: t("toast.updateFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startEditing = () => {
    if (profile) {
      setEditNickname(String(profile.nickname ?? ""));
      setEditDateOfBirth(String(profile.dateOfBirth ?? ""));
      setEditGender(String(profile.gender ?? ""));
      const cc = String(profile.mobileCountryCode ?? "+966");
      const country = COUNTRY_CODES.find((c) => c.code === cc);
      setEditMobileCountryCode(cc + "_" + (country?.country || "Unknown"));
      setEditMobileNumber(String(profile.mobileNumber ?? ""));
    }
    setIsEditing(true);
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId) return;
    const codeOnly = editMobileCountryCode.split("_")[0];
    updateProfileMutation.mutate({
      nickname: editNickname || undefined,
      dateOfBirth: editDateOfBirth || undefined,
      gender: editGender || undefined,
      mobileCountryCode: codeOnly || undefined,
      mobileNumber: editMobileNumber || undefined,
    });
  };

  const logoutMutation = useTreasureHunterLogoutMutation({
    onSuccess: () => {
      toast({
        title: t("toast.signedOut"),
        description: t("toast.signedOutDesc"),
      });
      window.location.reload();
    },
    onError: () => {
      toast({
        title: t("toast.logoutFailed"),
        description: t("toast.logoutFailedDesc"),
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">{t("nav.profile")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto p-4">
        {!deviceId || isLoading || !profile?.email ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xl font-semibold">
                    {profile?.nickname || t("profile.treasureHunter")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {profile?.totalClaims || 0} {t("profile.claims")} ·{" "}
                    {profile?.totalRedemptions || 0} {t("profile.redeemed")}
                  </p>
                </div>
                {profile?.email && !isEditing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={startEditing}
                    data-testid="button-edit-profile"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>

            {profile?.id ? (
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">
                  {t("profile.hunterId")}
                </p>
                <div className="flex gap-2 mt-1 items-center">
                  <code className="text-sm font-mono flex-1 truncate">
                    {String(profile.id)}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(String(profile.id));
                      toast({ title: t("profile.copyHunterId") });
                    }}
                    data-testid="button-copy-hunter-id"
                  >
                    {t("profile.copyHunterId")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("profile.hunterIdHint")}
                </p>
              </Card>
            ) : null}

            <Link href="/hunter-scan">
              <Card
                className="p-4 hover-elevate cursor-pointer"
                data-testid="link-hunter-scan"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{t("profile.scanToRedeem")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("profile.scanToRedeemDesc")}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
            </Link>

            {isEditing && profile?.email && (
              <Card className="p-4">
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">
                      {t("profile.editProfile")}
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => setIsEditing(false)}
                      data-testid="button-cancel-edit"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editNickname">
                      {t("profile.nickname")}
                    </Label>
                    <Input
                      id="editNickname"
                      placeholder={t("profile.yourHunterName")}
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      data-testid="input-edit-nickname"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editDateOfBirth">
                      {t("profile.dateOfBirth")}
                    </Label>
                    <DatePickerField
                      id="editDateOfBirth"
                      label={t("profile.dateOfBirth")}
                      showLabel={false}
                      value={editDateOfBirth}
                      onChange={setEditDateOfBirth}
                      data-testid="input-edit-date-of-birth"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("profile.gender")}</Label>
                    <Select value={editGender} onValueChange={setEditGender}>
                      <SelectTrigger data-testid="select-edit-gender">
                        <SelectValue placeholder={t("profile.selectGender")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">
                          {t("profile.male")}
                        </SelectItem>
                        <SelectItem value="female">
                          {t("profile.female")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("profile.mobileNumber")}</Label>
                    <div className="flex gap-2">
                      <Select
                        value={editMobileCountryCode}
                        onValueChange={setEditMobileCountryCode}
                      >
                        <SelectTrigger
                          className="w-[140px] shrink-0"
                          data-testid="select-edit-country-code"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_CODES.map((c) => (
                            <SelectItem
                              key={c.country}
                              value={c.code + "_" + c.country}
                            >
                              {c.code} {c.country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="tel"
                        placeholder="5XXXXXXXX"
                        value={editMobileNumber}
                        onChange={(e) =>
                          setEditMobileNumber(e.target.value.replace(/\D/g, ""))
                        }
                        data-testid="input-edit-mobile-number"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {t("profile.saveChanges")}
                      </>
                    )}
                  </Button>
                </form>
              </Card>
            )}

            <div className="space-y-2">
              <Link href="/history">
                <Card
                  className="p-4 hover-elevate cursor-pointer"
                  data-testid="link-history"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center">
                      <Ticket className="w-5 h-5 text-teal" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{t("nav.myVouchers")}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("profile.viewRewards")}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Card>
              </Link>

              <Link href="/leaderboard">
                <Card
                  className="p-4 hover-elevate cursor-pointer"
                  data-testid="link-leaderboard"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{t("nav.leaderboard")}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("profile.seeTopHunters")}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Card>
              </Link>
            </div>

            <Card className="p-4 mt-4 bg-green-500/5 border-green-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">
                      {t("auth.signedInAs")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {profile.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    deviceId && logoutMutation.mutate({ deviceId })
                  }
                  disabled={logoutMutation.isPending}
                  data-testid="button-logout"
                >
                  {logoutMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 mr-1" />
                      {t("nav.logout")}
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
