import { endOfDay, isValid, parse, startOfDay } from "date-fns";
import type { AnalyticsData } from "./merchant-dashboard.types";

function parseChartDay(value: string): number {
  const iso = Date.parse(value);
  if (!Number.isNaN(iso)) return iso;
  const d = parse(value, "yyyy-MM-dd", new Date());
  return isValid(d) ? d.getTime() : NaN;
}

export function filterAnalyticsByRange(
  data: AnalyticsData,
  fromYmd: string,
  toYmd: string
): AnalyticsData {
  const from = startOfDay(parse(fromYmd, "yyyy-MM-dd", new Date()));
  const to = endOfDay(parse(toYmd, "yyyy-MM-dd", new Date()));
  if (!isValid(from) || !isValid(to)) {
    return data;
  }

  const fromMs = from.getTime();
  const toMs = to.getTime();

  const claimsByDay = data.claimsByDay.filter((d) => {
    const t = parseChartDay(d.date);
    if (Number.isNaN(t)) return false;
    return t >= fromMs && t <= toMs;
  });

  const totalClaims = claimsByDay.reduce((s, x) => s + x.claims, 0);
  const totalRedemptions = claimsByDay.reduce((s, x) => s + x.redemptions, 0);
  const conversionRate =
    totalClaims > 0
      ? Math.round((totalRedemptions / totalClaims) * 1000) / 10
      : 0;

  const sameDayCoverage = claimsByDay.length === data.claimsByDay.length;

  return {
    ...data,
    overview: {
      ...data.overview,
      totalClaims,
      totalRedemptions,
      conversionRate,
      avgTimeToRedemption: sameDayCoverage
        ? data.overview.avgTimeToRedemption
        : null,
    },
    claimsByDay,
  };
}
