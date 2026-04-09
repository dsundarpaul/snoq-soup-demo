"use client";

import { useMemo } from "react";
import { format, parse } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_MERCHANT_STAFF_DIRECTORY } from "@/hooks/api/scanner";
import {
  Loader2,
  Users,
  CheckCircle,
  Percent,
  Clock,
  TrendingUp,
  Trophy,
  BarChart3,
  ScanLine,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import type { AnalyticsData } from "./merchant-dashboard.types";

const STAFF_ANALYTICS_FALLBACK = MOCK_MERCHANT_STAFF_DIRECTORY.map((s, i) => ({
  staffId: s.id,
  displayName: s.displayName,
  redemptions: [12, 8, 19, 5][i] ?? 0,
  scans: [44, 31, 52, 18][i] ?? 0,
  lastActive: new Date(Date.now() - (i + 1) * 48 * 3600 * 1000).toISOString(),
}));

export interface MerchantAnalyticsPanelProps {
  analytics: AnalyticsData | undefined;
  loading: boolean;
  dateFrom: string;
  dateTo: string;
}

export function MerchantAnalyticsPanel({
  analytics,
  loading,
  dateFrom,
  dateTo,
}: MerchantAnalyticsPanelProps) {
  const rangeLabel = useMemo(() => {
    try {
      const a = parse(dateFrom, "yyyy-MM-dd", new Date());
      const b = parse(dateTo, "yyyy-MM-dd", new Date());
      return `${format(a, "MMM d, yyyy")} – ${format(b, "MMM d, yyyy")}`;
    } catch {
      return "";
    }
  }, [dateFrom, dateTo]);

  const staffRows =
    analytics?.staffPerformance && analytics.staffPerformance.length > 0
      ? analytics.staffPerformance
      : STAFF_ANALYTICS_FALLBACK;
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Unable to load analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Claims</p>
                <p className="text-3xl font-bold text-foreground">
                  {analytics.overview.totalClaims}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Redemptions</p>
                <p className="text-3xl font-bold text-green-500">
                  {analytics.overview.totalRedemptions}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-3xl font-bold text-teal">
                  {analytics.overview.conversionRate}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-teal/10 flex items-center justify-center">
                <Percent className="w-6 h-6 text-teal" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Avg. Redemption Time
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {analytics.overview.avgTimeToRedemption !== null
                    ? `${analytics.overview.avgTimeToRedemption}h`
                    : "-"}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Claims Over Time
            </CardTitle>
            <p className="text-sm text-muted-foreground">{rangeLabel}</p>
          </CardHeader>
          <CardContent>
            {analytics.claimsByDay.some((d) => d.claims > 0) ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.claimsByDay}>
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
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <p>
                  No data yet. Claims will appear here once users start claiming
                  drops.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Claims by Hour
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              When users claim the most (all-time)
            </p>
          </CardHeader>
          <CardContent>
            {analytics.claimsByHour.some((h) => h.claims > 0) ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.claimsByHour}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => `${value}:00`}
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
                      labelFormatter={(value) => `${value}:00 - ${value}:59`}
                    />
                    <Bar
                      dataKey="claims"
                      fill="#7C3AED"
                      radius={[4, 4, 0, 0]}
                      name="Claims"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <p>No data yet. Hourly patterns will appear after claims.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Trophy className="w-4 h-4 text-teal" />
            Drop Performance
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            How each drop is performing (all-time)
          </p>
        </CardHeader>
        <CardContent>
          {analytics.dropPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Drop Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Reward
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                      Claims
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                      Redemptions
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                      Conversion
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.dropPerformance.map((drop, index) => (
                    <tr
                      key={drop.id}
                      className={index % 2 === 0 ? "bg-muted/30" : ""}
                      data-testid={`row-performance-${drop.id}`}
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium text-foreground">
                          {drop.name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className="bg-teal text-teal-foreground">
                          {drop.rewardValue}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-medium">{drop.claims}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-medium text-green-500">
                          {drop.redemptions}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="secondary"
                          className={
                            drop.conversionRate >= 50
                              ? "bg-green-500/10 text-green-500"
                              : drop.conversionRate >= 25
                              ? "bg-teal/10 text-teal"
                              : ""
                          }
                        >
                          {drop.conversionRate}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                No drops yet
              </h3>
              <p className="text-muted-foreground text-sm">
                Create your first drop to see performance analytics
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-primary" />
            Staff scanner activity
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Redemptions and scan volume by staff link (sample data until your
            API returns{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              staffPerformance
            </code>
            ).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {staffRows.map((row) => (
              <Card key={row.staffId} className="border-border/80 shadow-none">
                <CardContent className="p-4 space-y-2">
                  <p className="font-medium text-foreground leading-tight">
                    {row.displayName}
                  </p>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge variant="secondary" className="font-normal">
                      {row.scans} scans
                    </Badge>
                    <Badge className="bg-teal/15 text-teal border-teal/20 font-normal">
                      {row.redemptions} redemptions
                    </Badge>
                  </div>
                  {row.lastActive && (
                    <p className="text-xs text-muted-foreground">
                      Last active{" "}
                      {format(new Date(row.lastActive), "MMM d, h:mm a")}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden sm:block overflow-x-auto -mx-1">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                    Staff
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-muted-foreground">
                    Scans
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-muted-foreground">
                    Redemptions
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                    Last active
                  </th>
                </tr>
              </thead>
              <tbody>
                {staffRows.map((row, index) => (
                  <tr
                    key={row.staffId}
                    className={index % 2 === 0 ? "bg-muted/30" : ""}
                  >
                    <td className="py-3 px-3 font-medium text-foreground">
                      {row.displayName}
                    </td>
                    <td className="py-3 px-3 text-center tabular-nums">
                      {row.scans}
                    </td>
                    <td className="py-3 px-3 text-center tabular-nums text-teal font-medium">
                      {row.redemptions}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {row.lastActive
                        ? format(new Date(row.lastActive), "MMM d, yyyy h:mm a")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
}
