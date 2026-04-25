"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Mail } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/contexts/language-context";
import {
  merchantLoginSchema,
  type MerchantLoginInput,
  type Merchant,
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  useMerchantLoginMutation,
  useMerchantResendVerificationMutation,
} from "@/hooks/api/merchant/use-merchant";
import { useRedirectIfMerchantLoggedIn } from "@/hooks/use-redirect-if-merchant-logged-in";
import { clearSessionsExcept } from "@/lib/auth-session";
import { APP_NAME, appLogo } from "@/lib/app-brand";

export default function MerchantLoginPage() {
  useRedirectIfMerchantLoggedIn();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showResendOption, setShowResendOption] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();

  const form = useForm<MerchantLoginInput>({
    resolver: zodResolver(merchantLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMerchantLoginMutation({
    onSuccess: (merchant: Merchant) => {
      if (!merchant.emailVerified) {
        toast({
          title: t("toast.verifyEmailToContinue"),
          description: t("toast.verifyEmailToContinueDesc"),
        });
        setShowResendOption(true);
        setResendEmail(merchant.email);
        return;
      }
      toast({
        title: t("toast.welcomeBack"),
        description: t("toast.merchantPortalReady"),
      });
      router.push("/merchant/dashboard");
    },
    onError: (error: Error) => {
      setError(error.message);
      if (error.message.toLowerCase().includes("verify")) {
        setShowResendOption(true);
        setResendEmail(form.getValues("email").trim());
      }
    },
  });

  const resendMutation = useMerchantResendVerificationMutation({
    onSuccess: () => {
      toast({
        title: t("toast.verificationEmailSent"),
        description: t("toast.checkInbox"),
      });
      setShowResendOption(false);
      setResendEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: t("toast.failedToSendEmail"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MerchantLoginInput) => {
    setError(null);
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex justify-center">
            <img
              src={appLogo.src}
              alt={APP_NAME}
              width={appLogo.width}
              height={appLogo.height}
              className="h-16 w-auto max-w-[min(280px,85vw)] object-contain"
            />
          </div>
          {/* <h1 className="text-3xl font-bold text-foreground">{APP_NAME}</h1> */}
          <p className="text-muted-foreground mt-2">{t("merchant.portal")}</p>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              {t("merchant.login")}
            </CardTitle>
            <CardDescription>{t("merchant.loginDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
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
                          {...field}
                          data-testid="input-email"
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
                      <div className="flex items-center justify-between">
                        <FormLabel>{t("auth.password")}</FormLabel>
                        <Link
                          href="/merchant/forgot-password"
                          className="text-sm text-primary hover:underline"
                          data-testid="link-forgot-password"
                        >
                          {t("auth.forgotPassword")}
                        </Link>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t("auth.enterPassword")}
                          {...field}
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {showResendOption && (
                  <div className="p-4 rounded-lg bg-muted border border-border">
                    <p className="text-sm text-muted-foreground mb-3">
                      {t("auth.needVerification")}
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder={t("merchant.youAtBusiness")}
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        data-testid="input-resend-email"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          resendMutation.mutate({ email: resendEmail })
                        }
                        disabled={!resendEmail || resendMutation.isPending}
                        data-testid="button-resend-verification"
                      >
                        {resendMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("auth.signingIn")}
                    </>
                  ) : (
                    t("auth.signIn")
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                {t("merchant.newToSouqSnap")}{" "}
                <Link
                  href="/merchant/signup"
                  className="text-primary hover:underline font-medium"
                >
                  {t("merchant.createAccount")}
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                {t("merchant.notMerchantLoginAsUser")}{" "}
                <Link
                  href="/login"
                  className="text-primary hover:underline font-medium"
                  data-testid="link-login-as-user"
                  onClick={() => clearSessionsExcept("hunter")}
                >
                  {t("merchant.loginAsUserLink")}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link href="/" className="text-primary hover:underline">
            {t("nav.backToApp")}
          </Link>
        </p>
      </div>
    </div>
  );
}
