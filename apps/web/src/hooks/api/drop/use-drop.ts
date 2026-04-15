"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, throwIfResNotOk } from "@/lib/api-client";
import { mapActiveDropsPayload } from "@/lib/nest-mappers";

export const dropQueryKeys = {
  all: ["active-drops"] as const,
  active: () => ["active-drops"] as const,
  activeNear: (lat: number, lng: number, maxDistanceMeters: number) =>
    ["active-drops", "near", lat, lng, maxDistanceMeters] as const,
};

const DEFAULT_NEAR_MAX_M = 100_000;

export function useActiveDropsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: dropQueryKeys.active(),
    queryFn: async () => {
      const res = await apiFetch("GET", "/api/v1/drops/active");
      await throwIfResNotOk(res);
      const json = (await res.json()) as {
        drops?: Record<string, unknown>[];
      };
      return mapActiveDropsPayload(json);
    },
    enabled: options?.enabled !== false,
  });
}

export function useActiveDropsNearQuery(options: {
  lat: number;
  lng: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: dropQueryKeys.activeNear(
      options.lat,
      options.lng,
      DEFAULT_NEAR_MAX_M
    ),
    queryFn: async () => {
      const params = new URLSearchParams({
        lat: String(options.lat),
        lng: String(options.lng),
        maxDistanceMeters: String(DEFAULT_NEAR_MAX_M),
      });
      const res = await apiFetch(
        "GET",
        `/api/v1/drops/active/nearby?${params.toString()}`
      );
      await throwIfResNotOk(res);
      const json = (await res.json()) as {
        drops?: Record<string, unknown>[];
      };
      return mapActiveDropsPayload(json);
    },
    enabled:
      options.enabled !== false &&
      Number.isFinite(options.lat) &&
      Number.isFinite(options.lng),
  });
}
