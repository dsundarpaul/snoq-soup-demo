"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/contexts/language-context";
import { API_ORIGIN } from "@/lib/app-config";

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const { t } = useLanguage();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(t("verify.invalidLink"));
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(
          `${API_ORIGIN}/api/v1/auth/merchant/verify-email/${encodeURIComponent(token)}`,
          { method: "POST", credentials: "omit" }
        );
        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(t("verify.yourEmailVerified"));
        } else {
          setStatus("error");
          setMessage(data.message || "Verification failed");
        }
      } catch (error) {
        setStatus("error");
        setMessage(t("toast.somethingWentWrong"));
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold">{t("verify.title")}</h1>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-md mx-auto p-4 pt-12">
        <Card className="p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
              <h2 className="text-xl font-semibold mb-2">
                {t("verify.verifying")}
              </h2>
              <p className="text-muted-foreground">{t("verify.pleaseWait")}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                {t("verify.verified")}
              </h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <Link href="/merchant">
                <Button data-testid="button-login">
                  {t("nav.goToLogin")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                {t("verify.failed")}
              </h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <Link href="/merchant/signup">
                <Button variant="outline" data-testid="button-try-again">
                  {t("scanner.tryAgain")}
                </Button>
              </Link>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
