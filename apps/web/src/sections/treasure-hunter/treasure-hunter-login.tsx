"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDeviceId } from "@/hooks/use-device-id";
import { useRedirectIfTreasureHunterLoggedIn } from "@/hooks/use-redirect-if-logged-in";
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
import { Loader2, LogIn } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import {
  hunterAuthNextQuery,
  safeRelativeNextPath,
} from "@/lib/safe-next-path";
import { TreasureHunterAuthShell } from "@/sections/treasure-hunter/treasure-hunter-auth-shell";
import {
  hunterLoginSchema,
  type HunterLoginInput,
} from "@/hooks/api/treasure-hunter/treasure-hunter.api-types";
import { useTreasureHunterLoginMutation } from "@/hooks/api/treasure-hunter";
import { APP_NAME, appLogo } from "@/lib/app-brand";

function TreasureHunterSignInForm({
  nextPath,
  signUpHref,
}: {
  nextPath: string;
  signUpHref: string;
}) {
  const deviceId = useDeviceId();
  const { toast } = useToast();
  const { t } = useLanguage();
  const router = useRouter();

  const form = useForm<HunterLoginInput>({
    resolver: zodResolver(hunterLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useTreasureHunterLoginMutation({
    onSuccess: () => {
      toast({
        title: t("toast.welcomeBack"),
        description: t("toast.progressSynced"),
      });
      form.reset();
      router.push(nextPath);
    },
    onError: (error: Error) => {
      toast({
        title: t("toast.loginFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: HunterLoginInput) => {
    if (!deviceId) return;
    loginMutation.mutate({ ...data, deviceId });
  };

  return (
    <>
      <div className="text-center mb-6">
        <div className="mx-auto mb-3 flex justify-center">
          <img
            src={appLogo.src}
            alt={APP_NAME}
            width={appLogo.width}
            height={appLogo.height}
            className="h-14 w-auto max-w-[min(280px,85vw)] object-contain"
          />
        </div>
        <h2 className="text-lg font-semibold text-foreground">{APP_NAME}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("profile.welcomeBack")}
        </p>
      </div>
      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="font-semibold text-lg">{t("auth.signIn")}</h2>
            </div>

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
                      minLength={6}
                      data-testid="input-password"
                      {...field}
                    />
                  </FormControl>
                  <Link href="/forgot-password">
                    <span
                      className="text-sm text-primary hover:underline cursor-pointer"
                      data-testid="link-forgot-password"
                    >
                      {t("auth.forgotPassword")}
                    </span>
                  </Link>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
              data-testid="button-submit-auth"
            >
              {loginMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("auth.signIn")
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t("auth.dontHaveAccount")}{" "}
              <Link
                href={signUpHref}
                className="text-primary hover:underline font-medium"
                data-testid="link-go-signup"
              >
                {t("nav.signUp")}
              </Link>
            </p>
          </form>
        </Form>
      </Card>
    </>
  );
}

export default function TreasureHunterLoginPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const nextPath = safeRelativeNextPath(searchParams.get("next"));
  const signUpHref = `/signup${hunterAuthNextQuery(searchParams.get("next"))}`;

  useRedirectIfTreasureHunterLoggedIn(nextPath);

  return (
    <TreasureHunterAuthShell title={t("auth.signIn")} Icon={LogIn}>
      <TreasureHunterSignInForm nextPath={"/"} signUpHref={signUpHref} />
    </TreasureHunterAuthShell>
  );
}
