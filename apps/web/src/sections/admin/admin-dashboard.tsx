"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatetimePicker } from "@/components/datetime-picker";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminSessionQuery,
  useAdminStatsQuery,
  useAdminAnalyticsQuery,
  useAdminMerchantsListQuery,
  useAdminDropsListQuery,
  useAdminUsersListQuery,
  useAdminLogoutMutation,
  useAdminUpdateMerchantMutation,
  useAdminUpdateDropMutation,
  useAdminCreateDropMutation,
  useAdminDeleteDropMutation,
  useAdminDropCodesQuery,
  useAdminUploadDropCodesMutation,
} from "@/hooks/api/admin/use-admin";
import {
  Shield,
  LogOut,
  Users,
  Store,
  MapPin,
  Ticket,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Activity,
  Plus,
  Pencil,
  Trash2,
  Tag,
  Upload,
  Loader2,
  FileText,
} from "lucide-react";

type Merchant = {
  id: string;
  username: string;
  businessName: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
};

type Drop = {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  merchantName: string;
  rewardValue: string;
  latitude: number;
  longitude: number;
  radius: number;
  logoUrl: string | null;
  redemptionType: string;
  redemptionMinutes: number | null;
  redemptionDeadline: string | null;
  availabilityType: string;
  captureLimit: number | null;
  startTime: string | null;
  endTime: string | null;
  active: boolean;
  createdAt: string;
};

type TreasureHunter = {
  id: string;
  deviceId: string;
  nickname: string | null;
  email: string | null;
  totalClaims: number;
  totalRedemptions: number;
  createdAt: string;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();

  const sessionQuery = useAdminSessionQuery();
  const hasSession = Boolean(sessionQuery.data);

  const statsQuery = useAdminStatsQuery(hasSession);
  const analyticsQuery = useAdminAnalyticsQuery(hasSession);
  const merchantsQuery = useAdminMerchantsListQuery(hasSession);
  const dropsQuery = useAdminDropsListQuery(hasSession);
  const usersQuery = useAdminUsersListQuery(hasSession);

  const logoutMutation = useAdminLogoutMutation({
    onSuccess: () => router.push("/admin"),
  });

  const updateMerchantMutation = useAdminUpdateMerchantMutation({
    onSuccess: () => {
      toast({ title: "Merchant updated" });
    },
  });

  const updateDropMutation = useAdminUpdateDropMutation({
    onSuccess: () => {
      toast({ title: "Drop updated" });
    },
  });

  const createDropMutation = useAdminCreateDropMutation({
    onSuccess: () => {
      toast({ title: "Drop created" });
      setDropDialogOpen(false);
    },
  });

  const deleteDropMutation = useAdminDeleteDropMutation({
    onSuccess: () => {
      toast({ title: "Drop deleted" });
    },
  });

  const [dropDialogOpen, setDropDialogOpen] = useState(false);
  const [editingDrop, setEditingDrop] = useState<Drop | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [adminCodesDropId, setAdminCodesDropId] = useState<string | null>(null);
  const [adminCodesText, setAdminCodesText] = useState("");

  const adminCodesQuery = useAdminDropCodesQuery(adminCodesDropId);

  const adminUploadCodesMutation = useAdminUploadDropCodesMutation(
    adminCodesDropId,
    {
      onSuccess: () => {
        setAdminCodesText("");
        toast({
          title: "Codes Uploaded",
          description: "Promo codes have been added.",
        });
      },
      onError: () => {
        toast({
          title: "Upload Failed",
          description: "Failed to upload codes.",
          variant: "destructive",
        });
      },
    }
  );

  const handleAdminUploadCodes = () => {
    if (!adminCodesDropId || !adminCodesText.trim()) return;
    const codes = adminCodesText
      .split(/[\n,]/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (codes.length === 0) return;
    adminUploadCodesMutation.mutate({ dropId: adminCodesDropId, codes });
  };

  const handleAdminFileImportCodes = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setAdminCodesText(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  const [merchantSearch, setMerchantSearch] = useState("");
  const [dropForm, setDropForm] = useState({
    merchantId: "",
    name: "",
    description: "",
    rewardValue: "",
    latitude: "",
    longitude: "",
    radius: "15",
    redemptionType: "anytime",
    availabilityType: "unlimited",
    captureLimit: "",
    startTime: "",
    endTime: "",
  });

  const openCreateDialog = () => {
    setEditingDrop(null);
    setDropForm({
      merchantId: "",
      name: "",
      description: "",
      rewardValue: "",
      latitude: "",
      longitude: "",
      radius: "15",
      redemptionType: "anytime",
      availabilityType: "unlimited",
      captureLimit: "",
      startTime: "",
      endTime: "",
    });
    setDropDialogOpen(true);
  };

  const openEditDialog = (drop: Drop) => {
    setEditingDrop(drop);
    setDropForm({
      merchantId: drop.merchantId,
      name: drop.name,
      description: drop.description,
      rewardValue: drop.rewardValue,
      latitude: String(drop.latitude),
      longitude: String(drop.longitude),
      radius: String(drop.radius),
      redemptionType: drop.redemptionType,
      availabilityType: drop.availabilityType,
      captureLimit: drop.captureLimit ? String(drop.captureLimit) : "",
      startTime: drop.startTime ? drop.startTime.slice(0, 16) : "",
      endTime: drop.endTime ? drop.endTime.slice(0, 16) : "",
    });
    setDropDialogOpen(true);
  };

  const handleDropSubmit = () => {
    if (editingDrop) {
      updateDropMutation.mutate({
        id: editingDrop.id,
        name: dropForm.name,
        description: dropForm.description,
        rewardValue: dropForm.rewardValue,
        latitude: parseFloat(dropForm.latitude),
        longitude: parseFloat(dropForm.longitude),
        radius: parseInt(dropForm.radius) || 15,
        redemptionType: dropForm.redemptionType,
        availabilityType: dropForm.availabilityType,
        captureLimit: dropForm.captureLimit
          ? parseInt(dropForm.captureLimit)
          : null,
        startTime: dropForm.startTime || null,
        endTime: dropForm.endTime || null,
      });
      setDropDialogOpen(false);
    } else {
      createDropMutation.mutate({
        ...dropForm,
        latitude: parseFloat(dropForm.latitude),
        longitude: parseFloat(dropForm.longitude),
        radius: parseInt(dropForm.radius) || 15,
        captureLimit: dropForm.captureLimit
          ? parseInt(dropForm.captureLimit)
          : null,
        startTime: dropForm.startTime || null,
        endTime: dropForm.endTime || null,
      });
    }
  };

  useEffect(() => {
    if (!sessionQuery.isLoading && !sessionQuery.data) {
      router.push("/admin");
    }
  }, [sessionQuery.isLoading, sessionQuery.data, router]);

  if (sessionQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!sessionQuery.data) {
    return null;
  }

  const stats = statsQuery.data;
  const analytics = analyticsQuery.data;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Platform Admin</h1>
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
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <div className="text-2xl font-bold">
                    {stats?.totalDrops || 0}
                  </div>
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
                  <div className="text-2xl font-bold">
                    {stats?.totalHunters || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Active users</p>
                </CardContent>
              </Card>
            </div>

            {analytics && (
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Top Merchants
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.topMerchants
                        .slice(0, 5)
                        .map((merchant, index) => (
                          <div
                            key={merchant.id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-sm w-4">
                                {index + 1}.
                              </span>
                              <span className="font-medium">
                                {merchant.businessName}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {merchant.claims} claims / {merchant.redemptions}{" "}
                              redeemed
                            </div>
                          </div>
                        ))}
                      {analytics.topMerchants.length === 0 && (
                        <p className="text-muted-foreground text-sm">
                          No data yet
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
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
                            <span className="text-muted-foreground text-sm w-4">
                              {index + 1}.
                            </span>
                            <div>
                              <span className="font-medium">{drop.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                by {drop.merchantName}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {drop.claims} / {drop.redemptions}
                          </div>
                        </div>
                      ))}
                      {analytics.topDrops.length === 0 && (
                        <p className="text-muted-foreground text-sm">
                          No data yet
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="merchants">
            <Card>
              <CardHeader>
                <CardTitle>All Merchants</CardTitle>
                <CardDescription>
                  Manage merchant accounts and verification status
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                    {merchantsQuery.data?.map((merchant) => (
                      <TableRow key={merchant.id}>
                        <TableCell className="font-medium">
                          {merchant.businessName}
                        </TableCell>
                        <TableCell>{merchant.email}</TableCell>
                        <TableCell>
                          {merchant.emailVerified ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
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
                    {(!merchantsQuery.data ||
                      merchantsQuery.data.length === 0) && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          No merchants yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drops">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Drops</CardTitle>
                    <CardDescription>
                      Create, edit, and manage drops across the platform
                    </CardDescription>
                  </div>
                  <Button
                    onClick={openCreateDialog}
                    data-testid="button-create-drop"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Drop
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Reward</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dropsQuery.data?.map((drop) => (
                      <TableRow key={drop.id}>
                        <TableCell className="font-medium">
                          {drop.name}
                        </TableCell>
                        <TableCell>{drop.merchantName}</TableCell>
                        <TableCell>{drop.rewardValue}</TableCell>
                        <TableCell>
                          {drop.active ? (
                            <Badge variant="default" className="bg-green-500">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(drop.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(drop)}
                              data-testid={`button-edit-${drop.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {drop.active ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateDropMutation.mutate({
                                    id: drop.id,
                                    active: false,
                                  })
                                }
                                data-testid={`button-deactivate-${drop.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Pause
                              </Button>
                            ) : (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  updateDropMutation.mutate({
                                    id: drop.id,
                                    active: true,
                                  })
                                }
                                data-testid={`button-activate-${drop.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Activate
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setAdminCodesDropId(drop.id)}
                              title="Promo Codes"
                              data-testid={`button-codes-${drop.id}`}
                            >
                              <Tag className="h-4 w-4 text-teal-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(drop.id)}
                              data-testid={`button-delete-${drop.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!dropsQuery.data || dropsQuery.data.length === 0) && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground"
                        >
                          No drops yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Dialog open={dropDialogOpen} onOpenChange={setDropDialogOpen}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingDrop ? "Edit Drop" : "Create Drop"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingDrop
                      ? "Update drop details"
                      : "Create a new drop for a merchant"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {!editingDrop && (
                    <div className="space-y-2">
                      <Label>Merchant</Label>
                      {dropForm.merchantId ? (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium flex-1">
                            {
                              merchantsQuery.data?.find(
                                (m) => m.id === dropForm.merchantId
                              )?.businessName
                            }
                          </span>
                          <span
                            className="text-xs text-primary cursor-pointer hover:underline select-none"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDropForm((f) => ({ ...f, merchantId: "" }));
                              setMerchantSearch("");
                            }}
                            data-testid="button-clear-merchant"
                          >
                            Change
                          </span>
                        </div>
                      ) : (
                        <>
                          <Input
                            placeholder="Type to search merchants..."
                            value={merchantSearch}
                            onChange={(e) => setMerchantSearch(e.target.value)}
                            autoComplete="off"
                            data-testid="input-search-merchant"
                          />
                          <div className="max-h-40 overflow-y-auto border rounded-md">
                            {(() => {
                              const filtered =
                                merchantsQuery.data
                                  ?.filter((m) => m.emailVerified)
                                  .filter(
                                    (m) =>
                                      !merchantSearch ||
                                      m.businessName
                                        .toLowerCase()
                                        .includes(merchantSearch.toLowerCase())
                                  ) || [];
                              if (filtered.length === 0) {
                                return (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">
                                    No merchants found
                                  </div>
                                );
                              }
                              return filtered.map((m) => (
                                <div
                                  key={m.id}
                                  role="option"
                                  tabIndex={0}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer border-b last:border-b-0 select-none"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDropForm((f) => ({
                                      ...f,
                                      merchantId: m.id,
                                    }));
                                    setMerchantSearch("");
                                  }}
                                  data-testid={`merchant-option-${m.id}`}
                                >
                                  {m.businessName}
                                </div>
                              ));
                            })()}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Drop Name</Label>
                    <Input
                      value={dropForm.name}
                      onChange={(e) =>
                        setDropForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="e.g., Golden Cup Challenge"
                      data-testid="input-drop-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={dropForm.description}
                      onChange={(e) =>
                        setDropForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Describe this drop"
                      data-testid="input-drop-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reward Value</Label>
                    <Input
                      value={dropForm.rewardValue}
                      onChange={(e) =>
                        setDropForm((f) => ({
                          ...f,
                          rewardValue: e.target.value,
                        }))
                      }
                      placeholder="e.g., 50% OFF, Free Coffee"
                      data-testid="input-drop-reward"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Latitude</Label>
                      <Input
                        type="number"
                        step="any"
                        value={dropForm.latitude}
                        onChange={(e) =>
                          setDropForm((f) => ({
                            ...f,
                            latitude: e.target.value,
                          }))
                        }
                        placeholder="24.7136"
                        data-testid="input-drop-lat"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Longitude</Label>
                      <Input
                        type="number"
                        step="any"
                        value={dropForm.longitude}
                        onChange={(e) =>
                          setDropForm((f) => ({
                            ...f,
                            longitude: e.target.value,
                          }))
                        }
                        placeholder="46.6753"
                        data-testid="input-drop-lng"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Radius (meters)</Label>
                    <Input
                      type="number"
                      value={dropForm.radius}
                      onChange={(e) =>
                        setDropForm((f) => ({ ...f, radius: e.target.value }))
                      }
                      data-testid="input-drop-radius"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Redemption Type</Label>
                    <Select
                      value={dropForm.redemptionType}
                      onValueChange={(v) =>
                        setDropForm((f) => ({ ...f, redemptionType: v }))
                      }
                    >
                      <SelectTrigger data-testid="select-redemption-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anytime">Anytime</SelectItem>
                        <SelectItem value="timer">Timer</SelectItem>
                        <SelectItem value="window">Window</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Availability Type</Label>
                    <Select
                      value={dropForm.availabilityType}
                      onValueChange={(v) =>
                        setDropForm((f) => ({ ...f, availabilityType: v }))
                      }
                    >
                      <SelectTrigger data-testid="select-availability-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                        <SelectItem value="captureLimit">
                          Capture Limit
                        </SelectItem>
                        <SelectItem value="timeWindow">Time Window</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {dropForm.availabilityType === "captureLimit" && (
                    <div className="space-y-2">
                      <Label>Capture Limit</Label>
                      <Input
                        type="number"
                        value={dropForm.captureLimit}
                        onChange={(e) =>
                          setDropForm((f) => ({
                            ...f,
                            captureLimit: e.target.value,
                          }))
                        }
                        placeholder="Max number of claims"
                        data-testid="input-capture-limit"
                      />
                    </div>
                  )}
                  {dropForm.availabilityType === "timeWindow" && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <DatetimePicker
                        label="Start Time"
                        value={dropForm.startTime}
                        onChange={(v) =>
                          setDropForm((f) => ({ ...f, startTime: v }))
                        }
                        data-testid="input-start-time"
                      />
                      <DatetimePicker
                        label="End Time"
                        value={dropForm.endTime}
                        onChange={(v) =>
                          setDropForm((f) => ({ ...f, endTime: v }))
                        }
                        data-testid="input-end-time"
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDropDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDropSubmit}
                    disabled={
                      createDropMutation.isPending ||
                      updateDropMutation.isPending
                    }
                    data-testid="button-submit-drop"
                  >
                    {editingDrop ? "Save Changes" : "Create Drop"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={!!deleteConfirmId}
              onOpenChange={(open) => !open && setDeleteConfirmId(null)}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Drop</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this drop? This will also
                    remove all associated vouchers. This action cannot be
                    undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteConfirmId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (deleteConfirmId) {
                        deleteDropMutation.mutate(deleteConfirmId);
                        setDeleteConfirmId(null);
                      }
                    }}
                    disabled={deleteDropMutation.isPending}
                    data-testid="button-confirm-delete"
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Treasure Hunters</CardTitle>
                <CardDescription>
                  View all users who have used the app
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                    {usersQuery.data?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.nickname || (
                            <span className="text-muted-foreground">
                              Anonymous
                            </span>
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
                    {(!usersQuery.data || usersQuery.data.length === 0) && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          No users yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {analytics && (
              <>
                <div className="grid md:grid-cols-3 gap-4">
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
                      <p className="text-xs text-muted-foreground">
                        Merchant signups
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
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
                            1
                          );
                          const percentage = (hour.claims / maxClaims) * 100;
                          return (
                            <div
                              key={hour.hour}
                              className="flex items-center gap-2"
                            >
                              <span className="text-xs text-muted-foreground w-8">
                                {hour.hour.toString().padStart(2, "0")}:00
                              </span>
                              <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-6">
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
                      <CardTitle className="text-lg flex items-center gap-2">
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
                                <span className="text-muted-foreground">
                                  Claims:
                                </span>{" "}
                                {day.claims}
                              </span>
                              <span className="text-sm">
                                <span className="text-muted-foreground">
                                  Redeemed:
                                </span>{" "}
                                {day.redemptions}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {!analytics && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Loading analytics...
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog
        open={!!adminCodesDropId}
        onOpenChange={(open) => {
          if (!open) {
            setAdminCodesDropId(null);
            setAdminCodesText("");
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-teal-500" />
              Partner Promo Codes
            </DialogTitle>
            <DialogDescription>
              Upload codes that will be assigned one-per-user when they claim
              this drop.
            </DialogDescription>
          </DialogHeader>

          {adminCodesQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">
                    {adminCodesQuery.data?.stats?.total || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {adminCodesQuery.data?.stats?.available || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Available</div>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {adminCodesQuery.data?.stats?.assigned || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Assigned</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Add Codes</Label>
                <Textarea
                  placeholder="Paste codes here, one per line or comma-separated..."
                  value={adminCodesText}
                  onChange={(e) => setAdminCodesText(e.target.value)}
                  rows={5}
                  className="font-mono text-sm"
                  data-testid="textarea-admin-promo-codes"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleAdminUploadCodes}
                    disabled={
                      !adminCodesText.trim() ||
                      adminUploadCodesMutation.isPending
                    }
                    className="flex-1"
                    data-testid="button-admin-upload-codes"
                  >
                    {adminUploadCodesMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Codes
                  </Button>
                  <Button
                    variant="outline"
                    className="relative"
                    data-testid="button-admin-import-csv"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Import CSV
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleAdminFileImportCodes}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </Button>
                </div>
              </div>

              {(adminCodesQuery.data?.codes?.length || 0) > 0 && (
                <div className="space-y-2">
                  <Label>Code List</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                    {adminCodesQuery.data?.codes.map((code: any) => (
                      <div
                        key={code.id}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <span className="font-mono">{code.code}</span>
                        <Badge
                          variant={
                            code.status === "available"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {code.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
