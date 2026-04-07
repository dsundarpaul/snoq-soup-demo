import { useState, useEffect, useCallback } from "react";

interface DeviceOrientation {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  heading: number | null;
  permissionGranted: boolean;
  hasValidHeading: boolean;
  isCalibrating: boolean;
  error: string | null;
}

export function useDeviceOrientation() {
  const [orientation, setOrientation] = useState<DeviceOrientation>({
    alpha: null,
    beta: null,
    gamma: null,
    heading: null,
    permissionGranted: false,
    hasValidHeading: false,
    isCalibrating: true,
    error: null,
  });

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    let heading: number | null = null;
    let hasValidHeading = false;

    if (
      (event as any).webkitCompassHeading !== undefined &&
      (event as any).webkitCompassHeading !== null
    ) {
      heading = (event as any).webkitCompassHeading;
      hasValidHeading = true;
    } else if (event.absolute && event.alpha !== null) {
      heading = (360 - event.alpha) % 360;
      hasValidHeading = true;
    } else if (event.alpha !== null) {
      heading = (360 - event.alpha) % 360;
      hasValidHeading = true;
    }

    const screenOrientation = window.screen?.orientation?.angle || 0;
    if (heading !== null && screenOrientation !== 0) {
      heading = (heading + screenOrientation) % 360;
    }

    setOrientation({
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma,
      heading: heading,
      permissionGranted: true,
      hasValidHeading: hasValidHeading,
      isCalibrating: !hasValidHeading,
      error: null,
    });
  }, []);

  const requestPermission = useCallback(async () => {
    if (
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      try {
        const permission = await(
          DeviceOrientationEvent as any
        ).requestPermission();
        if (permission === "granted") {
          window.addEventListener("deviceorientation", handleOrientation, true);
          setOrientation((prev) => ({ ...prev, permissionGranted: true }));
        } else {
          setOrientation((prev) => ({
            ...prev,
            error: "Permission denied for device orientation",
          }));
        }
      } catch (err) {
        setOrientation((prev) => ({
          ...prev,
          error: "Failed to request orientation permission",
        }));
      }
    } else {
      window.addEventListener("deviceorientation", handleOrientation, true);
      setOrientation((prev) => ({ ...prev, permissionGranted: true }));
    }
  }, [handleOrientation]);

  useEffect(() => {
    if (!("DeviceOrientationEvent" in window)) {
      setOrientation((prev) => ({
        ...prev,
        error: "Device orientation not supported",
      }));
      return;
    }

    if (
      typeof (DeviceOrientationEvent as any).requestPermission !== "function"
    ) {
      window.addEventListener("deviceorientation", handleOrientation, true);
      setOrientation((prev) => ({ ...prev, permissionGranted: true }));
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [handleOrientation]);

  return { ...orientation, requestPermission };
}

export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const toDeg = (rad: number) => rad * (180 / Math.PI);

  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

  let bearing = toDeg(Math.atan2(y, x));
  bearing = (bearing + 360) % 360;

  return bearing;
}

export function getAngleDifference(heading: number, bearing: number): number {
  let diff = bearing - heading;
  while (diff < -180) diff += 360;
  while (diff > 180) diff -= 360;
  return diff;
}
