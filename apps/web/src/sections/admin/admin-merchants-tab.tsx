"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAdminMerchantsListQuery,
  useAdminUpdateMerchantMutation,
  ADMIN_TABLE_PAGE_SIZE,
} from "@/hooks/api/admin/use-admin";
import { useToast } from "@/hooks/use-toast";
import { downloadAuthenticatedCsv } from "@/utils/download-authenticated-csv";
import {
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Loader2,
} from "lucide-react";

type VerifiedFilter = "all" | "verified" | "pending";

export function AdminMerchantsTab(props: { hasSession: boolean }) {
  const { hasSession } = props;
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [verifiedFilter, setVerifiedFilter] =
    useState<VerifiedFilter>("all");
  const [exporting, setExporting] = useState(false);
  const searchForApi = search.trim();

  const isVerified =
    verifiedFilter === "all"
      ? undefined
      : verifiedFilter === "verified"
        ? true
        : false;

  const listQuery = useAdminMerchantsListQuery(hasSession, {
    page,
    limit: ADMIN_TABLE_PAGE_SIZE,
    search: searchForApi,
    isVerified,
  });

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 1;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const updateMerchantMutation = useAdminUpdateMerchantMutation({
    onSuccess: () => {
      toast({ title: "Merchant updated" });
    },
  });

  const rangeStart = total === 0 ? 0 : (page - 1) * ADMIN_TABLE_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * ADMIN_TABLE_PAGE_SIZE, total);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await downloadAuthenticatedCsv({
        path: "/api/v1/admin/merchants/export",
        query: {
          search: searchForApi || undefined,
          isVerified,
        },
        fallbackFilename: `merchants-${new Date().toISOString().slice(0, 10)}.csv`,
        auth: "admin",
      });
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
          <CardTitle>All Merchants</CardTitle>
          <CardDescription>
            Manage merchant accounts and verification status
          </CardDescription>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, email, username…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
              aria-label="Search merchants"
            />
          </div>
          <Select
            value={verifiedFilter}
            onValueChange={(v) => {
              setVerifiedFilter(v as VerifiedFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Verification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
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
                  <TableHead>Business Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((merchant) => (
                  <TableRow key={merchant.id}>
                    <TableCell className="font-medium">
                      {merchant.businessName}
                    </TableCell>
                    <TableCell>{merchant.email}</TableCell>
                    <TableCell>
                      {merchant.emailVerified ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(merchant.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {merchant.emailVerified ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateMerchantMutation.mutate({
                              id: merchant.id,
                              emailVerified: false,
                            })
                          }
                          data-testid={`button-suspend-${merchant.id}`}
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() =>
                            updateMerchantMutation.mutate({
                              id: merchant.id,
                              emailVerified: true,
                            })
                          }
                          data-testid={`button-verify-${merchant.id}`}
                        >
                          Verify
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      No merchants match filters
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
