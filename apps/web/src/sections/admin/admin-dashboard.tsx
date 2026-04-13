"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAdminSessionQuery,
  useAdminStatsQuery,
  useAdminAnalyticsQuery,
  useAdminLogoutMutation,
} from "@/hooks/api/admin/use-admin";
import { Shield, LogOut } from "lucide-react";
import { AdminOverviewTab } from "@/sections/admin/admin-overview-tab";
import { AdminMerchantsTab } from "@/sections/admin/admin-merchants-tab";
import { AdminDropsTab } from "@/sections/admin/admin-drops-tab";
import { AdminUsersTab } from "@/sections/admin/admin-users-tab";
import { AdminAnalyticsTab } from "@/sections/admin/admin-analytics-tab";

export default function AdminDashboardPage() {
  const router = useRouter();

  const sessionQuery = useAdminSessionQuery();
  const hasSession = Boolean(sessionQuery.data);

  const statsQuery = useAdminStatsQuery(hasSession);
  const analyticsQuery = useAdminAnalyticsQuery(hasSession);

  const logoutMutation = useAdminLogoutMutation({
    onSuccess: () => router.push("/admin"),
  });

  useEffect(() => {
    if (!sessionQuery.isLoading && !sessionQuery.data) {
      router.push("/admin");
    }
  }, [sessionQuery.isLoading, sessionQuery.data, router]);

  if (sessionQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!sessionQuery.data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Platform Admin</h1>
              <p className="text-xs text-muted-foreground">
                {sessionQuery.data.admin.email}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            data-testid="button-admin-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="overview" data-testid="tab-overview">
              Overview
            </TabsTrigger>
            <TabsTrigger value="merchants" data-testid="tab-merchants">
              Merchants
            </TabsTrigger>
            <TabsTrigger value="drops" data-testid="tab-drops">
              Drops
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              Users
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AdminOverviewTab
              stats={statsQuery.data}
              analytics={analyticsQuery.data}
            />
          </TabsContent>

          <TabsContent value="merchants">
            <AdminMerchantsTab hasSession={hasSession} />
          </TabsContent>

          <TabsContent value="drops">
            <AdminDropsTab hasSession={hasSession} />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsersTab hasSession={hasSession} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AdminAnalyticsTab analytics={analyticsQuery.data} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
