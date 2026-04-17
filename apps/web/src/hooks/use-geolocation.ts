import { useCallback, useEffect, useMemo, useState } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
  fromCache: boolean;
}

export interface UseGeolocationOptions extends PositionOptions {
  watch?: boolean;
  cacheTtlMs?: number;
  cacheKey?: string;
}

const DEFAULT_CACHE_KEY = "souqsnap:last-geolocation";
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 10_000;

interface CachedPosition {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  savedAt: number;
}

function readCache(key: string, ttlMs: number): CachedPosition | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPosition;
    if (
      typeof parsed?.latitude !== "number" ||
      typeof parsed?.longitude !== "number" ||
      typeof parsed?.savedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - parsed.savedAt > ttlMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key: string, position: GeolocationPosition): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedPosition = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? null,
      savedAt: Date.now(),
    };
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Storage unavailable (private mode quota, etc.) — silently skip.
  }
}

async function getPermissionState(): Promise<PermissionState | null> {
  if (typeof navigator === "undefined") return null;
  const permissions = (
    navigator as Navigator & { permissions?: Permissions }
  ).permissions;
  if (!permissions?.query) return null;
  try {
    const status = await permissions.query({
      name: "geolocation" as PermissionName,
    });
    return status.state;
  } catch {
    return null;
  }
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    watch = false,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
    cacheKey = DEFAULT_CACHE_KEY,
    enableHighAccuracy = false,
    maximumAge = DEFAULT_MAX_AGE_MS,
    timeout = DEFAULT_TIMEOUT_MS,
  } = options;

  const positionOptions = useMemo<PositionOptions>(
    () => ({ enableHighAccuracy, maximumAge, timeout }),
    [enableHighAccuracy, maximumAge, timeout]
  );

  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState<GeolocationState>(() => {
    const cached = readCache(cacheKey, cacheTtlMs);
    if (cached) {
      return {
        latitude: cached.latitude,
        longitude: cached.longitude,
        accuracy: cached.accuracy,
        error: null,
        loading: false,
        fromCache: true,
      };
    }
    return {
      latitude: null,
      longitude: null,
      accuracy: null,
      error: null,
      loading: true,
      fromCache: false,
    };
  });

  const retry = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
      loading: prev.latitude == null,
    }));
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported",
        loading: false,
      }));
      return;
    }

    let cancelled = false;
    let watchId: number | null = null;

    const handleSuccess = (position: GeolocationPosition) => {
      if (cancelled) return;
      writeCache(cacheKey, position);
      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
        error: null,
        loading: false,
        fromCache: false,
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      if (cancelled) return;
      setState((prev) => ({
        ...prev,
        error: error.message || "Unable to get location",
        loading: prev.latitude == null ? false : prev.loading,
      }));
    };

    const start = async () => {
      const permission = await getPermissionState();
      if (cancelled) return;

      if (permission === "denied") {
        setState((prev) => ({
          ...prev,
          error: "Location permission denied",
          loading: false,
        }));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        positionOptions
      );

      if (watch) {
        watchId = navigator.geolocation.watchPosition(
          handleSuccess,
          handleError,
          positionOptions
        );
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watch, cacheKey, retryKey, positionOptions]);

  return { ...state, retry };
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
