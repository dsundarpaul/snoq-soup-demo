"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Gift,
  Store,
  Smartphone,
  TrendingUp,
  Users,
  QrCode,
  Sparkles,
  ChevronRight,
  Star,
  Zap,
  Target,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { LanguageToggle } from "@/components/language-toggle";
import { APP_NAME, appLogo } from "@/lib/app-brand";

const mockupHome = "/images/mockup-home.png";
const mockupArHunt = "/images/mockup-ar-hunt.png";
const mockupVoucher = "/images/mockup-voucher.png";

export default function WelcomePage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-teal/20" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal/30 rounded-full blur-3xl" />

        <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {t("welcome.badge")}
              </span>
            </div>

            {/* Main heading */}
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-foreground">{t("welcome.heroTitle1")}</span>
              <span className="bg-gradient-to-r from-primary to-teal bg-clip-text text-transparent">
                {t("welcome.heroTitle2")}
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t("welcome.heroDesc")}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/">
                <Button
                  size="lg"
                  className="gap-2 text-lg px-8 py-6"
                  data-testid="button-start-hunting"
                >
                  <Target className="w-5 h-5" />
                  {t("welcome.startHunting")}
                </Button>
              </Link>
              <Link href="/merchant/signup">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 text-lg px-8 py-6"
                  data-testid="button-merchant-signup"
                >
                  <Store className="w-5 h-5" />
                  {t("merchant.imAMerchant")}
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mb-16">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">15m</div>
                <div className="text-sm text-muted-foreground">
                  {t("welcome.claimRadius")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-teal">AR</div>
                <div className="text-sm text-muted-foreground">
                  {t("welcome.liveCamera")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">QR</div>
                <div className="text-sm text-muted-foreground">
                  {t("welcome.easyRedeem")}
                </div>
              </div>
            </div>

            {/* Phone Mockups */}
            <div className="flex justify-center items-end gap-4 md:gap-8">
              <div className="relative w-32 md:w-48 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-teal/30 to-primary/30 rounded-3xl blur-xl" />
                <img
                  src={mockupHome}
                  alt={`${APP_NAME} home screen`}
                  className="relative rounded-2xl shadow-2xl border-4 border-background"
                />
              </div>
              <div className="relative w-40 md:w-56 z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-teal/40 rounded-3xl blur-xl" />
                <img
                  src={mockupArHunt}
                  alt="AR Treasure Hunt"
                  className="relative rounded-2xl shadow-2xl border-4 border-background"
                />
              </div>
              <div className="relative w-32 md:w-48 transform rotate-6 hover:rotate-0 transition-transform duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-teal/30 rounded-3xl blur-xl" />
                <img
                  src={mockupVoucher}
                  alt="Voucher QR Code"
                  className="relative rounded-2xl shadow-2xl border-4 border-background"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Users */}
      <section className="py-16 md:py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-teal">{t("welcome.huntClaimRedeemH")}</span>{" "}
              <span className="text-primary">{t("welcome.claimH")}</span>{" "}
              <span className="text-foreground">{t("welcome.redeemH")}</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              {t("welcome.threeSteps")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="relative overflow-hidden group hover-elevate">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal to-teal/50" />
              <CardContent className="pt-8 pb-6 text-center">
                <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <MapPin className="w-8 h-8 text-teal" />
                </div>
                <div className="text-4xl font-bold text-teal/20 absolute top-4 right-4">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {t("welcome.explore")}
                </h3>
                <p className="text-muted-foreground">
                  {t("welcome.exploreDesc")}
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group hover-elevate">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
              <CardContent className="pt-8 pb-6 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Smartphone className="w-8 h-8 text-primary" />
                </div>
                <div className="text-4xl font-bold text-primary/20 absolute top-4 right-4">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {t("welcome.discoverInAr")}
                </h3>
                <p className="text-muted-foreground">
                  {t("welcome.discoverDesc")}
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group hover-elevate">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal to-primary" />
              <CardContent className="pt-8 pb-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal/10 to-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Gift className="w-8 h-8 text-primary" />
                </div>
                <div className="text-4xl font-bold text-muted/20 absolute top-4 right-4">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {t("welcome.redeem")}
                </h3>
                <p className="text-muted-foreground">
                  {t("welcome.redeemDesc")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* For Merchants */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <div className="inline-flex items-center gap-2 bg-teal/10 border border-teal/20 rounded-full px-4 py-2 mb-6">
                <Store className="w-4 h-4 text-teal" />
                <span className="text-sm font-medium text-teal">
                  {t("welcome.forMerchants")}
                </span>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                {t("welcome.driveCustomers1")}
                <span className="text-teal">
                  {t("welcome.driveCustomers2")}
                </span>
              </h2>

              <p className="text-lg text-muted-foreground mb-8">
                {t("welcome.driveDesc")}
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap className="w-4 h-4 text-teal" />
                  </div>
                  <div>
                    <h4 className="font-semibold">
                      {t("welcome.fiveMinSetup")}
                    </h4>
                    <p className="text-muted-foreground text-sm">
                      {t("welcome.fiveMinDesc")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <TrendingUp className="w-4 h-4 text-teal" />
                  </div>
                  <div>
                    <h4 className="font-semibold">
                      {t("welcome.realTimeAnalytics")}
                    </h4>
                    <p className="text-muted-foreground text-sm">
                      {t("welcome.analyticsDesc")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <QrCode className="w-4 h-4 text-teal" />
                  </div>
                  <div>
                    <h4 className="font-semibold">
                      {t("welcome.easyVerification")}
                    </h4>
                    <p className="text-muted-foreground text-sm">
                      {t("welcome.verificationDesc")}
                    </p>
                  </div>
                </div>
              </div>

              <Link href="/merchant/signup">
                <Button
                  size="lg"
                  className="gap-2 bg-teal hover:bg-teal/90"
                  data-testid="button-get-started-merchant"
                >
                  {t("welcome.getStartedFree")}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Visual mockup */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-teal/20 to-primary/20 rounded-3xl blur-2xl" />
              <Card className="relative bg-card/80 backdrop-blur border-2 border-teal/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-2 mb-6">
                    <h3 className="font-semibold">
                      {t("welcome.merchantDashboard")}
                    </h3>
                    <div className="flex items-center gap-1 text-teal text-sm">
                      <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                      {t("status.live")}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-background rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-primary">247</div>
                      <div className="text-xs text-muted-foreground">
                        {t("welcome.totalClaims")}
                      </div>
                    </div>
                    <div className="bg-background rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-teal">189</div>
                      <div className="text-xs text-muted-foreground">
                        {t("status.redeemed")}
                      </div>
                    </div>
                    <div className="bg-background rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-foreground">
                        76%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("welcome.conversion")}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 bg-background rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Gift className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            20% Off Coffee
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Active · 15m radius
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-teal">
                          89
                        </div>
                        <div className="text-xs text-muted-foreground">
                          claims
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-background rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center">
                          <Gift className="w-5 h-5 text-teal" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            Free Dessert
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Active · 20m radius
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-teal">
                          158
                        </div>
                        <div className="text-xs text-muted-foreground">
                          claims
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-teal/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("welcome.whySouqSnap")}
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Card className="text-center hover-elevate">
              <CardContent className="pt-6">
                <Users className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-1">{t("welcome.gamified")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("welcome.gamifiedDesc")}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover-elevate">
              <CardContent className="pt-6">
                <MapPin className="w-10 h-10 text-teal mx-auto mb-3" />
                <h3 className="font-semibold mb-1">
                  {t("welcome.locationBased")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("welcome.locationDesc")}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover-elevate">
              <CardContent className="pt-6">
                <Star className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-1">
                  {t("welcome.saudiFirst")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("welcome.saudiDesc")}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover-elevate">
              <CardContent className="pt-6">
                <Smartphone className="w-10 h-10 text-teal mx-auto mb-3" />
                <h3 className="font-semibold mb-1">
                  {t("welcome.noAppDownload")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("welcome.noAppDesc")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-teal p-8 md:p-12 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t("welcome.readyToStart")}
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
                {t("welcome.readyDesc")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="gap-2 text-lg px-8"
                    data-testid="button-explore-rewards"
                  >
                    <Target className="w-5 h-5" />
                    {t("welcome.exploreRewards")}
                  </Button>
                </Link>
                <Link href="/merchant/signup">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 text-lg px-8 bg-white/10 border-white/30 text-white hover:bg-white/20"
                    data-testid="button-become-merchant"
                  >
                    <Store className="w-5 h-5" />
                    {t("welcome.becomeMerchant")}
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center">
              <img
                src={appLogo.src}
                alt={APP_NAME}
                width={appLogo.width}
                height={appLogo.height}
                className="h-8 w-auto max-w-[min(200px,45vw)] object-contain"
              />
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link
                href="/"
                className="hover:text-foreground transition-colors"
              >
                {t("nav.home")}
              </Link>
              <Link
                href="/merchant"
                className="hover:text-foreground transition-colors"
              >
                {t("nav.merchantLogin")}
              </Link>
              <Link
                href="/merchant/signup"
                className="hover:text-foreground transition-colors"
              >
                {t("nav.signUp")}
              </Link>
              <LanguageToggle />
            </div>

            <div className="text-sm text-muted-foreground">
              {t("welcome.footer")}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
