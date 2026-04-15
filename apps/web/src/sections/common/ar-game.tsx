"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useGeolocation, calculateDistance } from "@/hooks/use-geolocation";
import {
  useDeviceOrientation,
  calculateBearing,
  getAngleDifference,
} from "@/hooks/use-device-orientation";
import { useDeviceId } from "@/hooks/use-device-id";
import { useLanguage } from "@/contexts/language-context";
import { VoucherDisplay } from "@/components/voucher-display";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  MapPin,
  Navigation,
  Trophy,
  AlertCircle,
  Menu,
  ChevronLeft,
  ChevronRight,
  Home,
  Compass,
  ArrowUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Drop, Voucher } from "@shared/schema";
import {
  useActiveDropsQuery,
  useActiveDropsNearQuery,
} from "@/hooks/api/drop/use-drop";
import { getUserFacingApiErrorMessage } from "@/lib/api-client";
import { useClaimVoucherMutation } from "@/hooks/api/voucher/use-voucher";
import {
  useHunterVouchersQuery,
  useTreasureHunterProfileQuery,
  type HunterVoucherRow,
} from "@/hooks/api/treasure-hunter/use-treasure-hunter";
import { toast } from "@/hooks/use-toast";
import {
  buildDropsWithDistanceClaimed,
  getInRangeHuntableDrops,
  type DropWithDistanceClaimed,
} from "@/lib/hunt-drop-filters";

const NEARBY_SWIPE_MIN_DX = 56;
const NEARBY_SWIPE_DOMINANCE = 1.15;

function dropRowToDrop(row: DropWithDistanceClaimed): Drop {
  const { distance: _d, claimed: _c, ...rest } = row;
  return rest as Drop;
}

const DEFAULT_DROP = {
  id: "default-drop",
  merchantId: "demo-merchant",
  name: "Golden Cup Challenge",
  description: "Find the Golden Cup and claim your reward!",
  latitude: 24.7136,
  longitude: 46.6753,
  radius: 15,
  rewardValue: "50% OFF",
  logoUrl: null,
  termsAndConditions: null,
  redemptionType: "anytime" as const,
  redemptionMinutes: null,
  active: true,
  startDate: null,
  endDate: null,
  createdAt: new Date(),
};

interface ARCameraViewProps {
  userLat: number;
  userLon: number;
  targetLat: number;
  targetLon: number;
  isInRange: boolean;
  distance: number;
  logoUrl?: string | null;
  dropName: string;
}

function ARCameraView({
  userLat,
  userLon,
  targetLat,
  targetLon,
  isInRange,
  distance,
  logoUrl,
  dropName,
}: ARCameraViewProps) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const {
    heading,
    permissionGranted,
    requestPermission,
    hasValidHeading,
    isCalibrating,
    error: orientationError,
  } = useDeviceOrientation();
  const [needsPermission, setNeedsPermission] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    const startCamera = async () => {
      setCameraError(null);
      setCameraActive(false);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        console.error("Camera error:", err);
        if (!cancelled) {
          setCameraError(t("ar.cameraDenied"));
          setCameraActive(false);
        }
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraAttempt, t]);

  useEffect(() => {
    if (
      typeof (DeviceOrientationEvent as any).requestPermission === "function" &&
      !permissionGranted
    ) {
      setNeedsPermission(true);
    }
  }, [permissionGranted]);

  const bearing = useMemo(() => {
    return calculateBearing(userLat, userLon, targetLat, targetLon);
  }, [userLat, userLon, targetLat, targetLon]);

  const angleDiff = useMemo(() => {
    if (heading === null || !hasValidHeading) return null;
    return getAngleDifference(heading, bearing);
  }, [heading, bearing, hasValidHeading]);

  const isVisible = angleDiff !== null && Math.abs(angleDiff) < 45;

  const horizontalPosition = useMemo(() => {
    if (angleDiff === null) return window.innerWidth / 2;
    const screenWidth = window.innerWidth;
    const centerX = screenWidth / 2;
    const pixelsPerDegree = screenWidth / 60;
    const rawPosition = centerX + angleDiff * pixelsPerDegree;
    const padding = 60;
    return Math.max(padding, Math.min(screenWidth - padding, rawPosition));
  }, [angleDiff]);

  const scale = useMemo(() => {
    if (distance <= 0) return 4.0;

    // More dramatic perspective scaling for clear visual feedback
    const minScale = 0.3; // Very small at far distance
    const maxScale = 4.0; // Very large when close
    const maxDistance = 200; // Reduced for more noticeable changes

    // Inverse square-ish scaling for realistic depth perception
    const clampedDistance = Math.min(Math.max(distance, 1), maxDistance);

    // This formula gives dramatic size changes:
    // At 1m: ~4.0, at 5m: ~2.8, at 10m: ~2.0, at 15m: ~1.6, at 30m: ~1.0, at 100m: ~0.5
    const scaleFactor = 1 / Math.sqrt(clampedDistance / 5);
    const scale = Math.max(minScale, Math.min(maxScale, scaleFactor * 2));

    return scale;
  }, [distance]);

  const verticalPosition = useMemo(() => {
    const screenHeight = window.innerHeight;
    const horizonY = screenHeight * 0.35;
    const groundY = screenHeight * 0.55;
    const maxDistance = 500;
    const clampedDistance = Math.min(distance, maxDistance);
    const normalizedDistance = clampedDistance / maxDistance;
    const verticalRange = groundY - horizonY;
    return horizonY + (1 - normalizedDistance) * verticalRange;
  }, [distance]);

  if (cameraError) {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-primary/20 to-slate-900 flex items-center justify-center">
        <div className="text-center p-6 max-w-sm">
          <AlertCircle className="w-16 h-16 text-teal mx-auto mb-4" />
          <p className="text-white text-lg mb-2">{t("ar.cameraRequired")}</p>
          <p className="text-slate-400 text-sm mb-4">{cameraError}</p>
          <p className="text-slate-500 text-xs mb-4">
            {t("ar.permissionsSettingsHint")}
          </p>
          <Button
            className="bg-primary text-white"
            onClick={() => setCameraAttempt((n) => n + 1)}
          >
            {t("scanner.tryAgain")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        data-testid="camera-view"
      />

      {cameraActive && needsPermission && !permissionGranted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
          <Card className="p-6 m-4 bg-background/95 backdrop-blur">
            <div className="text-center">
              <Compass className="w-12 h-12 text-teal mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t("ar.enableArMode")}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("ar.compassDesc")}
              </p>
              {orientationError ? (
                <p className="text-sm text-destructive mb-4">
                  {orientationError}
                </p>
              ) : null}
              <Button
                onClick={() => void requestPermission()}
                className="bg-primary text-white"
              >
                {t("ar.enableCompass")}
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                {t("ar.permissionsSettingsHint")}
              </p>
            </div>
          </Card>
        </div>
      )}

      {cameraActive && (permissionGranted || !needsPermission) && (
        <>
          {isCalibrating || angleDiff === null ? (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-teal/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Compass
                    className="w-12 h-12 text-teal animate-spin"
                    style={{ animationDuration: "3s" }}
                  />
                </div>
                <div className="bg-black/70 backdrop-blur px-4 py-2 rounded-full text-white text-sm">
                  {t("ar.calibrating")}
                </div>
              </div>
            </div>
          ) : isVisible ? (
            <div
              className="absolute pointer-events-none transition-all duration-100 ease-out"
              style={{
                left: `${horizontalPosition}px`,
                top: `${verticalPosition}px`,
                transform: `translate(-50%, -50%) scale(${scale})`,
                perspective: "800px",
              }}
              data-testid="ar-trophy"
            >
              <div
                className={`relative ${isInRange ? "animate-bounce" : ""}`}
                style={{ perspective: "1000px" }}
              >
                {/* Outer glow ring */}
                <div
                  className={`w-32 h-32 rounded-full ${
                    isInRange ? "bg-teal/40 animate-ping" : "bg-teal/20"
                  } absolute -inset-2`}
                  style={{ animationDuration: "2s" }}
                />

                {/* 3D Rotating Coin/Medallion */}
                <div
                  className="ar-coin-3d w-28 h-28 relative"
                  style={{
                    transformStyle: "preserve-3d",
                    animation: "coinSpin 3s linear infinite",
                  }}
                >
                  {/* Front face of coin - positioned slightly forward */}
                  <div
                    className="absolute inset-0 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #14B8A6 0%, #0D9488 50%, #14B8A6 100%)",
                      boxShadow: isInRange
                        ? "0 0 30px rgba(20, 184, 166, 0.8), inset 0 0 20px rgba(255,255,255,0.3)"
                        : "0 0 15px rgba(20, 184, 166, 0.5), inset 0 0 10px rgba(255,255,255,0.2)",
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "translateZ(2px)",
                      border: "3px solid rgba(255,255,255,0.3)",
                    }}
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Reward"
                        className="w-20 h-20 rounded-full object-cover"
                        style={{
                          border: "2px solid rgba(255,255,255,0.5)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                          backgroundColor: "white",
                        }}
                      />
                    ) : (
                      <svg
                        className="w-16 h-16 text-white drop-shadow-lg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M5 3h14c.5 0 1 .5 1 1l-2 8H6L4 4c0-.5.5-1 1-1z" />
                        <path d="M7 12h10l-1.5 6c-.1.5-.5.8-1 .8H9.5c-.5 0-.9-.3-1-.8L7 12z" />
                        <ellipse cx="12" cy="21" rx="3" ry="1" opacity="0.3" />
                      </svg>
                    )}
                  </div>

                  {/* Back face of coin - rotated 180deg and positioned slightly back */}
                  <div
                    className="absolute inset-0 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #7C3AED 100%)",
                      boxShadow: isInRange
                        ? "0 0 30px rgba(124, 58, 237, 0.8), inset 0 0 20px rgba(255,255,255,0.3)"
                        : "0 0 15px rgba(124, 58, 237, 0.5), inset 0 0 10px rgba(255,255,255,0.2)",
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(180deg) translateZ(2px)",
                      border: "3px solid rgba(255,255,255,0.3)",
                    }}
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Reward"
                        className="w-20 h-20 rounded-full object-cover"
                        style={{
                          border: "2px solid rgba(255,255,255,0.5)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                          backgroundColor: "white",
                        }}
                      />
                    ) : (
                      <svg
                        className="w-16 h-16 text-white drop-shadow-lg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M5 3h14c.5 0 1 .5 1 1l-2 8H6L4 4c0-.5.5-1 1-1z" />
                        <path d="M7 12h10l-1.5 6c-.1.5-.5.8-1 .8H9.5c-.5 0-.9-.3-1-.8L7 12z" />
                        <ellipse cx="12" cy="21" rx="3" ry="1" opacity="0.3" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Shadow on ground */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-20 h-4 rounded-full bg-black/30 blur-sm"
                  style={{
                    bottom: "-20px",
                    animation: "shadowPulse 3s linear infinite",
                  }}
                />

                <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <span className="bg-black/70 text-white text-xs px-2 py-1 rounded-full backdrop-blur">
                    {distance < 1000
                      ? `${Math.round(distance)}m`
                      : `${(distance / 1000).toFixed(1)}km`}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 pointer-events-none">
              <div
                className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-2 ${
                  angleDiff > 0 ? "right-4" : "left-4"
                }`}
              >
                <div
                  className={`flex items-center gap-2 bg-teal/90 text-black px-4 py-2 rounded-full shadow-lg ${
                    angleDiff > 0 ? "flex-row-reverse" : ""
                  }`}
                >
                  <ArrowUp
                    className={`w-5 h-5 transition-transform ${
                      angleDiff > 0 ? "rotate-90" : "-rotate-90"
                    }`}
                  />
                  <span className="text-sm font-semibold">
                    {Math.round(Math.abs(angleDiff))}°
                  </span>
                </div>
              </div>
              <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
                <div className="bg-black/70 backdrop-blur px-4 py-2 rounded-full text-white text-sm">
                  {t("ar.turnToFind", {
                    direction:
                      angleDiff > 0 ? t("ar.turnRight") : t("ar.turnLeft"),
                  })}{" "}
                  <span className="text-teal font-semibold">{dropName}</span>
                </div>
              </div>
            </div>
          )}

          <div className="absolute top-20 left-4 bg-black/50 backdrop-blur px-3 py-2 rounded-lg">
            <div className="flex items-center gap-2 text-white text-sm">
              <Compass className="w-4 h-4 text-teal" />
              <span>{heading !== null ? `${Math.round(heading)}°` : "--"}</span>
            </div>
          </div>
        </>
      )}

      {cameraActive && orientationError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`relative ${isInRange ? "animate-bounce" : ""}`}>
            <div
              className={`w-24 h-24 rounded-full ${
                isInRange ? "bg-teal/30 animate-ping" : "bg-teal/10"
              } absolute inset-0`}
            />
            <div
              className={`w-24 h-24 rounded-full ${
                isInRange ? "bg-teal/40" : "bg-teal/20"
              } flex items-center justify-center relative`}
            >
              <svg
                className={`w-12 h-12 ${
                  isInRange ? "text-teal" : "text-teal/50"
                }`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M5 3h14c.5 0 1 .5 1 1l-2 8H6L4 4c0-.5.5-1 1-1z" />
                <path d="M7 12h10l-1.5 6c-.1.5-.5.8-1 .8H9.5c-.5 0-.9-.3-1-.8L7 12z" />
                <ellipse cx="12" cy="21" rx="3" ry="1" opacity="0.3" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CaptureAnimationInner({ onComplete }: { onComplete: () => void }) {
  const { t } = useLanguage();
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; color: string; delay: number }>
  >([]);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const colors = ["#14B8A6", "#7C3AED", "#5B21B6", "#FFFFFF", "#0D9488"];
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
    }));
    setParticles(newParticles);

    const timer = setTimeout(() => onCompleteRef.current(), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-3 h-3 rounded-full animate-ping"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: "1s",
          }}
        />
      ))}

      <div className="relative flex flex-col items-center text-center animate-bounce">
        <div className="relative w-32 h-32 shrink-0">
          <div
            className="w-32 h-32 rounded-full bg-teal/30 absolute inset-0 animate-ping"
            style={{ animationDuration: "1s" }}
          />
          <div className="w-32 h-32 rounded-full bg-teal/50 flex items-center justify-center relative">
            <svg
              className="w-16 h-16 text-teal"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M5 3h14c.5 0 1 .5 1 1l-2 8H6L4 4c0-.5.5-1 1-1z" />
              <path d="M7 12h10l-1.5 6c-.1.5-.5.8-1 .8H9.5c-.5 0-.9-.3-1-.8L7 12z" />
            </svg>
          </div>
        </div>
        <h2 className="text-3xl font-bold text-teal mt-6 animate-pulse">
          {t("ar.captured")}
        </h2>
        <p className="text-white/80 mt-2">{t("ar.rewardClaimed")}</p>
      </div>
    </div>
  );
}

export default function ARGamePage() {
  const { t } = useLanguage();
  const geo = useGeolocation();
  const locationReady =
    !geo.loading &&
    geo.latitude !== null &&
    geo.longitude !== null &&
    !geo.error;
  const locationBlocked = !geo.loading && geo.error !== null;
  const deviceId = useDeviceId();
  const searchParams = useSearchParams();
  const targetDropId = searchParams.get("drop");
  const nearbySwipeFromHome =
    searchParams.get("readySwipe") === "1" ||
    searchParams.get("nearbySwipe") === "1";

  const { data: hunterProfile } = useTreasureHunterProfileQuery();
  const { data: hunterVoucherBuckets } = useHunterVouchersQuery();

  const unredeemedRows = hunterVoucherBuckets?.unredeemed ?? [];
  const redeemedRows = hunterVoucherBuckets?.redeemed ?? [];
  const allVoucherRows = useMemo(
    () => [...unredeemedRows, ...redeemedRows],
    [unredeemedRows, redeemedRows]
  );

  const claimedDropIdSet = useMemo(() => {
    const s = new Set<string>();
    for (const row of allVoucherRows) {
      s.add(row.voucher.dropId);
    }
    return s;
  }, [allVoucherRows]);

  const hasClaimedDrop = useCallback(
    (dropId: string) => claimedDropIdSet.has(dropId),
    [claimedDropIdSet]
  );
  const [dismissedClaimDropId, setDismissedClaimDropId] = useState<
    string | null
  >(null);
  const [claimedVoucher, setClaimedVoucher] = useState<HunterVoucherRow | null>(
    null
  );
  const [showCaptureAnimation, setShowCaptureAnimation] = useState(false);
  const [pendingVoucher, setPendingVoucher] = useState<{
    voucher: Voucher;
    drop: Drop;
  } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [nearbySwipeIndex, setNearbySwipeIndex] = useState(0);
  const [nearbySwipeSlideDirection, setNearbySwipeSlideDirection] = useState<
    1 | -1
  >(1);
  const nearbySwipeTouchStart = useRef<{ x: number; y: number } | null>(null);

  const hasGeoCoords =
    geo.latitude != null &&
    geo.longitude != null &&
    Number.isFinite(geo.latitude) &&
    Number.isFinite(geo.longitude);

  const [arFabNearQueryCoords, setArFabNearQueryCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    if (!nearbySwipeFromHome) {
      setArFabNearQueryCoords(null);
      return;
    }
    if (arFabNearQueryCoords !== null) return;
    if (hasGeoCoords) {
      setArFabNearQueryCoords({
        lat: geo.latitude as number,
        lng: geo.longitude as number,
      });
    }
  }, [
    nearbySwipeFromHome,
    hasGeoCoords,
    geo.latitude,
    geo.longitude,
    arFabNearQueryCoords,
  ]);

  const { data: allDrops = [], isLoading: allDropsLoading } =
    useActiveDropsQuery({
      enabled: !nearbySwipeFromHome || !hasGeoCoords,
    });

  const { data: nearDrops = [], isLoading: nearDropsLoading } =
    useActiveDropsNearQuery({
      lat: arFabNearQueryCoords?.lat ?? 0,
      lng: arFabNearQueryCoords?.lng ?? 0,
      enabled: nearbySwipeFromHome && arFabNearQueryCoords !== null,
    });

  const drops =
    nearbySwipeFromHome && arFabNearQueryCoords !== null
      ? nearDrops
      : allDrops;
  const dropsLoading = nearbySwipeFromHome
    ? arFabNearQueryCoords !== null
      ? nearDropsLoading
      : allDropsLoading || geo.loading
    : allDropsLoading;

  const dropsWithDistance = useMemo(
    () =>
      buildDropsWithDistanceClaimed(
        drops,
        geo.latitude,
        geo.longitude,
        calculateDistance,
        hasClaimedDrop
      ),
    [drops, geo.latitude, geo.longitude, hasClaimedDrop]
  );

  const nearbySwipeList = useMemo(() => {
    if (!nearbySwipeFromHome) return [];
    return getInRangeHuntableDrops(dropsWithDistance);
  }, [nearbySwipeFromHome, dropsWithDistance]);

  const nearbySwipeIds = useMemo(
    () => nearbySwipeList.map((d) => d.id).join(","),
    [nearbySwipeList]
  );

  useEffect(() => {
    if (!nearbySwipeFromHome) {
      setNearbySwipeIndex(0);
      return;
    }
    if (nearbySwipeList.length === 0) {
      setNearbySwipeIndex(0);
      return;
    }
    if (targetDropId) {
      const ti = nearbySwipeList.findIndex((d) => d.id === targetDropId);
      if (ti >= 0) {
        setNearbySwipeIndex(ti);
        return;
      }
    }
    setNearbySwipeIndex((prev) =>
      prev < nearbySwipeList.length ? prev : 0
    );
  }, [nearbySwipeFromHome, targetDropId, nearbySwipeIds, nearbySwipeList.length]);

  const activeDrop = useMemo(() => {
    if (nearbySwipeFromHome && nearbySwipeList.length > 0) {
      if (targetDropId) {
        const targetInNearby = nearbySwipeList.some(
          (d) => d.id === targetDropId
        );
        if (!targetInNearby) {
          const targetDrop = drops.find((d) => d.id === targetDropId);
          if (targetDrop) return targetDrop;
        }
      }
      const row =
        nearbySwipeList[nearbySwipeIndex % nearbySwipeList.length];
      return dropRowToDrop(row);
    }
    if (targetDropId) {
      const targetDrop = drops.find((d) => d.id === targetDropId);
      if (targetDrop) return targetDrop;
    }
    const unclaimedRows = dropsWithDistance.filter((r) => !r.claimed);
    if (unclaimedRows.length > 0) {
      return dropRowToDrop(unclaimedRows[0]);
    }
    if (dropsWithDistance.length > 0) {
      return dropRowToDrop(dropsWithDistance[0]);
    }
    return drops.length > 0 ? drops[0] : DEFAULT_DROP;
  }, [
    nearbySwipeFromHome,
    nearbySwipeList,
    nearbySwipeIndex,
    targetDropId,
    drops,
    dropsWithDistance,
  ]);

  const distance = useMemo(() => {
    if (!geo.latitude || !geo.longitude || !activeDrop) return null;
    return calculateDistance(
      geo.latitude,
      geo.longitude,
      activeDrop.latitude,
      activeDrop.longitude
    );
  }, [geo.latitude, geo.longitude, activeDrop]);

  const isInRange = distance !== null && distance <= (activeDrop?.radius || 15);
  const alreadyClaimed = activeDrop ? hasClaimedDrop(activeDrop.id) : false;

  const offListTargetBlocksNearbySwipe =
    nearbySwipeFromHome &&
    Boolean(targetDropId) &&
    nearbySwipeList.length > 0 &&
    !nearbySwipeList.some((d) => d.id === targetDropId);

  const canSwipeNearbyHunts =
    nearbySwipeFromHome &&
    nearbySwipeList.length > 1 &&
    !offListTargetBlocksNearbySwipe &&
    !claimedVoucher &&
    !showCaptureAnimation;

  const handleNearbySwipeTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!canSwipeNearbyHunts) return;
      const touch = e.touches[0];
      if (!touch) return;
      nearbySwipeTouchStart.current = { x: touch.clientX, y: touch.clientY };
    },
    [canSwipeNearbyHunts]
  );

  const handleNearbySwipeTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!canSwipeNearbyHunts || !nearbySwipeTouchStart.current) return;
      const touch = e.changedTouches[0];
      if (!touch) {
        nearbySwipeTouchStart.current = null;
        return;
      }
      const dx = touch.clientX - nearbySwipeTouchStart.current.x;
      const dy = touch.clientY - nearbySwipeTouchStart.current.y;
      nearbySwipeTouchStart.current = null;
      if (Math.abs(dx) < NEARBY_SWIPE_MIN_DX) return;
      if (Math.abs(dx) < Math.abs(dy) * NEARBY_SWIPE_DOMINANCE) return;
      const len = nearbySwipeList.length;
      if (len < 2) return;
      if (dx < 0) {
        setNearbySwipeSlideDirection(1);
        setNearbySwipeIndex((i) => (i + 1) % len);
      } else {
        setNearbySwipeSlideDirection(-1);
        setNearbySwipeIndex((i) => (i - 1 + len) % len);
      }
    },
    [canSwipeNearbyHunts, nearbySwipeList.length]
  );

  const nearbySwipeDotCount = nearbySwipeList.length;
  const nearbySwipeActiveDot =
    nearbySwipeDotCount > 0
      ? ((nearbySwipeIndex % nearbySwipeDotCount) + nearbySwipeDotCount) %
        nearbySwipeDotCount
      : 0;

  const goToNearbySwipeIndex = useCallback(
    (targetIdx: number) => {
      const len = nearbySwipeList.length;
      if (len < 2) return;
      const cur =
        ((nearbySwipeIndex % len) + len) % len;
      const next = ((targetIdx % len) + len) % len;
      if (next === cur) return;
      const forwardDist = (next - cur + len) % len;
      const backwardDist = (cur - next + len) % len;
      setNearbySwipeSlideDirection(forwardDist <= backwardDist ? 1 : -1);
      setNearbySwipeIndex(next);
    },
    [nearbySwipeIndex, nearbySwipeList.length]
  );

  const stepNearbySwipePrev = useCallback(() => {
    const len = nearbySwipeList.length;
    if (len < 2 || !canSwipeNearbyHunts) return;
    setNearbySwipeSlideDirection(-1);
    setNearbySwipeIndex((i) => (i - 1 + len) % len);
  }, [canSwipeNearbyHunts, nearbySwipeList.length]);

  const stepNearbySwipeNext = useCallback(() => {
    const len = nearbySwipeList.length;
    if (len < 2 || !canSwipeNearbyHunts) return;
    setNearbySwipeSlideDirection(1);
    setNearbySwipeIndex((i) => (i + 1) % len);
  }, [canSwipeNearbyHunts, nearbySwipeList.length]);

  const claimMutation = useClaimVoucherMutation({
    onSuccess: (data) => {
      setPendingVoucher(data);
      setShowCaptureAnimation(true);
    },
  });

  useEffect(() => {
    claimMutation.reset();
  }, [activeDrop?.id, claimMutation.reset]);

  const handleAnimationComplete = () => {
    setShowCaptureAnimation(false);
    if (pendingVoucher) {
      setClaimedVoucher({
        ...pendingVoucher,
        businessName: "",
        merchantStoreLocation: null,
        merchantBusinessPhone: null,
        merchantBusinessHours: null,
      });
      setPendingVoucher(null);
    }
  };

  const handleClaim = () => {
    if (
      activeDrop &&
      locationReady &&
      isInRange &&
      !alreadyClaimed &&
      deviceId
    ) {
      const hunterId =
        typeof hunterProfile?.id === "string" ? hunterProfile.id : undefined;

      if (!hunterId) {
        toast({
          title: t("common.error"),
          variant: "destructive",
        });
        return;
      }

      claimMutation.mutate({
        dropId: activeDrop.id,
        deviceId,
        ...(hunterId ? { hunterId } : {}),
      });
    }
  };

  useEffect(() => {
    setDismissedClaimDropId(null);
  }, [activeDrop?.id]);

  useEffect(() => {
    const existingVoucher = allVoucherRows.find(
      (v) => v.voucher.dropId === activeDrop?.id
    );
    if (
      existingVoucher &&
      !claimedVoucher &&
      activeDrop &&
      dismissedClaimDropId !== activeDrop.id
    ) {
      setClaimedVoucher({
        voucher: existingVoucher.voucher,
        drop: existingVoucher.drop,
        businessName: existingVoucher.businessName,
        merchantStoreLocation: existingVoucher.merchantStoreLocation,
        merchantBusinessPhone: existingVoucher.merchantBusinessPhone,
        merchantBusinessHours: existingVoucher.merchantBusinessHours,
      });
    }
  }, [allVoucherRows, activeDrop, claimedVoucher, dismissedClaimDropId]);

  useEffect(() => {
    setClaimedVoucher((prev) => {
      if (!prev?.voucher.id) return prev;
      if (
        prev.businessName ||
        prev.merchantStoreLocation ||
        prev.merchantBusinessPhone
      ) {
        return prev;
      }
      const row = allVoucherRows.find((r) => r.voucher.id === prev.voucher.id);
      if (
        !row ||
        (!row.businessName &&
          !row.merchantStoreLocation &&
          !row.merchantBusinessPhone)
      ) {
        return prev;
      }
      return {
        voucher: row.voucher,
        drop: row.drop,
        businessName: row.businessName,
        merchantStoreLocation: row.merchantStoreLocation,
        merchantBusinessPhone: row.merchantBusinessPhone,
        merchantBusinessHours: row.merchantBusinessHours,
      };
    });
  }, [allVoucherRows]);

  const handleBackFromClaimedVoucher = () => {
    if (activeDrop) {
      setDismissedClaimDropId(activeDrop.id);
    }
    setClaimedVoucher(null);
  };

  const huntDropBottomPanel = (
    <>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-teal/20 flex items-center justify-center overflow-hidden">
          {activeDrop?.logoUrl ? (
            <img
              src={activeDrop.logoUrl}
              alt=""
              className="w-full h-full object-cover bg-white"
            />
          ) : (
            <Trophy className="w-6 h-6 text-teal" />
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-white truncate min-w-0 flex-1">
              {activeDrop?.name || t("common.loading")}
            </h3>
            <Badge className="shrink-0 bg-teal text-teal-foreground flex items-center gap-1 max-w-[45%]">
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{activeDrop?.rewardValue}</span>
            </Badge>
          </div>
          <p className="text-sm text-slate-400 line-clamp-2">
            {activeDrop?.description || t("drop.claimYourReward")}
          </p>
        </div>
      </div>

      {activeDrop?.termsAndConditions?.trim() ? (
        <div className="mb-3 max-h-24 overflow-y-auto rounded-md border border-white/10 bg-black/50 p-2 text-left">
          <p className="text-xs font-semibold text-teal mb-1">
            {t("voucher.termsTitle")}
          </p>
          <p className="text-xs text-slate-300 whitespace-pre-wrap">
            {activeDrop.termsAndConditions}
          </p>
        </div>
      ) : null}

      {alreadyClaimed ? (
        <Button
          className="w-full bg-primary text-primary-foreground"
          onClick={() => {
            const v = allVoucherRows.find(
              (row) => row.voucher.dropId === activeDrop?.id
            );
            if (v) setClaimedVoucher(v);
          }}
          data-testid="button-view-voucher"
        >
          <Trophy className="w-4 h-4 mr-2" />
          {t("voucher.viewVoucher")}
        </Button>
      ) : isInRange && locationReady ? (
        <Button
          onClick={handleClaim}
          disabled={claimMutation.isPending}
          className="w-full bg-teal hover:bg-teal/90 text-teal-foreground font-semibold py-6 text-lg rounded-full shadow-lg animate-pulse"
          data-testid="button-claim-reward"
        >
          {claimMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {t("common.loading")}
            </>
          ) : (
            <>
              <Trophy className="w-5 h-5 mr-2" />
              {t("drop.claimReward")}
            </>
          )}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">
              {t("drop.getWithinRange", {
                radius: String(activeDrop?.radius || 15),
              })}
            </span>
          </div>

          {distance !== null && distance > 50 && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-amber-400">
                {distance >= 1000
                  ? `${(distance / 1000).toFixed(1)} km ${t("ar.toDestination")}`
                  : `${Math.round(distance)}m ${t("ar.toDestination")}`}
              </span>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full border-teal/30 text-teal"
            onClick={() => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${activeDrop?.latitude},${activeDrop?.longitude}`;
              window.open(url, "_blank");
            }}
            data-testid="button-get-directions"
          >
            <Navigation className="w-4 h-4 mr-2" />
            {t("drop.getDirections")}
          </Button>
        </div>
      )}

      {claimMutation.isError && (
        <p className="text-red-400 text-sm text-center mt-2">
          {getUserFacingApiErrorMessage(claimMutation.error) ??
            t("toast.somethingWentWrong")}
        </p>
      )}
    </>
  );

  if (showCaptureAnimation) {
    return <CaptureAnimationInner onComplete={handleAnimationComplete} />;
  }

  if (claimedVoucher) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={handleBackFromClaimedVoucher}
          data-testid="button-back-to-hunt"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          {t("nav.backToHunt")}
        </Button>
        <VoucherDisplay
          voucher={claimedVoucher.voucher}
          drop={claimedVoucher.drop}
          businessName={claimedVoucher.businessName}
          merchantStoreLocation={claimedVoucher.merchantStoreLocation}
          merchantBusinessPhone={claimedVoucher.merchantBusinessPhone}
          merchantBusinessHours={claimedVoucher.merchantBusinessHours}
        />
      </div>
    );
  }

  return (
    <div
      className="h-screen w-screen overflow-hidden relative bg-slate-900"
      onTouchStart={handleNearbySwipeTouchStart}
      onTouchEnd={handleNearbySwipeTouchEnd}
    >
      <ARCameraView
        userLat={geo.latitude || 24.7136}
        userLon={geo.longitude || 46.6753}
        targetLat={activeDrop?.latitude || 24.7136}
        targetLon={activeDrop?.longitude || 46.6753}
        isInRange={locationReady && isInRange}
        distance={locationReady ? distance || 0 : 0}
        logoUrl={activeDrop?.logoUrl}
        dropName={activeDrop?.name || t("voucher.reward")}
      />

      {locationBlocked ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-4">
          <Card className="max-w-sm w-full p-6 bg-background/95 backdrop-blur border-teal/30">
            <div className="text-center">
              <MapPin className="w-14 h-14 text-teal mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">
                {t("ar.locationRequired")}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {t("ar.locationRequiredDesc")}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {t("ar.permissionsSettingsHint")}
              </p>
              <Button
                className="w-full bg-primary text-primary-foreground"
                onClick={() => geo.retry()}
              >
                {t("scanner.tryAgain")}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button
                variant="ghost"
                size="icon"
                className="bg-slate-900/80 backdrop-blur-sm"
                data-testid="button-home"
              >
                <Home className="w-5 h-5 text-white" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="bg-slate-900/80 backdrop-blur-sm"
              onClick={() => setShowMenu(!showMenu)}
              data-testid="button-menu"
            >
              <Menu className="w-5 h-5 text-white" />
            </Button>
          </div>

          <Card className="bg-slate-900/80 backdrop-blur-sm border-teal/30 px-4 py-2">
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  geo.loading
                    ? "bg-yellow-500 animate-pulse"
                    : geo.error
                    ? "bg-red-500"
                    : "bg-green-500"
                }`}
              />
              {geo.loading ? (
                <span className="text-white text-sm">{t("gps.locating")}</span>
              ) : geo.error ? (
                <span className="text-red-400 text-sm">
                  {t("gps.gpsError")}
                </span>
              ) : (
                <div className="text-right">
                  <p className="text-teal text-xs font-mono">
                    {geo.latitude?.toFixed(4)}, {geo.longitude?.toFixed(4)}
                  </p>
                  {distance !== null && (
                    <p
                      className={`text-sm font-semibold ${
                        isInRange ? "text-green-400" : "text-white"
                      }`}
                    >
                      {distance < 1000
                        ? `${Math.round(distance)}m ${t("ar.away")}`
                        : `${(distance / 1000).toFixed(1)}km ${t("ar.away")}`}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {showMenu && (
          <Card className="mt-2 bg-slate-900/95 backdrop-blur-sm border-teal/30 p-4">
            <nav className="space-y-2">
              <a
                href="/merchant"
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 text-white"
              >
                <Trophy className="w-5 h-5 text-teal" />
                <span>{t("merchant.portal")}</span>
              </a>
            </nav>
          </Card>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pb-8">
        <Card className="bg-slate-900/90 backdrop-blur-sm border-teal/30 p-4">
          {canSwipeNearbyHunts ? (
            <p className="text-center text-xs text-slate-400 mb-2">
              {t("ar.swipeNearbyHuntsHint")}
            </p>
          ) : null}
          {canSwipeNearbyHunts && nearbySwipeDotCount >= 2 ? (
            <div className="flex items-center justify-center gap-2 mb-3 select-none">
              <button
                type="button"
                onClick={stepNearbySwipePrev}
                className={cn(
                  "shrink-0 rounded-md p-1.5 text-teal/90 transition-colors",
                  "hover:bg-white/10 hover:text-teal focus:outline-none",
                  "focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                )}
                aria-label={t("ar.previousHunt")}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <div className="flex items-center justify-center gap-1.5 min-w-0 flex-1">
                {nearbySwipeList.map((d, i) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => goToNearbySwipeIndex(i)}
                    className={cn(
                      "h-2 rounded-full shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                      i === nearbySwipeActiveDot
                        ? "w-4 bg-teal"
                        : "w-2 bg-slate-600 hover:bg-slate-500"
                    )}
                    aria-label={`${i + 1} / ${nearbySwipeDotCount}`}
                    aria-current={
                      i === nearbySwipeActiveDot ? "step" : undefined
                    }
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={stepNearbySwipeNext}
                className={cn(
                  "shrink-0 rounded-md p-1.5 text-teal/90 transition-colors",
                  "hover:bg-white/10 hover:text-teal focus:outline-none",
                  "focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                )}
                aria-label={t("ar.nextHunt")}
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : null}
          {canSwipeNearbyHunts && activeDrop ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeDrop.id}
                initial={{
                  opacity: 0,
                  x: nearbySwipeSlideDirection * 28,
                }}
                animate={{ opacity: 1, x: 0 }}
                exit={{
                  opacity: 0,
                  x: nearbySwipeSlideDirection * -28,
                }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {huntDropBottomPanel}
              </motion.div>
            </AnimatePresence>
          ) : (
            huntDropBottomPanel
          )}
        </Card>
      </div>

      {distance !== null && distance <= 50 && !isInRange && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-5">
          <div className="relative">
            <div className="absolute inset-0 w-40 h-40 rounded-full bg-teal/20 animate-ping" />
            <div className="w-40 h-40 rounded-full bg-teal/10 border-2 border-teal/50 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-teal">
                  {Math.round(distance)}m
                </p>
                <p className="text-sm text-teal/70">{t("status.inRange")}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
