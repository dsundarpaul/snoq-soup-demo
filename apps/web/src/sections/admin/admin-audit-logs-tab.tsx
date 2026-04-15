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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAdminAuditLogsQuery,
  type AdminAuditLogsParams,
} from "@/hooks/api/admin/use-admin";
import { Loader2, ChevronRight, RotateCcw } from "lucide-react";

const PAGE_LIMIT = 40;

export function AdminAuditLogsTab(props: { hasSession: boolean }) {
  const { hasSession } = props;
  const [live, setLive] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [path, setPath] = useState("");
  const [correlationId, setCorrelationId] = useState("");
  const [statusCode, setStatusCode] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [applied, setApplied] = useState<{
    action: string;
    actorId: string;
    path: string;
    correlationId: string;
    statusCode: string;
    from: string;
    to: string;
  }>({
    action: "",
    actorId: "",
    path: "",
    correlationId: "",
    statusCode: "",
    from: "",
    to: "",
  });

  const statusParsed = applied.statusCode.trim()
    ? parseInt(applied.statusCode, 10)
    : NaN;
  const statusForApi =
    Number.isFinite(statusParsed) && statusParsed > 0
      ? statusParsed
      : undefined;

  const params: AdminAuditLogsParams = {
    limit: PAGE_LIMIT,
    cursor: live ? undefined : cursor,
    action: applied.action.trim() || undefined,
    actorId: applied.actorId.trim() || undefined,
    path: applied.path.trim() || undefined,
    correlationId: applied.correlationId.trim() || undefined,
    statusCode: statusForApi,
    from: applied.from.trim() || undefined,
    to: applied.to.trim() || undefined,
  };

  const listQuery = useAdminAuditLogsQuery(hasSession, params, {
    refetchInterval: live ? 4000 : false,
  });

  useEffect(() => {
    if (live) {
      setCursor(undefined);
    }
  }, [live]);

  const items = listQuery.data?.items ?? [];
  const hasMore = listQuery.data?.hasMore ?? false;
  const nextCursor = listQuery.data?.nextCursor;

  const applyFilters = () => {
    setCursor(undefined);
    setApplied({
      action,
      actorId,
      path,
      correlationId,
      statusCode,
      from,
      to,
    });
  };

  const resetAll = () => {
    setAction("");
    setActorId("");
    setPath("");
    setCorrelationId("");
    setStatusCode("");
    setFrom("");
    setTo("");
    setApplied({
      action: "",
      actorId: "",
      path: "",
      correlationId: "",
      statusCode: "",
      from: "",
      to: "",
    });
    setCursor(undefined);
    setLive(false);
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Audit logs</CardTitle>
            <CardDescription>
              Platform actions forwarded from the audit service (cursor
              pagination).
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="audit-live"
              checked={live}
              onCheckedChange={setLive}
              data-testid="switch-audit-live"
            />
            <Label htmlFor="audit-live" className="text-sm">
              Live refresh
            </Label>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="audit-action">Action</Label>
            <Input
              id="audit-action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="e.g. auth.merchant_login"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-actor">Actor ID</Label>
            <Input
              id="audit-actor"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              placeholder="User id"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-path">Path contains</Label>
            <Input
              id="audit-path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/api/v1/..."
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-corr">Correlation ID</Label>
            <Input
              id="audit-corr"
              value={correlationId}
              onChange={(e) => setCorrelationId(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-status">Status code</Label>
            <Input
              id="audit-status"
              value={statusCode}
              onChange={(e) => setStatusCode(e.target.value)}
              placeholder="200"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-from">From (RFC3339)</Label>
            <Input
              id="audit-from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="2026-01-01T00:00:00Z"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-to">To (RFC3339)</Label>
            <Input
              id="audit-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={applyFilters} data-testid="audit-apply">
            Apply filters
          </Button>
          <Button type="button" variant="outline" onClick={resetAll}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {listQuery.isError ? (
          <p className="text-sm text-destructive">
            Could not load audit logs. Ensure the audit service is configured on
            the API.
          </p>
        ) : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Path</TableHead>
                <TableHead className="w-[72px]">Status</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead className="min-w-[120px]">Correlation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No events match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(row.occurredAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs font-mono">
                      {row.action}
                    </TableCell>
                    <TableCell className="text-xs">{row.httpMethod}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs">
                      {row.path}
                    </TableCell>
                    <TableCell className="text-xs">{row.statusCode}</TableCell>
                    <TableCell className="max-w-[140px] truncate text-xs">
                      {row.actorType}
                      {row.actorId ? ` · ${row.actorId.slice(0, 8)}…` : ""}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate font-mono text-xs">
                      {row.correlationId || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!live && hasMore && nextCursor ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCursor(nextCursor)}
            data-testid="audit-next-page"
          >
            Older events
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
