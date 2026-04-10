"use client";

import { useEffect, useState } from "react";
import type { AuthRole } from "@/lib/auth-tokens";
import { hadAuthCredentials } from "@/lib/auth-session";

export function useHasRoleCredentials(role: AuthRole): boolean {
  const [v, setV] = useState(() =>
    typeof window !== "undefined" ? hadAuthCredentials(role) : false
  );

  useEffect(() => {
    const sync = () => setV(hadAuthCredentials(role));
    sync();
    window.addEventListener("souqsnap-auth-changed", sync);
    return () => window.removeEventListener("souqsnap-auth-changed", sync);
  }, [role]);

  return v;
}
