"use client";

import { useDeferredValue, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAdminUsersListQuery,
  fetchAllAdminUsersForExport,
  ADMIN_TABLE_PAGE_SIZE,
} from "@/hooks/api/admin/use-admin";
import { useToast } from "@/hooks/use-toast";
import { downloadCsv } from "@/utils/download-csv";
import {
  Search,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export function AdminUsersTab(props: { hasSession: boolean }) {
  const { hasSession } = props;
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [minClaimsInput, setMinClaimsInput] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [exporting, setExporting] = useState(false);

  const minClaimsParsed = minClaimsInput.trim()
    ? parseInt(minClaimsInput, 10)
    : NaN;
  const minClaims =
    Number.isFinite(minClaimsParsed) && minClaimsParsed > 0
      ? minClaimsParsed
      : undefined;

  const listQuery = useAdminUsersListQuery(hasSession, {
    page,
    limit: ADMIN_TABLE_PAGE_SIZE,
    search: deferredSearch,
    minClaims,
  });

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 1;

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, minClaims]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const rangeStart = total === 0 ? 0 : (page - 1) * ADMIN_TABLE_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * ADMIN_TABLE_PAGE_SIZE, total);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchAllAdminUsersForExport({
        search: deferredSearch,
        minClaims,
      });
      downloadCsv(
        `treasure-hunters-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Nickname", "Email", "Device ID", "Claims", "Redemptions", "Joined"],
        rows.map((u) => [
          u.nickname ?? "",
          u.email ?? "",
          u.deviceId,
          u.totalClaims,
          u.totalRedemptions,
          u.createdAt,
        ]),
      );
      toast({ title: "Export ready" });
    } catch {
      toast({
        title: "Export failed",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>Treasure Hunters</CardTitle>
          <CardDescription>
            View all users who have used the app
          </CardDescription>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search nickname, email, device…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search users"
            />
          </div>
          <Input
            type="number"
            min={0}
            placeholder="Min claims (optional)"
            value={minClaimsInput}
            onChange={(e) => setMinClaimsInput(e.target.value)}
            className="w-full sm:w-[160px]"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            disabled={exporting}
            onClick={() => void handleExportCsv()}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {listQuery.isLoading && !listQuery.data ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nickname</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Claims</TableHead>
                  <TableHead>Redemptions</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.nickname || (
                        <span className="text-muted-foreground">Anonymous</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.email || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{user.totalClaims}</TableCell>
                    <TableCell>{user.totalRedemptions}</TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      No users match filters
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            {total > 0 ? (
              <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground tabular-nums">
                  {rangeStart}–{rangeEnd} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="px-1 text-sm text-muted-foreground tabular-nums">
                    Page {page} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
