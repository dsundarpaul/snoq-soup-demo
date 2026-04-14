"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Activity, BarChart3, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AdminAnalyticsLegacy } from "@/sections/admin/admin-dashboard.types";

function formatConversionPercent(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0%";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

export function AdminAnalyticsTab(props: {
  analytics: AdminAnalyticsLegacy | undefined;
}) {
  const { analytics } = props;

  const claimsRangeLabel = useMemo(() => {
    if (!analytics?.claimsOverTime?.length) return "";
    const rows = analytics.claimsOverTime;
    const first = rows[0].date;
    const last = rows[rows.length - 1].date;
    try {
      const a = parseISO(first);
      const b = parseISO(last);
      if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "";
      return `${format(a, "MMM d, yyyy")} – ${format(b, "MMM d, yyyy")}`;
    } catch {
      return "";
    }
  }, [analytics]);

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading analytics...
        </CardContent>
      </Card>
    );
  }

  const hasClaimsOverTimeData = analytics.claimsOverTime.some(
    (d) => d.claims > 0 || d.redemptions > 0
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversion rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary tabular-nums">
              {formatConversionPercent(analytics.conversionRate)}
            </div>
            <p className="text-xs text-muted-foreground">
              Redemptions ÷ vouchers claimed in the selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Claims (30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analytics.claimsOverTime.reduce(
                (sum, day) => sum + day.claims,
                0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.claimsOverTime.reduce(
                (sum, day) => sum + day.redemptions,
                0
              )}{" "}
              redeemed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>New Merchants (30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analytics.merchantGrowth.reduce(
                (sum, day) => sum + day.count,
                0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Merchant signups</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Top merchants
            </CardTitle>
            <CardDescription>
              Merchants with the most vouchers claimed in the period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topMerchants.slice(0, 8).map((merchant, index) => (
                <div
                  key={merchant.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-5 shrink-0 text-sm text-muted-foreground tabular-nums">
                      {index + 1}.
                    </span>
                    <span className="truncate font-medium">
                      {merchant.businessName}
                    </span>
                  </div>
                  <div className="shrink-0 text-sm text-muted-foreground tabular-nums">
                    {merchant.claims} vouchers · {merchant.redemptions} redeemed
                  </div>
                </div>
              ))}
              {analytics.topMerchants.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No data in this period
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              Top drops
            </CardTitle>
            <CardDescription>
              Drops with the most vouchers claimed in the period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topDrops.slice(0, 8).map((drop, index) => (
                <div
                  key={drop.id}
                  className="flex items-start justify-between gap-2"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="w-5 shrink-0 text-sm text-muted-foreground tabular-nums">
                      {index + 1}.
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{drop.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {drop.merchantName}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-sm text-muted-foreground tabular-nums">
                    {drop.claims} vouchers · {drop.redemptions} redeemed
                  </div>
                </div>
              ))}
              {analytics.topDrops.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No data in this period
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <TrendingUp className="h-4 w-4 text-primary" />
              Claims over time
            </CardTitle>
            <CardDescription>
              {claimsRangeLabel || "Daily claims and redemptions in the period"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasClaimsOverTimeData ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.claimsOverTime}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString()
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="claims"
                      stroke="#7C3AED"
                      strokeWidth={2}
                      dot={false}
                      name="Claims"
                    />
                    <Line
                      type="monotone"
                      dataKey="redemptions"
                      stroke="#14B8A6"
                      strokeWidth={2}
                      dot={false}
                      name="Redemptions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                <p>
                  No data in this period. Claims will appear here once users
                  claim drops.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <BarChart3 className="h-4 w-4 text-primary" />
              Claims by hour
            </CardTitle>
            <CardDescription>
              Distribution of claims by hour of day (UTC) in the period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.claimsByHour.map((hour) => {
                const maxClaims = Math.max(
                  ...analytics.claimsByHour.map((h) => h.claims),
                  1
                );
                const percentage = (hour.claims / maxClaims) * 100;
                return (
                  <div key={hour.hour} className="flex items-center gap-2">
                    <span className="w-8 text-xs text-muted-foreground">
                      {hour.hour.toString().padStart(2, "0")}:00
                    </span>
                    <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-6 text-xs text-muted-foreground">
                      {hour.claims}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
