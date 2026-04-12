"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Store, ArrowLeft, Mail } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/contexts/language-context";
import {
  merchantSignupFormSchema,
  type MerchantSignupFormInput,
} from "@shared/schema";
import { useMerchantSignupMutation } from "@/hooks/api/merchant/use-merchant";
import { slugifyBusinessNameForMerchantUsername } from "@/lib/merchant-username";

export default function MerchantSignupPage() {
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const { t } = useLanguage();

  const form = useForm<MerchantSignupFormInput>({
    resolver: zodResolver(merchantSignupFormSchema),
    defaultValues: {
      businessName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { control, setValue } = form;
  const businessName = useWatch({ control, name: "businessName" });
  const usernameEditedByUser = useRef(false);

  useEffect(() => {
    if (usernameEditedByUser.current) {
      return;
    }
    const slug = slugifyBusinessNameForMerchantUsername(businessName ?? "");
    setValue("username", slug, { shouldValidate: false });
  }, [businessName, setValue]);

  const signupMutation = useMerchantSignupMutation({
    onSuccess: (_, variables) => {
      setSentEmail(variables.email);
      setEmailSent(true);
    },
  });

  const onSubmit = (data: MerchantSignupFormInput) => {
    signupMutation.mutate({
      businessName: data.businessName,
      username: data.username.trim().toLowerCase(),
      email: data.email,
      password: data.password,
    });
  };

  if (emailSent) {
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
              <h1 className="text-lg font-semibold">
                {t("verify.checkYourEmail")}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="container max-w-md mx-auto p-4 pt-12">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {t("verify.emailSent")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("verify.sentLinkTo")}
            </p>
            <p className="font-medium text-primary mb-6">{sentEmail}</p>
            <p className="text-sm text-muted-foreground">
              {t("verify.clickLink")}
            </p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/merchant">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">
              {t("merchant.becomeMerchant")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-md mx-auto p-4 pt-8">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">
                {t("merchant.createMerchantAccount")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("merchant.startRewarding")}
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("merchant.businessName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("merchant.yourBusinessName")}
                        data-testid="input-business-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.username")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("auth.enterUsername")}
                        autoComplete="username"
                        data-testid="input-username"
                        {...field}
                        onChange={(e) => {
                          usernameEditedByUser.current = true;
                          field.onChange(e);
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {t("merchant.usernameSlugHint")}
                    </p>
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
                        placeholder={t("merchant.youAtBusiness")}
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
                        placeholder={t("merchant.passwordRequirements")}
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

              {signupMutation.error && (
                <p
                  className="text-sm text-destructive"
                  data-testid="text-error"
                >
                  {(signupMutation.error as Error).message ||
                    t("merchant.signupFailed")}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={signupMutation.isPending}
                data-testid="button-signup"
              >
                {signupMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("auth.creatingAccount")}
                  </>
                ) : (
                  t("auth.createAccount")
                )}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("auth.alreadyHaveAccount")}{" "}
            <Link href="/merchant" className="text-primary hover:underline">
              {t("auth.signInLink")}
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
