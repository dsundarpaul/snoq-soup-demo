import { isAfter, isValid, parse, startOfDay, subYears } from "date-fns";

export const HUNTER_MIN_AGE_YEARS = 4;

export const HUNTER_DOB_ZOD_MESSAGE =
  "You must be at least 4 years old. Choose a valid date of birth.";

export function latestAllowedHunterDobDate(now = new Date()): Date {
  return startOfDay(subYears(now, HUNTER_MIN_AGE_YEARS));
}

export function isDisallowedHunterDobCalendarDay(d: Date, now = new Date()): boolean {
  return isAfter(startOfDay(d), latestAllowedHunterDobDate(now));
}

export function isValidHunterDobYmdString(s: string, now = new Date()): boolean {
  const trimmed = s?.trim();
  if (!trimmed) return false;
  const d = parse(trimmed, "yyyy-MM-dd", new Date());
  if (!isValid(d)) return false;
  return !isDisallowedHunterDobCalendarDay(d, now);
}
