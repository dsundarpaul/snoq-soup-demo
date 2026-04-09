"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, throwIfResNotOk } from "@/lib/api-client";
import { mapActiveDropsPayload } from "@/lib/nest-mappers";

export const dropQueryKeys = {
  all: ["active-drops"] as const,
  active: () => ["active-drops"] as const,
};

export function useActiveDropsQuery() {
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
  });
}
