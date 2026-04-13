"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import { Loader2, Trophy, Lock, ArrowLeft, CheckCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/contexts/language-context";
import {
  treasureHunterResetPasswordSchema,
  type TreasureHunterResetPasswordInput,
} from "@/hooks/api/treasure-hunter/treasure-hunter.api-types";
import { useTreasureHunterResetPasswordMutation } from "@/hooks/api/treasure-hunter/use-treasure-hunter";

export default function TreasureHunterResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params.token === "string" ? params.token : undefined;
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  const form = useForm<TreasureHunterResetPasswordInput>({
    resolver: zodResolver(treasureHunterResetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const resetPasswordMutation = useTreasureHunterResetPasswordMutation(
    token || ""
  );

  const onSubmit = (data: TreasureHunterResetPasswordInput) => {
    setError(null);
    if (!token) return;
    resetPasswordMutation.mutate(
      { password: data.password },
      {
        onSuccess: () => {
          setSuccess(true);
          setError(null);
        },
        onError: (error: Error) => {
          setError(error.message);
        },
      }
    );
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {t("reset.invalidLink")}
                </h3>
                <p className="text-muted-foreground text-sm mb-6">
                  {t("reset.invalidLinkDesc")}
                </p>
                <Link href="/forgot-password">
                  <Button
                    className="gap-2"
                    data-testid="button-request-new-link"
                  >
                    {t("reset.requestNewLink")}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-foreground">
            Souq-Snap
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("profile.treasureHunter")}
          </p>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              {t("auth.resetPassword")}
            </CardTitle>
            <CardDescription>{t("auth.enterYourNewPassword")}</CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {t("reset.success")}
                </h3>
                <p className="text-muted-foreground text-sm mb-6">
                  {t("reset.successDesc")}
                </p>
                <Link href="/login">
                  <Button className="gap-2" data-testid="button-go-to-profile">
                    {t("nav.goToProfile")}
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
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("auth.newPassword")}</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={t("auth.enterNewPassword")}
                            {...field}
                            data-testid="input-password"
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
                            placeholder={t("auth.confirmNewPassword")}
                            {...field}
                            data-testid="input-confirm-password"
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

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={resetPasswordMutation.isPending}
                    data-testid="button-submit"
                  >
                    {resetPasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("auth.resetting")}
                      </>
                    ) : (
                      t("auth.resetPassword")
                    )}
                  </Button>

                  <div className="text-center pt-2">
                    <Link href="/login">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        data-testid="link-back-to-profile"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        {t("nav.backToProfile")}
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
