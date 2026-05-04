export const HUNTER_MIN_AGE_YEARS = 4;

function parseYmdLocal(ymd: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) {
    return undefined;
  }
  return dt;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function latestAllowedHunterDobLocal(now: Date): Date {
  return new Date(
    now.getFullYear() - HUNTER_MIN_AGE_YEARS,
    now.getMonth(),
    now.getDate(),
  );
}

export function isValidHunterDobYmdString(
  ymd: string,
  now = new Date(),
): boolean {
  const dob = parseYmdLocal(ymd);
  if (!dob) return false;
  const dobDay = startOfLocalDay(dob);
  const latest = startOfLocalDay(latestAllowedHunterDobLocal(now));
  return dobDay.getTime() <= latest.getTime();
}
