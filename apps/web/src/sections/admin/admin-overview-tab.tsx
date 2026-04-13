"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Store, MapPin, Ticket, Users, TrendingUp, Activity } from "lucide-react";
import type { AdminAnalyticsLegacy } from "@/sections/admin/admin-dashboard.types";

type OverviewStats = {
  totalMerchants: number;
  verifiedMerchants: number;
  pendingMerchants: number;
  totalDrops: number;
  activeDrops: number;
  totalVouchers: number;
  redeemedVouchers: number;
  totalHunters: number;
};

export function AdminOverviewTab(props: {
  stats: OverviewStats | undefined;
  analytics: AdminAnalyticsLegacy | undefined;
}) {
  const { stats, analytics } = props;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Merchants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalMerchants || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.verifiedMerchants || 0} verified,{" "}
              {stats?.pendingMerchants || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Drops
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDrops || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeDrops || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Vouchers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalVouchers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.redeemedVouchers || 0} redeemed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Treasure Hunters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalHunters || 0}</div>
            <p className="text-xs text-muted-foreground">Active users</p>
          </CardContent>
        </Card>
      </div>

      {analytics ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Top Merchants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topMerchants.slice(0, 5).map((merchant, index) => (
                  <div
                    key={merchant.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-4 text-sm text-muted-foreground">
                        {index + 1}.
                      </span>
                      <span className="font-medium">{merchant.businessName}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {merchant.claims} claims / {merchant.redemptions} redeemed
                    </div>
                  </div>
                ))}
                {analytics.topMerchants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" />
                Top Drops
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topDrops.slice(0, 5).map((drop, index) => (
                  <div
                    key={drop.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-4 text-sm text-muted-foreground">
                        {index + 1}.
                      </span>
                      <div>
                        <span className="font-medium">{drop.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          by {drop.merchantName}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {drop.claims} / {drop.redemptions}
                    </div>
                  </div>
                ))}
                {analytics.topDrops.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
