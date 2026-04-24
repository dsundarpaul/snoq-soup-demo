"use client";

import { useState } from "react";
import Link from "next/link";
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
import { Loader2, Trophy, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/contexts/language-context";
import { APP_NAME } from "@/lib/app-brand";
import {
  merchantForgotPasswordSchema,
  type MerchantForgotPasswordInput,
} from "@/hooks/api/merchant/merchant.api-types";
import { useMerchantForgotPasswordMutation } from "@/hooks/api/merchant/use-merchant";

export default function MerchantForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const { t } = useLanguage();

  const form = useForm<MerchantForgotPasswordInput>({
    resolver: zodResolver(merchantForgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const forgotPasswordMutation = useMerchantForgotPasswordMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const onSubmit = (data: MerchantForgotPasswordInput) => {
    forgotPasswordMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/30">
            <Trophy className="w-10 h-10 text-teal" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">{APP_NAME}</h1>
          <p className="text-muted-foreground mt-2">{t("merchant.portal")}</p>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              {t("auth.forgotPasswordTitle")}
            </CardTitle>
            <CardDescription>{t("auth.resetLinkDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {t("reset.checkEmail")}
                </h3>
                <p className="text-muted-foreground text-sm mb-6">
                  {t("reset.checkEmailDesc")}
                </p>
                <Link href="/merchant">
                  <Button
                    variant="outline"
                    className="gap-2"
                    data-testid="link-back-to-login"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {t("nav.backToLogin")}
                  </Button>
                </Link>
              </div>
            ) : (
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
                        <FormLabel>{t("auth.emailAddress")}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder={t("auth.enterEmail")}
                            {...field}
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {forgotPasswordMutation.isError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                      <p className="text-sm text-destructive">
                        {t("reset.failedToSend")}
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={forgotPasswordMutation.isPending}
                    data-testid="button-submit"
                  >
                    {forgotPasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("auth.sending")}
                      </>
                    ) : (
                      t("auth.sendResetLink")
                    )}
                  </Button>

                  <div className="text-center pt-2">
                    <Link href="/merchant">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        data-testid="link-back-to-login"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        {t("nav.backToLogin")}
                      </Button>
                    </Link>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
