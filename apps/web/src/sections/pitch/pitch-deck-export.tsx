"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  MapPin,
  Trophy,
  Store,
  Users,
  TrendingUp,
  Target,
  Zap,
  Globe,
  Smartphone,
  Camera,
  QrCode,
  BarChart3,
  Share2,
  Gift,
  Navigation,
  Sparkles,
  Shield,
} from "lucide-react";
import { APP_NAME } from "@/lib/app-brand";
import { getPublicSiteHostnameOrFallback } from "@/lib/app-config";

const PITCH_CTA_HOST = getPublicSiteHostnameOrFallback();

function PhoneMockup({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="relative mx-auto" style={{ width: "200px" }}>
      <div className="bg-slate-900 rounded-[2rem] p-2 shadow-xl">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-900 rounded-full z-10" />
        <div className="bg-background rounded-[1.5rem] overflow-hidden h-[360px] relative">
          {title && (
            <div className="absolute top-0 left-0 right-0 bg-primary/10 px-3 py-2 z-10">
              <p className="text-xs font-medium text-primary text-center">
                {title}
              </p>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

function HomeScreenMockup() {
  return (
    <PhoneMockup title={APP_NAME}>
      <div className="pt-10 px-3 h-full bg-gradient-to-b from-background to-primary/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] text-muted-foreground">Welcome back</p>
            <h3 className="text-sm font-bold text-foreground">
              Discover Rewards
            </h3>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase">
            Ready to Claim
          </p>
          <Card className="p-2 border-teal/30 bg-teal/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal/20 flex items-center justify-center">
                <Gift className="w-4 h-4 text-teal" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-xs">Free Coffee</p>
                <p className="text-[10px] text-muted-foreground">Riyadh Cafe</p>
              </div>
              <Badge className="bg-teal text-white text-[10px] px-1.5 py-0.5">
                15m
              </Badge>
            </div>
          </Card>

          <Card className="p-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Store className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-xs">50% OFF</p>
                <p className="text-[10px] text-muted-foreground">
                  Fashion Store
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                120m
              </Badge>
            </div>
          </Card>
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <Button className="w-full bg-primary text-white h-8 text-xs">
            <Camera className="w-3 h-3 mr-1" />
            Start Hunting
          </Button>
        </div>
      </div>
    </PhoneMockup>
  );
}

function ARViewMockup() {
  return (
    <PhoneMockup>
      <div className="h-full bg-gradient-to-b from-blue-400 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-16 left-6 w-14 h-24 bg-slate-700 rounded" />
          <div className="absolute top-12 right-6 w-12 h-28 bg-slate-600 rounded" />
        </div>

        <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
          <div className="bg-black/50 px-2 py-1 rounded-full">
            <p className="text-white text-[10px]">24.71°, 46.67°</p>
          </div>
          <div className="bg-black/50 px-2 py-1 rounded-full">
            <p className="text-teal text-[10px] font-bold">12m away</p>
          </div>
        </div>

        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal to-primary flex items-center justify-center shadow-xl border-2 border-white/30">
            <Trophy className="w-7 h-7 text-white" />
          </div>
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <Card className="bg-black/80 border-teal/30 p-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-teal/30 flex items-center justify-center">
                <Gift className="w-4 h-4 text-teal" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white text-xs">Free Coffee</p>
                <p className="text-[10px] text-slate-400">Get within 15m</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PhoneMockup>
  );
}

function VoucherMockup() {
  return (
    <PhoneMockup title="Your Voucher">
      <div className="pt-10 px-3 h-full bg-gradient-to-b from-background to-teal/5 flex flex-col">
        <Card className="flex-1 p-3 border-teal/30 mt-2">
          <div className="text-center mb-3">
            <div className="w-12 h-12 rounded-full bg-teal/20 flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-6 h-6 text-teal" />
            </div>
            <h3 className="text-base font-bold">Free Coffee</h3>
            <p className="text-xs text-muted-foreground">Riyadh Cafe</p>
          </div>

          <div className="bg-white p-3 rounded-lg mb-3 flex items-center justify-center">
            <div className="w-20 h-20 bg-slate-100 rounded flex items-center justify-center border border-dashed border-slate-300">
              <QrCode className="w-12 h-12 text-slate-600" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Voucher Code</p>
            <p className="font-mono text-sm font-bold text-primary">
              SNAP-7X9K2M
            </p>
          </div>
        </Card>
      </div>
    </PhoneMockup>
  );
}

function MerchantMockup() {
  return (
    <PhoneMockup title="Dashboard">
      <div className="pt-10 px-2 h-full bg-background">
        <div className="grid grid-cols-2 gap-1.5 mb-3 mt-1">
          <Card className="p-2 bg-primary/5 border-primary/20">
            <p className="text-lg font-bold text-primary">156</p>
            <p className="text-[10px] text-muted-foreground">Claims</p>
          </Card>
          <Card className="p-2 bg-teal/5 border-teal/20">
            <p className="text-lg font-bold text-teal">89%</p>
            <p className="text-[10px] text-muted-foreground">Redemption</p>
          </Card>
        </div>

        <Card className="p-2">
          <p className="text-xs font-semibold mb-2">Weekly Activity</p>
          <div className="flex items-end gap-0.5 h-12">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-primary to-teal rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </Card>
      </div>
    </PhoneMockup>
  );
}

function Slide({
  children,
  number,
}: {
  children: React.ReactNode;
  number: number;
}) {
  return (
    <div
      className="slide-page bg-background border border-border rounded-lg p-8 mb-8 shadow-sm"
      style={{ pageBreakAfter: "always", minHeight: "600px" }}
    >
      <div className="absolute top-4 right-4 text-xs text-muted-foreground">
        {number}/12
      </div>
      {children}
    </div>
  );
}

export default function PitchDeckExportPage() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="print:hidden sticky top-0 z-50 bg-background border-b p-4 flex items-center justify-between">
        <Link href="/pitch">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Interactive Deck
          </Button>
        </Link>
        <Button onClick={handlePrint} className="bg-primary">
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none">
        <Slide number={1}>
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-teal flex items-center justify-center mb-6 shadow-xl">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-teal bg-clip-text text-transparent mb-4">
              {APP_NAME}
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              Location-Based AR Rewards for Saudi Arabia
            </p>
            <div className="bg-primary/10 px-6 py-3 rounded-full">
              <span className="text-lg font-semibold text-primary">
                Hunt. Claim. Redeem.
              </span>
            </div>
          </div>
        </Slide>

        <Slide number={2}>
          <h2 className="text-3xl font-bold text-primary mb-8">
            The Challenge
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              {
                icon: Store,
                text: "Merchants struggle to drive foot traffic to physical stores",
              },
              {
                icon: Users,
                text: "Traditional loyalty apps have low engagement (< 15%)",
              },
              {
                icon: Target,
                text: "Digital ads fail to convert to real in-store visits",
              },
              {
                icon: TrendingUp,
                text: "Customer acquisition costs keep rising",
              },
            ].map((item, i) => (
              <Card key={i} className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-destructive" />
                </div>
                <p className="text-sm text-foreground">{item.text}</p>
              </Card>
            ))}
          </div>
          <div className="text-center bg-gradient-to-r from-primary/10 to-teal/10 p-6 rounded-xl">
            <span className="text-4xl font-bold text-primary">67%</span>
            <p className="text-muted-foreground mt-1">
              of consumers want more engaging brand experiences
            </p>
          </div>
        </Slide>

        <Slide number={3}>
          <div className="flex gap-8 items-center h-full">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-primary mb-4">
                The Solution
              </h2>
              <p className="text-xl font-semibold text-teal mb-3">
                Gamified AR Treasure Hunts
              </p>
              <p className="text-muted-foreground mb-6">
                Scavly turns finding deals into an exciting real-world game.
                Users hunt for virtual rewards at real locations, then redeem
                them in-store.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                  AR Experience
                </Badge>
                <Badge className="bg-teal/10 text-teal border-teal/20 px-3 py-1">
                  GPS Tracking
                </Badge>
                <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                  QR Vouchers
                </Badge>
                <Badge className="bg-teal/10 text-teal border-teal/20 px-3 py-1">
                  Analytics
                </Badge>
              </div>
            </div>
            <div className="flex-shrink-0">
              <ARViewMockup />
            </div>
          </div>
        </Slide>

        <Slide number={4}>
          <h2 className="text-3xl font-bold text-primary mb-6 text-center">
            The App Experience
          </h2>
          <div className="flex justify-center gap-6 items-start">
            <div className="text-center">
              <HomeScreenMockup />
              <p className="text-sm font-medium mt-3 text-muted-foreground">
                Discover Drops
              </p>
            </div>
            <div className="text-center">
              <ARViewMockup />
              <p className="text-sm font-medium mt-3 text-muted-foreground">
                Hunt in AR
              </p>
            </div>
            <div className="text-center">
              <VoucherMockup />
              <p className="text-sm font-medium mt-3 text-muted-foreground">
                Claim Voucher
              </p>
            </div>
          </div>
        </Slide>

        <Slide number={5}>
          <h2 className="text-3xl font-bold text-primary mb-6">Key Features</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                icon: Camera,
                title: "AR Game View",
                desc: "See 3D rewards floating in the real world",
              },
              {
                icon: Navigation,
                title: "GPS Proximity",
                desc: "Get within range to claim rewards",
              },
              {
                icon: QrCode,
                title: "Instant Vouchers",
                desc: "QR codes for in-store redemption",
              },
              {
                icon: Share2,
                title: "WhatsApp Sharing",
                desc: "Share deals with one tap",
              },
              {
                icon: BarChart3,
                title: "Merchant Analytics",
                desc: "Real-time claims & ROI tracking",
              },
              {
                icon: Shield,
                title: "Capture Limits",
                desc: "Control scarcity with limits",
              },
            ].map((feature, i) => (
              <Card key={i} className="p-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-teal/20 flex items-center justify-center mb-3">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </Slide>

        <Slide number={6}>
          <div className="flex gap-8 items-center h-full">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-teal mb-4">
                For Treasure Hunters
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                A fun way to discover deals
              </p>
              <div className="space-y-3">
                {[
                  { icon: MapPin, text: "Discover rewards near your location" },
                  {
                    icon: Camera,
                    text: "Hunt for 3D rewards through AR camera",
                  },
                  {
                    icon: Gift,
                    text: "Claim exclusive discounts and freebies",
                  },
                  {
                    icon: Share2,
                    text: "Share deals with friends via WhatsApp",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-teal/5 p-3 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-teal/20 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-teal" />
                    </div>
                    <span className="text-sm text-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0">
              <HomeScreenMockup />
            </div>
          </div>
        </Slide>

        <Slide number={7}>
          <div className="flex gap-8 items-center h-full">
            <div className="flex-shrink-0">
              <MerchantMockup />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-primary mb-4">
                For Merchants
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Powerful tools to drive foot traffic
              </p>
              <div className="space-y-3">
                {[
                  { icon: MapPin, text: "Create drops at any GPS location" },
                  { icon: Gift, text: "Set reward values and capture limits" },
                  {
                    icon: BarChart3,
                    text: "Track claims and redemptions in real-time",
                  },
                  { icon: QrCode, text: "Scan customer vouchers to validate" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-primary/5 p-3 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Slide>

        <Slide number={8}>
          <h2 className="text-3xl font-bold text-primary mb-10">
            How It Works
          </h2>
          <div className="flex justify-between items-start">
            {[
              {
                number: "01",
                title: "Create a Drop",
                desc: "Merchants set location, reward & limits",
              },
              {
                number: "02",
                title: "Hunters Explore",
                desc: "Discover nearby drops in AR view",
              },
              {
                number: "03",
                title: "Claim Reward",
                desc: "Get within range to capture",
              },
              {
                number: "04",
                title: "Redeem In-Store",
                desc: "Show QR code to redeem",
              },
            ].map((step, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center flex-1"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-teal flex items-center justify-center mb-4 shadow-lg">
                  <span className="text-xl font-bold text-white">
                    {step.number}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  {step.title}
                </h3>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </Slide>

        <Slide number={9}>
          <h2 className="text-3xl font-bold text-primary mb-8">
            Market Opportunity
          </h2>
          <div className="grid grid-cols-3 gap-6 mb-8">
            {[
              { value: "$1.2B", label: "Saudi Loyalty Market by 2027" },
              { value: "35M+", label: "Smartphone Users in KSA" },
              { value: "78%", label: "Mobile Commerce Adoption" },
            ].map((stat, i) => (
              <div
                key={i}
                className="text-center bg-gradient-to-br from-primary/10 to-teal/10 rounded-xl p-6"
              >
                <span className="text-4xl font-bold bg-gradient-to-r from-primary to-teal bg-clip-text text-transparent">
                  {stat.value}
                </span>
                <p className="text-sm text-muted-foreground mt-2">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Badge className="bg-teal/10 text-teal border-teal/20 px-4 py-2 text-base">
              Aligned with Saudi Vision 2030&apos;s digital transformation goals
            </Badge>
          </div>
        </Slide>

        <Slide number={10}>
          <h2 className="text-3xl font-bold text-primary mb-8">
            Revenue Model
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                title: "Merchant Subscriptions",
                desc: "Monthly plans for drop creation & analytics",
              },
              {
                title: "Transaction Fees",
                desc: "Small fee per successful redemption",
              },
              {
                title: "Premium Features",
                desc: "Priority placement, custom branding, advanced analytics",
              },
              {
                title: "Enterprise Solutions",
                desc: "White-label platform for retail chains",
              },
            ].map((item, i) => (
              <Card key={i} className="p-5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-teal/20 flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5 text-teal" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </Card>
            ))}
          </div>
        </Slide>

        <Slide number={11}>
          <h2 className="text-3xl font-bold text-primary mb-8">
            Competitive Advantage
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                title: "First Mover",
                desc: "No AR rewards platform in MENA region",
              },
              {
                title: "Proven Gamification",
                desc: "Inspired by Pokémon GO's success model",
              },
              {
                title: "Saudi-First",
                desc: "Built for local market & Vision 2030",
              },
              {
                title: "Easy Onboarding",
                desc: "Merchants go live in minutes",
              },
            ].map((adv, i) => (
              <div
                key={i}
                className="flex items-start gap-4 bg-gradient-to-br from-primary/5 to-teal/5 p-5 rounded-xl border border-primary/20"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-teal flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {adv.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{adv.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Slide>

        <Slide number={12}>
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-teal flex items-center justify-center mb-6 shadow-xl">
              <Globe className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-teal bg-clip-text text-transparent mb-4">
              Transform Retail
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Where Every Location Becomes an Opportunity
            </p>
            <div className="flex items-center gap-3 bg-primary/10 px-6 py-3 rounded-full">
              <Smartphone className="w-6 h-6 text-primary" />
              <span className="text-lg font-semibold text-primary">
                {PITCH_CTA_HOST}
              </span>
            </div>
          </div>
        </Slide>
      </div>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .slide-page { 
            page-break-after: always; 
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 40px !important;
            min-height: 100vh !important;
          }
          .slide-page:last-child { page-break-after: avoid; }
        }
      `}</style>
    </div>
  );
}
