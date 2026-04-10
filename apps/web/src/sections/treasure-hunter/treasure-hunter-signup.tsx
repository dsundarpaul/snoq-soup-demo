"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDeviceId } from "@/hooks/use-device-id";
import { useRedirectIfTreasureHunterLoggedIn } from "@/hooks/use-redirect-if-logged-in";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, UserPlus } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { HUNTER_COUNTRY_CODES } from "@/lib/hunter-country-codes";
import {
  hunterAuthNextQuery,
  safeRelativeNextPath,
} from "@/lib/safe-next-path";
import { TreasureHunterAuthShell } from "@/sections/treasure-hunter/treasure-hunter-auth-shell";
import {
  hunterSignupFormSchema,
  type HunterSignupFormInput,
} from "@/hooks/api/treasure-hunter/treasure-hunter.api-types";
import {
  getHunterNationalNumberBounds,
  hunterMobileLengthHint,
} from "@/lib/hunter-phone-bounds";
import { useTreasureHunterSignupMutation } from "@/hooks/api/treasure-hunter";

function TreasureHunterSignUpForm({
  nextPath,
  loginHref,
}: {
  nextPath: string;
  loginHref: string;
}) {
  const deviceId = useDeviceId();
  const { toast } = useToast();
  const { t } = useLanguage();
  const router = useRouter();

  const form = useForm<HunterSignupFormInput>({
    resolver: zodResolver(hunterSignupFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      nickname: "",
      dateOfBirth: "",
      gender: undefined,
      mobileCountryCode: "+966",
      mobileNumber: "",
    },
  });

  const mobileCountryCode = useWatch({
    control: form.control,
    name: "mobileCountryCode",
  });
  const phoneBounds = getHunterNationalNumberBounds(
    mobileCountryCode ?? "+966"
  );

  const signupMutation = useTreasureHunterSignupMutation({
    onSuccess: () => {
      toast({
        title: t("toast.accountCreated"),
        description: t("toast.syncAcrossDevices"),
      });
      form.reset({
        email: "",
        password: "",
        confirmPassword: "",
        nickname: "",
        dateOfBirth: "",
        gender: undefined,
        mobileCountryCode: "+966",
        mobileNumber: "",
      });
      router.push(nextPath);
    },
    onError: (error: Error) => {
      toast({
        title: t("toast.signupFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: HunterSignupFormInput) => {
    if (!deviceId) return;
    signupMutation.mutate({
      email: data.email,
      password: data.password,
      nickname: data.nickname,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      mobileCountryCode: data.mobileCountryCode,
      mobileNumber: data.mobileNumber,
      deviceId,
    });
  };

  return (
    <Card className="p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="text-center mb-2">
            <h2 className="font-semibold text-lg">{t("auth.createAccount")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("profile.saveProgress")}
            </p>
          </div>

          <FormField
            control={form.control}
            name="nickname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("profile.nickname")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("profile.yourHunterName")}
                    data-testid="input-nickname"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.email")}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    required
                    data-testid="input-email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.password")}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={t("auth.enterPassword")}
                    minLength={8}
                    autoComplete="new-password"
                    data-testid="input-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.confirmPassword")}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={t("auth.confirmPassword")}
                    minLength={8}
                    autoComplete="new-password"
                    data-testid="input-confirm-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("profile.dateOfBirth")}</FormLabel>
                <FormControl>
                  <DatePickerField
                    id="signup-date-of-birth"
                    label={t("profile.dateOfBirth")}
                    showLabel={false}
                    preset="birth-date"
                    value={field.value}
                    onChange={field.onChange}
                    data-testid="input-date-of-birth"
                  />
                </FormControl>
                <FormDescription>{t("profile.dobMinAgeHint")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("profile.gender")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-gender">
                      <SelectValue placeholder={t("profile.selectGender")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">{t("profile.male")}</SelectItem>
                    <SelectItem value="female">
                      {t("profile.female")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label>{t("profile.mobileNumber")}</Label>
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="mobileCountryCode"
                render={({ field }) => (
                  <FormItem className="w-[140px] shrink-0">
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v);
                        const b = getHunterNationalNumberBounds(v);
                        const raw = form
                          .getValues("mobileNumber")
                          .replace(/\D/g, "");
                        if (raw.length > b.max) {
                          form.setValue("mobileNumber", raw.slice(0, b.max));
                        }
                        void form.trigger("mobileNumber");
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-country-code">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HUNTER_COUNTRY_CODES.map((c) => (
                          <SelectItem key={c.country} value={c.code}>
                            {c.code} {c.country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        placeholder={hunterMobileLengthHint(phoneBounds)}
                        maxLength={phoneBounds.max}
                        data-testid="input-mobile-number"
                        {...field}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "");
                          field.onChange(
                            digits.slice(0, phoneBounds.max)
                          );
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("profile.mobileLengthHint", {
                        range: hunterMobileLengthHint(phoneBounds),
                      })}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={signupMutation.isPending}
            data-testid="button-submit-signup"
          >
            {signupMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t("auth.createAccount")
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t("auth.alreadyHaveAccount")}{" "}
            <Link
              href={loginHref}
              className="text-primary hover:underline font-medium"
              data-testid="link-go-login"
            >
              {t("auth.signIn")}
            </Link>
          </p>
        </form>
      </Form>
    </Card>
  );
}

export default function TreasureHunterSignupPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const nextPath = safeRelativeNextPath(searchParams.get("next"));
  const loginHref = `/login${hunterAuthNextQuery(searchParams.get("next"))}`;

  useRedirectIfTreasureHunterLoggedIn(nextPath);

  return (
    <TreasureHunterAuthShell title={t("auth.createAccount")} Icon={UserPlus}>
      <TreasureHunterSignUpForm nextPath={nextPath} loginHref={loginHref} />
    </TreasureHunterAuthShell>
  );
}
