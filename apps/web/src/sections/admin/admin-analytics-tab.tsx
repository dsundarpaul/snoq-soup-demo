"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3, TrendingUp } from "lucide-react";
import type { AdminAnalyticsLegacy } from "@/sections/admin/admin-dashboard.types";

export function AdminAnalyticsTab(props: {
  analytics: AdminAnalyticsLegacy | undefined;
}) {
  const { analytics } = props;

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading analytics...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversion Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {analytics.conversionRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              Claims to redemptions
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
                0,
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.claimsOverTime.reduce(
                (sum, day) => sum + day.redemptions,
                0,
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
                0,
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
              <BarChart3 className="h-5 w-5" />
              Claims by Hour
            </CardTitle>
            <CardDescription>
              Distribution of claims throughout the day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.claimsByHour.map((hour) => {
                const maxClaims = Math.max(
                  ...analytics.claimsByHour.map((h) => h.claims),
                  1,
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Claims and redemptions over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.claimsOverTime.slice(-7).map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">
                    {new Date(day.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">
                      <span className="text-muted-foreground">Claims:</span>{" "}
                      {day.claims}
                    </span>
                    <span className="text-sm">
                      <span className="text-muted-foreground">Redeemed:</span>{" "}
                      {day.redemptions}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
