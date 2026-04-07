"use client";

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
} from "lucide-react";
import type { Drop } from "@shared/schema";
import type { DashboardStats } from "./merchant-dashboard.types";

export interface MerchantDropsPanelProps {
  stats: DashboardStats | undefined;
  statsLoading: boolean;
  drops: Drop[];
  dropsLoading: boolean;
  deletePending: boolean;
  onCreateClick: () => void;
  onShareDrop: (dropId: string) => void;
  onCodesClick: (dropId: string) => void;
  onEditDrop: (drop: Drop) => void;
  onDeleteDrop: (dropId: string) => void;
}

export function MerchantDropsPanel({
  stats,
  statsLoading,
  drops,
  dropsLoading,
  deletePending,
  onCreateClick,
  onShareDrop,
  onCodesClick,
  onEditDrop,
  onDeleteDrop,
}: MerchantDropsPanelProps) {
  return (
    <>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Active Drops
          </CardTitle>
          <Button
            size="sm"
            className="gap-2"
            onClick={onCreateClick}
            data-testid="button-create-drop"
          >
            <Plus className="w-4 h-4" />
            New Drop
          </Button>
        </CardHeader>
        <CardContent>
          {dropsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : drops.length === 0 ? (
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Location
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Reward
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
          )}
        </CardContent>
      </Card>
    </>
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
