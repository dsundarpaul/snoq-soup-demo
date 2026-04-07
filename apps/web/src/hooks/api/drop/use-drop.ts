"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, throwIfResNotOk } from "@/lib/api-client";
import {
  ACTIVE_DROPS_RADIUS_METERS,
  DEFAULT_ACTIVE_DROPS_LAT,
  DEFAULT_ACTIVE_DROPS_LNG,
} from "@/lib/api-constants";
import { mapActiveDropsPayload } from "@/lib/nest-mappers";

export const dropQueryKeys = {
  all: ["active-drops"] as const,
  active: (lat: number, lng: number, radius: number) =>
    ["active-drops", lat, lng, radius] as const,
};

export function useActiveDropsQuery(
  lat: number | null | undefined,
  lng: number | null | undefined,
  radius = ACTIVE_DROPS_RADIUS_METERS
) {
  const effectiveLat =
    lat != null && Number.isFinite(lat) ? lat : DEFAULT_ACTIVE_DROPS_LAT;
  const effectiveLng =
    lng != null && Number.isFinite(lng) ? lng : DEFAULT_ACTIVE_DROPS_LNG;

  return useQuery({
    queryKey: dropQueryKeys.active(effectiveLat, effectiveLng, radius),
    queryFn: async () => {
      const qs = new URLSearchParams({
        lat: String(effectiveLat),
        lng: String(effectiveLng),
        radius: String(radius),
      });
      const res = await apiFetch(
        "GET",
        `/api/v1/drops/active?${qs.toString()}`
      );
      await throwIfResNotOk(res);
      const json = (await res.json()) as {
        drops?: Record<string, unknown>[];
      };
      return mapActiveDropsPayload(json);
    },
  });
}
