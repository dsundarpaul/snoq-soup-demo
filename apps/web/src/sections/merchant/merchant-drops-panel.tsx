"use client";

import { useState, useDeferredValue, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  TrendingUp,
  Trophy,
  CheckCircle,
  Plus,
  Loader2,
  Clock,
  Share2,
  Tag,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Drop } from "@shared/schema";
import {
  useMerchantDropsListQuery,
  type MerchantDropsListStatus,
} from "@/hooks/api/merchant/use-merchant";
import {
  canToggleMerchantDropActive,
  MERCHANT_DROP_ACTIVE_TOGGLE_BLOCKED,
} from "@/utils/merchant-drop-active-toggle";
import { toast } from "@/hooks/use-toast";
import type { DashboardStats } from "./merchant-dashboard.types";

const DROPS_PAGE_SIZE = 10;

export type MerchantDropsPanelExternalList = {
  drops: Drop[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  status: MerchantDropsListStatus;
  onStatusChange: (value: MerchantDropsListStatus) => void;
  showMerchantColumn?: boolean;
  getMerchantLabel?: (drop: Drop) => string;
};

export interface MerchantDropsPanelProps {
  stats?: DashboardStats | undefined;
  statsLoading?: boolean;
  externalList?: MerchantDropsPanelExternalList;
  hideSummaryCards?: boolean;
  deletePending: boolean;
  onCreateClick: () => void;
  onShareDrop: (dropId: string) => void;
  onCodesClick: (dropId: string) => void;
  onEditDrop: (drop: Drop) => void;
  onDeleteDrop: (dropId: string) => void;
  onDropActiveChange: (dropId: string, active: boolean) => void;
  dropActiveTogglePending: boolean;
  dropActiveTogglingId: string | null;
}

export function MerchantDropsPanel({
  stats,
  statsLoading = false,
  externalList,
  hideSummaryCards = false,
  deletePending,
  onCreateClick,
  onShareDrop,
  onCodesClick,
  onEditDrop,
  onDeleteDrop,
  onDropActiveChange,
  dropActiveTogglePending,
  dropActiveTogglingId,
}: MerchantDropsPanelProps) {
  const [internalPage, setInternalPage] = useState(1);
  const [internalSearch, setInternalSearch] = useState("");
  const [internalStatus, setInternalStatus] =
    useState<MerchantDropsListStatus>("all");

  const dropsPage = externalList?.page ?? internalPage;
  const dropsSearch = externalList?.search ?? internalSearch;
  const setDropsSearch = externalList?.onSearchChange ?? setInternalSearch;
  const dropsStatus = externalList?.status ?? internalStatus;
  const setDropsStatus = externalList?.onStatusChange ?? setInternalStatus;

  const deferredDropsSearch = useDeferredValue(dropsSearch);
  const pageSize = externalList?.pageSize ?? DROPS_PAGE_SIZE;
  const showMerchantColumn = Boolean(
    externalList?.showMerchantColumn && externalList?.getMerchantLabel,
  );
  const getMerchantLabel = externalList?.getMerchantLabel;

  useEffect(() => {
    if (externalList) return;
    setInternalPage(1);
  }, [deferredDropsSearch, internalStatus, externalList]);

  const { data: dropsListData, isLoading: internalDropsLoading } =
    useMerchantDropsListQuery({
      page: internalPage,
      limit: DROPS_PAGE_SIZE,
      search: externalList ? "" : deferredDropsSearch,
      status: externalList ? "all" : internalStatus,
      enabled: !externalList,
    });

  const drops = externalList?.drops ?? dropsListData?.drops ?? [];
  const dropsTotal = externalList?.total ?? dropsListData?.total ?? 0;
  const dropsLoading = externalList?.loading ?? internalDropsLoading;
  const totalPages = Math.max(1, Math.ceil(dropsTotal / pageSize));

  const goPrevPage = () => {
    if (externalList) {
      externalList.onPageChange(Math.max(1, externalList.page - 1));
      return;
    }
    setInternalPage((p) => Math.max(1, p - 1));
  };

  const goNextPage = () => {
    if (externalList) {
      externalList.onPageChange(Math.min(totalPages, externalList.page + 1));
      return;
    }
    setInternalPage((p) => Math.min(totalPages, p + 1));
  };

  useEffect(() => {
    if (externalList) return;
    if (dropsListData === undefined) return;
    if (internalPage > totalPages) {
      setInternalPage(totalPages);
    }
  }, [dropsListData, internalPage, totalPages, externalList]);

  const hasFilters =
    dropsSearch.trim() !== "" || dropsStatus !== "all";
  const filteredEmpty = !dropsLoading && drops.length === 0 && hasFilters;
  const noDropsAtAll =
    !dropsLoading && drops.length === 0 && !hasFilters;
  const rangeStart = dropsTotal === 0 ? 0 : (dropsPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(dropsPage * pageSize, dropsTotal);

  return (
    <>
      {!hideSummaryCards ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Drops</p>
                <p className="text-3xl font-bold text-foreground">
                  {statsLoading ? "-" : stats?.totalDrops || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Drops</p>
                <p className="text-3xl font-bold text-teal">
                  {statsLoading ? "-" : stats?.activeDrops || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-teal/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-teal" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Claims</p>
                <p className="text-3xl font-bold text-foreground">
                  {statsLoading ? "-" : stats?.totalVouchers || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Redeemed</p>
                <p className="text-3xl font-bold text-green-500">
                  {statsLoading ? "-" : stats?.redeemedVouchers || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      ) : null}

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Drops
            </CardTitle>
            <Button
              size="sm"
              className="gap-2 shrink-0"
              onClick={onCreateClick}
              data-testid="button-create-drop"
            >
              <Plus className="w-4 h-4" />
              New Drop
            </Button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name or reward…"
                value={dropsSearch}
                onChange={(e) => setDropsSearch(e.target.value)}
                className="pl-9"
                aria-label="Search drops"
              />
            </div>
            <Select
              value={dropsStatus}
              onValueChange={(v) =>
                setDropsStatus(v as MerchantDropsListStatus)
              }
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {dropsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredEmpty ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                No matching drops
              </h3>
              <p className="text-muted-foreground text-sm">
                Try a different search or status filter.
              </p>
            </div>
          ) : noDropsAtAll ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                No drops yet
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Create your first drop to start rewarding customers
              </p>
              <Button
                onClick={onCreateClick}
                data-testid="button-create-first-drop"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Drop
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Name
                    </th>
                    {showMerchantColumn ? (
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Merchant
                      </th>
                    ) : null}
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Location
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Reward
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Active
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Created
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {drops.map((drop, index) => (
                    <tr
                      key={drop.id}
                      className={index % 2 === 0 ? "bg-muted/30" : ""}
                      data-testid={`row-drop-${drop.id}`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">
                          {drop.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {drop.description.slice(0, 50)}...
                        </div>
                      </td>
                      {showMerchantColumn && getMerchantLabel ? (
                        <td className="py-3 px-4 text-sm text-foreground">
                          {getMerchantLabel(drop)}
                        </td>
                      ) : null}
                      <td className="py-3 px-4">
                        <div className="text-sm font-mono text-muted-foreground">
                          {drop.latitude.toFixed(4)},{" "}
                          {drop.longitude.toFixed(4)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Radius: {drop.radius}m
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className="bg-teal text-teal-foreground">
                          {drop.rewardValue}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <MerchantDropActiveSwitch
                          drop={drop}
                          rowBusy={
                            dropActiveTogglePending &&
                            dropActiveTogglingId === drop.id
                          }
                          onToggle={(next) =>
                            onDropActiveChange(drop.id, next)
                          }
                        />
                      </td>
                      <td className="py-3 px-4">
                        <DropStatusBadge drop={drop} />
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {drop.createdAt
                          ? new Date(drop.createdAt).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onShareDrop(drop.id)}
                            data-testid={`button-share-drop-${drop.id}`}
                          >
                            <Share2 className="w-4 h-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onCodesClick(drop.id)}
                            title="Promo Codes"
                            data-testid={`button-codes-drop-${drop.id}`}
                          >
                            <Tag className="w-4 h-4 text-teal-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditDrop(drop)}
                            data-testid={`button-edit-drop-${drop.id}`}
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Are you sure you want to delete this drop? This action cannot be undone."
                                )
                              ) {
                                onDeleteDrop(drop.id);
                              }
                            }}
                            disabled={deletePending}
                            data-testid={`button-delete-drop-${drop.id}`}
                          >
                            {deletePending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-destructive" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dropsTotal > 0 ? (
              <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground tabular-nums">
                  {rangeStart}–{rangeEnd} of {dropsTotal}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={dropsPage <= 1}
                    onClick={goPrevPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground tabular-nums px-1">
                    Page {dropsPage} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={dropsPage >= totalPages}
                    onClick={goNextPage}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function MerchantDropActiveSwitch({
  drop,
  rowBusy,
  onToggle,
}: {
  drop: Drop;
  rowBusy: boolean;
  onToggle: (next: boolean) => void;
}) {
  const canToggle = canToggleMerchantDropActive(drop);

  if (!canToggle) {
    const showBlockedToast = () =>
      toast({ title: MERCHANT_DROP_ACTIVE_TOGGLE_BLOCKED });

    return (
      <div
        role="button"
        tabIndex={0}
        className="inline-flex cursor-pointer rounded-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={showBlockedToast}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            showBlockedToast();
          }
        }}
        title={MERCHANT_DROP_ACTIVE_TOGGLE_BLOCKED}
        aria-label={MERCHANT_DROP_ACTIVE_TOGGLE_BLOCKED}
      >
        <Switch
          checked={drop.active}
          disabled
          className="pointer-events-none"
        />
      </div>
    );
  }

  return (
    <Switch
      checked={drop.active}
      disabled={rowBusy}
      onCheckedChange={onToggle}
      aria-label={drop.active ? "Deactivate drop" : "Activate drop"}
    />
  );
}

function DropStatusBadge({ drop }: { drop: Drop }) {
  const now = new Date();
  const startTime = drop.startTime ? new Date(drop.startTime) : null;
  const endTime = drop.endTime ? new Date(drop.endTime) : null;

  if (endTime && endTime < now) {
    return (
      <Badge className="bg-red-500/10 text-red-500 border-red-500/30">
        <Clock className="w-3 h-3 mr-1" />
        Expired
      </Badge>
    );
  }

  if (startTime && startTime > now) {
    return (
      <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">
        <Clock className="w-3 h-3 mr-1" />
        Scheduled
      </Badge>
    );
  }

  if (!drop.active) {
    return (
      <Badge variant="secondary">
        <Clock className="w-3 h-3 mr-1" />
        Inactive
      </Badge>
    );
  }

  return (
    <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
      <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
      Active
    </Badge>
  );
}
