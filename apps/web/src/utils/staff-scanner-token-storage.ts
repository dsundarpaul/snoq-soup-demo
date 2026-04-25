const PREFIX = "souq-staff-scanner-token:";

export function readStaffScannerToken(merchantId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(`${PREFIX}${merchantId}`);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export function writeStaffScannerToken(merchantId: string, token: string): void {
  try {
    localStorage.setItem(`${PREFIX}${merchantId}`, token);
  } catch {
    /* ignore quota / private mode */
  }
}
