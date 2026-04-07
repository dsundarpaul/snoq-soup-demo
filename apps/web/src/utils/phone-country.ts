export type StaffPhoneCountryCode = "966" | "91";

export const STAFF_PHONE_COUNTRY_CONFIG: Record<
  StaffPhoneCountryCode,
  { label: string; shortLabel: string; maxDigits: number }
> = {
  "966": {
    label: "Saudi Arabia (+966)",
    shortLabel: "+966",
    maxDigits: 9,
  },
  "91": {
    label: "India (+91)",
    shortLabel: "+91",
    maxDigits: 10,
  },
};

export function normalizeStaffPhoneNational(
  country: StaffPhoneCountryCode,
  raw: string
): string {
  const digits = raw.replace(/\D/g, "");
  const max = STAFF_PHONE_COUNTRY_CONFIG[country].maxDigits;
  return digits.slice(0, max);
}

export function formatStaffPhoneE164(
  country: StaffPhoneCountryCode,
  nationalDigits: string
): string {
  return `+${country}${nationalDigits}`;
}

export function isCompleteStaffPhone(
  country: StaffPhoneCountryCode,
  nationalDigits: string
): boolean {
  return (
    nationalDigits.length === STAFF_PHONE_COUNTRY_CONFIG[country].maxDigits
  );
}

export function validateStaffPhoneE164(phone: string): boolean {
  const p = phone.replace(/\s/g, "");
  return /^\+966\d{9}$/.test(p) || /^\+91\d{10}$/.test(p);
}
