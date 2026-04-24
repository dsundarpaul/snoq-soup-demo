"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
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
import { motion, AnimatePresence } from "framer-motion";
import { APP_NAME } from "@/lib/app-brand";
import { getPublicSiteHostnameOrFallback } from "@/lib/app-config";

const CTA_HOST = getPublicSiteHostnameOrFallback();

function PhoneMockup({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="relative mx-auto" style={{ width: "280px" }}>
      <div className="bg-slate-900 rounded-[3rem] p-3 shadow-2xl">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-900 rounded-full z-10" />
        <div className="bg-background rounded-[2.5rem] overflow-hidden h-[500px] relative">
          {title && (
            <div className="absolute top-0 left-0 right-0 bg-primary/10 backdrop-blur px-4 py-3 z-10">
              <p className="text-sm font-medium text-primary text-center">
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
      <div className="pt-12 px-4 h-full bg-gradient-to-b from-background to-primary/5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-muted-foreground">Welcome back</p>
            <h3 className="text-lg font-bold text-foreground">
              Discover Rewards
            </h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Ready to Claim
          </p>
          <Card className="p-3 border-teal/30 bg-teal/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-teal/20 flex items-center justify-center">
                <Gift className="w-6 h-6 text-teal" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Free Coffee</p>
                <p className="text-xs text-muted-foreground">Riyadh Cafe</p>
              </div>
              <Badge className="bg-teal text-white text-xs">15m</Badge>
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Store className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">50% OFF</p>
                <p className="text-xs text-muted-foreground">Fashion Store</p>
              </div>
              <Badge variant="outline" className="text-xs">
                120m
              </Badge>
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Golden Deal</p>
                <p className="text-xs text-muted-foreground">Luxury Mall</p>
              </div>
              <Badge variant="outline" className="text-xs">
                350m
              </Badge>
            </div>
          </Card>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <Button className="w-full bg-primary text-white">
            <Camera className="w-4 h-4 mr-2" />
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
          <div className="absolute top-20 left-10 w-20 h-32 bg-slate-700 rounded" />
          <div className="absolute top-16 right-8 w-16 h-40 bg-slate-600 rounded" />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-slate-500" />
        </div>

        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
          <div className="bg-black/50 backdrop-blur px-3 py-1.5 rounded-full">
            <p className="text-white text-xs">24.7136°, 46.6753°</p>
          </div>
          <div className="bg-black/50 backdrop-blur px-3 py-1.5 rounded-full">
            <p className="text-teal text-xs font-bold">12m away</p>
          </div>
        </div>

        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-teal/40 animate-ping absolute inset-0" />
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal to-primary flex items-center justify-center relative shadow-2xl border-2 border-white/30">
              <Trophy className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <Card className="bg-black/80 backdrop-blur border-teal/30 p-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-teal/30 flex items-center justify-center">
                <Gift className="w-5 h-5 text-teal" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">Free Coffee</p>
                <p className="text-xs text-slate-400">
                  Get within 15m to claim
                </p>
              </div>
              <Badge className="bg-teal">FREE</Badge>
            </div>
            <Button
              className="w-full bg-teal hover:bg-teal/90 text-white"
              disabled
            >
              <MapPin className="w-4 h-4 mr-2" />
              Get Closer to Claim
            </Button>
          </Card>
        </div>
      </div>
    </PhoneMockup>
  );
}

function VoucherMockup() {
  return (
    <PhoneMockup title="Your Voucher">
      <div className="pt-12 px-4 h-full bg-gradient-to-b from-background to-teal/5 flex flex-col">
        <Card className="flex-1 p-4 border-teal/30 mt-4">
          <div className="text-center mb-4">
            <div className="w-16 h-16 rounded-full bg-teal/20 flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-8 h-8 text-teal" />
            </div>
            <h3 className="text-xl font-bold">Free Coffee</h3>
            <p className="text-sm text-muted-foreground">Riyadh Cafe</p>
          </div>

          <div className="bg-white p-4 rounded-xl mb-4 flex items-center justify-center">
            <div className="w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
              <QrCode className="w-20 h-20 text-slate-600" />
            </div>
          </div>

          <div className="text-center mb-4">
            <p className="text-xs text-muted-foreground mb-1">Voucher Code</p>
            <p className="font-mono text-lg font-bold text-primary">
              SNAP-7X9K2M
            </p>
          </div>

          <div className="border-t pt-4 space-y-2">
            <Button variant="outline" className="w-full" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share via WhatsApp
            </Button>
          </div>
        </Card>
      </div>
    </PhoneMockup>
  );
}

function MerchantDashboardMockup() {
  return (
    <PhoneMockup title="Merchant Dashboard">
      <div className="pt-12 px-3 h-full bg-background">
        <div className="grid grid-cols-2 gap-2 mb-4 mt-2">
          <Card className="p-3 bg-primary/5 border-primary/20">
            <p className="text-2xl font-bold text-primary">156</p>
            <p className="text-xs text-muted-foreground">Total Claims</p>
          </Card>
          <Card className="p-3 bg-teal/5 border-teal/20">
            <p className="text-2xl font-bold text-teal">89%</p>
            <p className="text-xs text-muted-foreground">Redemption</p>
          </Card>
        </div>

        <Card className="p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Active Drops</p>
            <Badge className="bg-teal text-xs">3</Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <div className="w-8 h-8 rounded bg-teal/20 flex items-center justify-center">
                <Gift className="w-4 h-4 text-teal" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium">Free Coffee</p>
                <p className="text-xs text-muted-foreground">42 claims</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                <Gift className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium">50% Discount</p>
                <p className="text-xs text-muted-foreground">28 claims</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Weekly Activity</p>
          </div>
          <div className="flex items-end gap-1 h-16">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-primary to-teal rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span
                key={i}
                className="text-xs text-muted-foreground flex-1 text-center"
              >
                {d}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </PhoneMockup>
  );
}

const slides = [
  {
    id: 1,
    type: "cover",
    title: APP_NAME,
    subtitle: "Location-Based AR Rewards for Saudi Arabia",
    tagline: "Hunt. Claim. Redeem.",
  },
  {
    id: 2,
    type: "problem",
    title: "The Challenge",
    points: [
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
      { icon: TrendingUp, text: "Customer acquisition costs keep rising" },
    ],
    stat: {
      value: "67%",
      label: "of consumers want more engaging brand experiences",
    },
  },
  {
    id: 3,
    type: "solution",
    title: "The Solution",
    headline: "Gamified AR Treasure Hunts",
    description: `${APP_NAME} turns finding deals into an exciting real-world game. Users hunt for virtual rewards at real locations, then redeem them in-store.`,
  },
  {
    id: 4,
    type: "appShowcase",
    title: "The App Experience",
    screens: ["home", "ar", "voucher"],
  },
  {
    id: 5,
    type: "features",
    title: "Key Features",
    features: [
      {
        icon: Camera,
        title: "AR Game View",
        desc: "See 3D rewards floating in the real world through your camera",
      },
      {
        icon: Navigation,
        title: "GPS Proximity",
        desc: "Get within range to claim rewards at merchant locations",
      },
      {
        icon: QrCode,
        title: "Instant Vouchers",
        desc: "QR code vouchers generated instantly for in-store redemption",
      },
      {
        icon: Share2,
        title: "WhatsApp Sharing",
        desc: "Share deals with friends via WhatsApp with one tap",
      },
      {
        icon: BarChart3,
        title: "Merchant Analytics",
        desc: "Real-time dashboard showing claims, redemptions & ROI",
      },
      {
        icon: Shield,
        title: "Capture Limits",
        desc: "Control scarcity with limited-time or limited-quantity drops",
      },
    ],
  },
  {
    id: 6,
    type: "userView",
    title: "For Treasure Hunters",
    subtitle: "A fun way to discover deals",
  },
  {
    id: 7,
    type: "merchantView",
    title: "For Merchants",
    subtitle: "Powerful tools to drive foot traffic",
  },
  {
    id: 9,
    type: "howItWorks",
    title: "How It Works",
    steps: [
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
    ],
  },
  {
    id: 10,
    type: "market",
    title: "Market Opportunity",
    stats: [
      { value: "$1.2B", label: "Saudi Loyalty Market by 2027" },
      { value: "35M+", label: "Smartphone Users in KSA" },
      { value: "78%", label: "Mobile Commerce Adoption" },
    ],
    context: "Aligned with Saudi Vision 2030's digital transformation goals",
  },
  {
    id: 11,
    type: "businessModel",
    title: "Revenue Model",
    revenue: [
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
    ],
  },
  {
    id: 12,
    type: "competitive",
    title: "Competitive Advantage",
    advantages: [
      { title: "First Mover", desc: "No AR rewards platform in MENA region" },
      {
        title: "Proven Gamification",
        desc: "Inspired by Pokémon GO's success model",
      },
      { title: "Saudi-First", desc: "Built for local market & Vision 2030" },
      { title: "Easy Onboarding", desc: "Merchants go live in minutes" },
    ],
  },
  {
    id: 13,
    type: "closing",
    title: "Transform Retail",
    tagline: "Where Every Location Becomes an Opportunity",
    cta: CTA_HOST,
  },
];

function SlideContent({ slide }: { slide: (typeof slides)[0] }) {
  switch (slide.type) {
    case "cover":
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8 bg-gradient-to-br from-background via-primary/5 to-teal/5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-teal flex items-center justify-center mb-8 shadow-2xl"
          >
            <Trophy className="w-14 h-14 text-white" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-primary to-teal bg-clip-text text-transparent mb-4"
          >
            {slide.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl md:text-2xl text-muted-foreground mb-6"
          >
            {slide.subtitle}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-primary/10 px-6 py-3 rounded-full"
          >
            <span className="text-xl font-semibold text-primary">
              {slide.tagline}
            </span>
          </motion.div>
        </div>
      );

    case "problem":
      return (
        <div className="flex flex-col h-full px-8 py-12">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl md:text-5xl font-bold text-primary mb-12"
          >
            {slide.title}
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-6 flex-1">
            {slide.points?.map((point, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-start gap-4 bg-card p-6 rounded-xl border border-border"
              >
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <point.icon className="w-6 h-6 text-destructive" />
                </div>
                <p className="text-lg text-foreground">{point.text}</p>
              </motion.div>
            ))}
          </div>
          {slide.stat && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 text-center bg-gradient-to-r from-primary/10 to-teal/10 p-6 rounded-xl"
            >
              <span className="text-5xl font-bold text-primary">
                {slide.stat.value}
              </span>
              <p className="text-muted-foreground mt-2">{slide.stat.label}</p>
            </motion.div>
          )}
        </div>
      );

    case "solution":
      return (
        <div className="flex flex-col md:flex-row h-full px-8 py-12 gap-8 items-center">
          <div className="flex-1">
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl md:text-5xl font-bold text-primary mb-6"
            >
              {slide.title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-2xl md:text-3xl font-semibold text-teal mb-4"
            >
              {slide.headline}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-lg text-muted-foreground max-w-xl"
            >
              {slide.description}
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-3 mt-8"
            >
              <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
                AR Experience
              </Badge>
              <Badge className="bg-teal/10 text-teal border-teal/20 px-4 py-2">
                GPS Tracking
              </Badge>
              <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
                QR Vouchers
              </Badge>
              <Badge className="bg-teal/10 text-teal border-teal/20 px-4 py-2">
                Analytics
              </Badge>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex-shrink-0"
          >
            <ARViewMockup />
          </motion.div>
        </div>
      );

    case "appShowcase":
      return (
        <div className="flex flex-col h-full px-8 py-8">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl md:text-5xl font-bold text-primary mb-8 text-center"
          >
            {slide.title}
          </motion.h2>
          <div className="flex-1 flex items-center justify-center gap-4 md:gap-8 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="transform scale-75 md:scale-90"
            >
              <HomeScreenMockup />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="transform scale-75 md:scale-90"
            >
              <ARViewMockup />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="transform scale-75 md:scale-90 hidden lg:block"
            >
              <VoucherMockup />
            </motion.div>
          </div>
        </div>
      );

    case "features":
      return (
        <div className="flex flex-col h-full px-8 py-10">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl md:text-5xl font-bold text-primary mb-10"
          >
            {slide.title}
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-4 flex-1">
            {slide.features?.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="bg-card p-5 rounded-xl border border-border hover:border-primary/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-teal/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      );

    case "userView":
      return (
        <div className="flex flex-col md:flex-row h-full px-8 py-12 gap-8 items-center">
          <div className="flex-1">
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl md:text-5xl font-bold text-teal mb-4"
            >
              {slide.title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-muted-foreground mb-8"
            >
              {slide.subtitle}
            </motion.p>
            <div className="space-y-4">
              {[
                { icon: MapPin, text: "Discover rewards near your location" },
                { icon: Camera, text: "Hunt for 3D rewards through AR camera" },
                { icon: Gift, text: "Claim exclusive discounts and freebies" },
                { icon: Share2, text: "Share deals with friends via WhatsApp" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-4 bg-teal/5 p-4 rounded-xl"
                >
                  <div className="w-10 h-10 rounded-full bg-teal/20 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-teal" />
                  </div>
                  <span className="text-foreground font-medium">
                    {item.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-shrink-0"
          >
            <HomeScreenMockup />
          </motion.div>
        </div>
      );

    case "merchantView":
      return (
        <div className="flex flex-col md:flex-row h-full px-8 py-12 gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-shrink-0"
          >
            <MerchantDashboardMockup />
          </motion.div>
          <div className="flex-1">
            <motion.h2
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl md:text-5xl font-bold text-primary mb-4"
            >
              {slide.title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-muted-foreground mb-8"
            >
              {slide.subtitle}
            </motion.p>
            <div className="space-y-4">
              {[
                { icon: MapPin, text: "Create drops at any GPS location" },
                { icon: Gift, text: "Set reward values and capture limits" },
                {
                  icon: BarChart3,
                  text: "Track claims and redemptions in real-time",
                },
                {
                  icon: QrCode,
                  text: "Scan customer vouchers to validate redemption",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-4 bg-primary/5 p-4 rounded-xl"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground font-medium">
                    {item.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      );

    case "howItWorks":
      return (
        <div className="flex flex-col h-full px-8 py-12">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl md:text-5xl font-bold text-primary mb-12"
          >
            {slide.title}
          </motion.h2>
          <div className="grid md:grid-cols-4 gap-6 flex-1">
            {slide.steps?.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.15 }}
                className="flex flex-col items-center text-center relative"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-teal flex items-center justify-center mb-4 shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">{step.desc}</p>
                {i < 3 && (
                  <div className="hidden md:block absolute top-10 -right-3 w-6">
                    <ChevronRight className="w-6 h-6 text-teal/50" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      );

    case "market":
      return (
        <div className="flex flex-col h-full px-8 py-12">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl md:text-5xl font-bold text-primary mb-12"
          >
            {slide.title}
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8 flex-1">
            {slide.stats?.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.15 }}
                className="flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-teal/10 rounded-2xl p-8"
              >
                <span className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-teal bg-clip-text text-transparent">
                  {stat.value}
                </span>
                <p className="text-lg text-muted-foreground mt-4 text-center">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-8"
          >
            <Badge className="bg-teal/10 text-teal border-teal/20 px-6 py-2 text-lg">
              {slide.context}
            </Badge>
          </motion.div>
        </div>
      );

    case "businessModel":
      return (
        <div className="flex flex-col h-full px-8 py-12">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl md:text-5xl font-bold text-primary mb-12"
          >
            {slide.title}
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-6 flex-1">
            {slide.revenue?.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="bg-card p-6 rounded-xl border border-border hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-teal/20 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-teal" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      );

    case "competitive":
      return (
        <div className="flex flex-col h-full px-8 py-12">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl md:text-5xl font-bold text-primary mb-12"
          >
            {slide.title}
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-6 flex-1">
            {slide.advantages?.map((adv, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-start gap-4 bg-gradient-to-br from-primary/5 to-teal/5 p-6 rounded-xl border border-primary/20"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-teal flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-1">
                    {adv.title}
                  </h3>
                  <p className="text-muted-foreground">{adv.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      );

    case "closing":
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8 bg-gradient-to-br from-background via-primary/5 to-teal/5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-teal flex items-center justify-center mb-8 shadow-2xl"
          >
            <Globe className="w-16 h-16 text-white" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-teal bg-clip-text text-transparent mb-4"
          >
            {slide.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-2xl text-muted-foreground mb-8"
          >
            {slide.tagline}
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-3 bg-primary/10 px-6 py-3 rounded-full"
          >
            <Smartphone className="w-6 h-6 text-primary" />
            <span className="text-xl font-semibold text-primary">
              {slide.cta}
            </span>
          </motion.div>
        </div>
      );

    default:
      return null;
  }
}

export default function PitchDeckPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const goToNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const goToPrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === " ") {
      goToNext();
    } else if (e.key === "ArrowLeft") {
      goToPrev();
    }
  };

  return (
    <div
      className="h-screen w-screen bg-background overflow-hidden flex flex-col"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      data-testid="pitch-deck-container"
    >
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <SlideContent slide={slides[currentSlide]} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between px-8 py-4 border-t border-border bg-card/50 backdrop-blur">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPrev}
          disabled={currentSlide === 0}
          data-testid="button-prev-slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setCurrentSlide(i);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentSlide
                  ? "bg-primary w-6"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              data-testid={`button-slide-dot-${i}`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={goToNext}
          disabled={currentSlide === slides.length - 1}
          data-testid="button-next-slide"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="absolute top-4 right-4 bg-card/80 backdrop-blur px-3 py-1.5 rounded-full text-sm text-muted-foreground border border-border">
        {currentSlide + 1} / {slides.length}
      </div>
    </div>
  );
}
