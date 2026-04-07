import { QueryClient, QueryFunction } from "@tanstack/react-query";
import {
  apiFetchMaybeRetry,
  inferAuthRoleFromPath,
  throwIfResNotOk,
} from "@/lib/api-client";
import type { AuthRole } from "@/lib/auth-tokens";

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
  options?: { auth?: AuthRole; deviceId?: string }
): Promise<Response> {
  const role = options?.auth ?? inferAuthRoleFromPath(url);
  const res = await apiFetchMaybeRetry(method, url, {
    body: data,
    auth: role,
    deviceId: options?.deviceId,
  });
  await throwIfResNotOk(res);
  return res;
}

type On401 = "returnNull" | "throw";

export function getQueryFn<T>(options: { on401: On401 }): QueryFunction<T> {
  const { on401 } = options;
  return async ({ queryKey }) => {
    const path = queryKey.join("/") as string;
    const role = inferAuthRoleFromPath(path);
    const res = await apiFetchMaybeRetry("GET", path, { auth: role });
    if (on401 === "returnNull" && res.status === 401) {
      return null as T;
    }
    await throwIfResNotOk(res);
    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
