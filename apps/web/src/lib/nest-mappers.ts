import type { Drop, Merchant, Voucher } from "@shared/schema";

type DropWithCount = Drop & { captureCount?: number };

function toIso(v: Date | string | undefined | null): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  return v.toISOString();
}

function nestProfileDobToYmd(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : undefined;
}

export function mapNestDropToLegacy(
  raw: Record<string, unknown>,
  captureCount?: number
): DropWithCount {
  const loc = raw.location as { lat?: number; lng?: number } | undefined;
  const lat = typeof loc?.lat === "number" ? loc.lat : Number(raw.latitude ?? 0);
  const lng = typeof loc?.lng === "number" ? loc.lng : Number(raw.longitude ?? 0);
  const redemption = raw.redemption as
    | { type?: string; minutes?: number; deadline?: Date | string }
    | undefined;
  const availability = raw.availability as
    | { type?: string; limit?: number }
    | undefined;
  const schedule = raw.schedule as
    | { start?: Date | string; end?: Date | string }
    | undefined;
  const rv = raw.rewardValue;
  const rewardValue =
    typeof rv === "number" ? String(rv) : String(rv ?? "");

  let availabilityType: string = "unlimited";
  let captureLimit: number | null = null;
  let startTime: string | null = null;
  let endTime: string | null = null;

  if (schedule?.start || schedule?.end) {
    availabilityType = "timeWindow";
    startTime = toIso(schedule.start);
    endTime = toIso(schedule.end);
  } else if (availability?.type === "limited") {
    availabilityType = "captureLimit";
    captureLimit = availability.limit ?? null;
  }

  const out: DropWithCount = {
    id: String(raw.id ?? ""),
    merchantId: String(raw.merchantId ?? ""),
    name: String(raw.name ?? ""),
    description: String(raw.description ?? ""),
    latitude: lat,
    longitude: lng,
    radius: Number(raw.radius ?? 15),
    rewardValue,
    logoUrl: (raw.logoUrl as string | null) ?? null,
    termsAndConditions:
      (raw.termsAndConditions as string | null | undefined) ?? null,
    redemptionType: (redemption?.type as Drop["redemptionType"]) ?? "anytime",
    redemptionMinutes: redemption?.minutes ?? null,
    redemptionDeadline: redemption?.deadline
      ? (toIso(redemption.deadline) as unknown as Date)
      : null,
    availabilityType: availabilityType as Drop["availabilityType"],
    captureLimit,
    active: raw.active !== false,
    startTime: startTime as unknown as Date,
    endTime: endTime as unknown as Date,
    voucherAbsoluteExpiresAt: raw.voucherAbsoluteExpiresAt
      ? ((toIso(raw.voucherAbsoluteExpiresAt as Date | string) ??
          null) as unknown as Date)
      : null,
    voucherTtlHoursAfterClaim:
      typeof raw.voucherTtlHoursAfterClaim === "number"
        ? raw.voucherTtlHoursAfterClaim
        : raw.voucherTtlHoursAfterClaim != null
          ? Number(raw.voucherTtlHoursAfterClaim)
          : null,
    createdAt: (raw.createdAt as Date) ?? new Date(),
  };
  if (captureCount !== undefined) out.captureCount = captureCount;
  return out;
}

export function mapActiveDropsPayload(json: {
  drops?: Record<string, unknown>[];
  total?: number;
}): DropWithCount[] {
  const list = json.drops ?? [];
  return list.map((d) => {
    const distance = typeof d.distance === "number" ? d.distance : undefined;
    const drop = mapNestDropToLegacy(d);
    if (distance !== undefined) {
      (drop as DropWithCount & { distance?: number }).distance = distance;
    }
    return drop;
  });
}

export function mapMerchantMeToLegacy(
  raw: Record<string, unknown>
): Merchant {
  const sl = raw.storeLocation as
    | {
        lat?: number;
        lng?: number;
        address?: string;
        city?: string;
        state?: string;
        pincode?: string;
        landmark?: string;
        howToReach?: string;
      }
    | null
    | undefined;
  return {
    id: String(raw.id ?? ""),
    username: String(raw.username ?? ""),
    businessName: String(raw.name ?? raw.businessName ?? ""),
    email: String(raw.email ?? ""),
    emailVerified: Boolean(raw.isVerified ?? raw.emailVerified),
    password: "",
    verificationToken: null,
    resetToken: null,
    resetTokenExpiry: null,
    scannerToken: null,
    logoUrl: (raw.logoUrl as string | null) ?? null,
    storeLocation:
      sl?.lat != null && sl?.lng != null
        ? {
            lat: sl.lat,
            lng: sl.lng,
            address: sl.address,
            city: sl.city,
            state: sl.state,
            pincode: sl.pincode,
            landmark: sl.landmark,
            howToReach: sl.howToReach,
          }
        : null,
    businessPhone: (raw.businessPhone as string | null) ?? null,
    businessHours: (raw.businessHours as string | null) ?? null,
    createdAt: (raw.createdAt as Date) ?? new Date(),
  } as Merchant;
}

export function mapAuthUserToMerchant(
  user: Record<string, unknown>
): Merchant {
  return {
    id: String(user.id ?? ""),
    username: String(user.username ?? ""),
    businessName: String(user.businessName ?? ""),
    email: String(user.email ?? ""),
    emailVerified: Boolean(user.emailVerified),
    password: "",
    verificationToken: null,
    resetToken: null,
    resetTokenExpiry: null,
    scannerToken: null,
    logoUrl: null,
    createdAt: new Date(),
  } as Merchant;
}

export function mapStorePublicPayload(
  pub: Record<string, unknown>,
  drops: DropWithCount[]
): {
  merchant: { businessName: string; username: string; logoUrl: string | null };
  drops: DropWithCount[];
} {
  return {
    merchant: {
      businessName: String(pub.name ?? ""),
      username: String(pub.username ?? ""),
      logoUrl: (pub.logoUrl as string | null) ?? null,
    },
    drops,
  };
}

export function mapPromoListToLegacy(json: {
  items?: { id?: string; code?: string; status?: string }[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}): {
  codes: { id: string; code: string; status: string }[];
  stats: { total: number; available: number; assigned: number };
} {
  const items = json.items ?? [];
  const codes = items.map((p) => ({
    id: String(p.id ?? ""),
    code: String(p.code ?? ""),
    status: String(p.status ?? ""),
  }));
  const assigned = codes.filter((c) => c.status === "assigned").length;
  return {
    codes,
    stats: {
      total: json.total ?? codes.length,
      available: codes.length - assigned,
      assigned,
    },
  };
}

export function mapNestVoucherToLegacy(
  raw: Record<string, unknown>
): Voucher {
  const claimedBy = raw.claimedBy as Record<string, unknown> | undefined;
  return {
    id: String(raw.id ?? ""),
    dropId: String(raw.dropId ?? ""),
    merchantId: String(raw.merchantId ?? ""),
    claimedAt: (raw.claimedAt as Date) ?? new Date(),
    redeemedAt: (raw.redeemedAt as Date | null) ?? null,
    redeemed: Boolean(raw.redeemed),
    userEmail: (claimedBy?.email as string) ?? null,
    userPhone: (claimedBy?.phone as string) ?? null,
    magicToken: String(raw.magicToken ?? ""),
    deviceId: (claimedBy?.deviceId as string) ?? null,
    hunterId: (claimedBy?.hunterId as string) ?? null,
    expiresAt: raw.expiresAt
      ? ((toIso(raw.expiresAt as Date | string) ?? null) as unknown as Date)
      : null,
  } as Voucher;
}

export function mapRedeemResultToLegacy(raw: Record<string, unknown>): {
  voucher: Voucher;
  drop: Drop;
} {
  const vRaw = (raw.voucher as Record<string, unknown>) ?? {};
  const dropInfo = vRaw.drop as Record<string, unknown> | undefined;
  const voucher = mapNestVoucherToLegacy(vRaw);
  const drop = mapNestDropToLegacy({
    id: voucher.dropId,
    merchantId: voucher.merchantId,
    name: String(dropInfo?.name ?? raw.dropName ?? ""),
    description: String(dropInfo?.description ?? ""),
    rewardValue: String(dropInfo?.rewardValue ?? ""),
    logoUrl: (dropInfo?.logoUrl as string | null) ?? null,
    termsAndConditions:
      (dropInfo?.termsAndConditions as string | null | undefined) ?? null,
    location: { lat: 0, lng: 0 },
    radius: 15,
  });
  return { voucher, drop };
}

export function mapStaffScannerRedeemToLegacy(raw: Record<string, unknown>): {
  voucher: Voucher;
  drop: Drop;
} {
  const vid = String(raw.voucherId ?? "");
  const token = String(raw.magicToken ?? "");
  const redeemedAtRaw = raw.redeemedAt;
  const redeemedAt =
    redeemedAtRaw != null ? new Date(String(redeemedAtRaw)) : new Date();
  const vInfo = raw.voucher as
    | {
        dropName?: string;
        rewardValue?: string;
        termsAndConditions?: string | null;
      }
    | null
    | undefined;
  const voucher = {
    id: vid,
    dropId: "",
    merchantId: "",
    claimedAt: new Date(),
    redeemedAt,
    redeemed: true,
    userEmail: null,
    userPhone: null,
    magicToken: token,
    deviceId: null,
    hunterId: null,
    expiresAt: null,
  } as Voucher;
  const drop = mapNestDropToLegacy({
    id: "",
    merchantId: "",
    name: String(vInfo?.dropName ?? ""),
    description: "",
    rewardValue: String(vInfo?.rewardValue ?? ""),
    logoUrl: null,
    termsAndConditions: vInfo?.termsAndConditions ?? null,
    location: { lat: 0, lng: 0 },
    radius: 15,
  });
  return { voucher, drop };
}

export function mapMerchantPublicToStoreData(raw: Record<string, unknown>): {
  merchant: {
    businessName: string;
    username: string;
    logoUrl: string | null;
  };
  drops: DropWithCount[];
} {
  const dropsRaw = raw.drops;
  const drops = Array.isArray(dropsRaw)
    ? dropsRaw.map((d) => mapNestDropToLegacy(d as Record<string, unknown>))
    : [];
  return {
    merchant: {
      businessName: String(raw.name ?? ""),
      username: String(raw.username ?? ""),
      logoUrl: (raw.logoUrl as string | null) ?? null,
    },
    drops,
  };
}

export type HunterVoucherMerchantDisplay = {
  businessName: string;
  merchantStoreLocation: {
    lat: number;
    lng: number;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
    howToReach?: string;
  } | null;
  merchantBusinessPhone: string | null;
  merchantBusinessHours: string | null;
};

function nestMerchantRecordToVoucherDisplayFields(
  merchant: Record<string, unknown> | undefined
): HunterVoucherMerchantDisplay {
  if (!merchant) {
    return {
      businessName: "",
      merchantStoreLocation: null,
      merchantBusinessPhone: null,
      merchantBusinessHours: null,
    };
  }

  const sl = merchant.storeLocation as
    | {
        lat?: number;
        lng?: number;
        address?: string;
        city?: string;
        state?: string;
        pincode?: string;
        landmark?: string;
        howToReach?: string;
      }
    | null
    | undefined;

  const merchantStoreLocation =
    sl?.lat != null && sl?.lng != null
      ? {
          lat: sl.lat as number,
          lng: sl.lng as number,
          address: sl.address as string | undefined,
          city: sl.city as string | undefined,
          state: sl.state as string | undefined,
          pincode: sl.pincode as string | undefined,
          landmark: sl.landmark as string | undefined,
          howToReach: sl.howToReach as string | undefined,
        }
      : null;

  return {
    businessName: String(merchant.name ?? ""),
    merchantStoreLocation,
    merchantBusinessPhone: (merchant.businessPhone as string | null) ?? null,
    merchantBusinessHours: (merchant.businessHours as string | null) ?? null,
  };
}

export function mapVoucherMagicDetailToView(raw: Record<string, unknown>): {
  voucher: Voucher;
  drop: Drop;
  businessName: string;
  merchantStoreLocation: {
    lat: number;
    lng: number;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
    howToReach?: string;
  } | null;
  merchantBusinessPhone: string | null;
  merchantBusinessHours: string | null;
} {
  const dropInfo = raw.drop as Record<string, unknown>;
  const merchant = raw.merchant as Record<string, unknown>;
  const claimedBy = raw.claimedBy as Record<string, unknown> | undefined;
  const redemptionConfig = raw.redemptionConfig as
    | Record<string, unknown>
    | undefined;
  const voucher = {
    id: String(raw.id ?? ""),
    dropId: String(dropInfo?.id ?? ""),
    merchantId: String(merchant?.id ?? ""),
    claimedAt: (raw.claimedAt as Date) ?? new Date(),
    redeemedAt: (raw.redeemedAt as Date | null) ?? null,
    redeemed: Boolean(raw.redeemed),
    userEmail: (claimedBy?.email as string) ?? null,
    userPhone: (claimedBy?.phone as string) ?? null,
    magicToken: String(raw.magicToken ?? ""),
    deviceId: (claimedBy?.deviceId as string) ?? null,
    hunterId: (claimedBy?.hunterId as string) ?? null,
    expiresAt: raw.expiresAt
      ? ((toIso(raw.expiresAt as Date | string) ?? null) as unknown as Date)
      : null,
  } as Voucher;
  const drop = mapNestDropToLegacy({
    id: String(dropInfo?.id ?? ""),
    merchantId: String(merchant?.id ?? ""),
    name: String(dropInfo?.name ?? ""),
    description: String(dropInfo?.description ?? ""),
    rewardValue: String(dropInfo?.rewardValue ?? ""),
    logoUrl: dropInfo?.logoUrl ?? null,
    termsAndConditions:
      (dropInfo?.termsAndConditions as string | null | undefined) ?? null,
    location: { lat: 0, lng: 0 },
    radius: 15,
    redemption: redemptionConfig
      ? {
          type: redemptionConfig.type,
          minutes: redemptionConfig.minutes,
          deadline: redemptionConfig.deadline,
        }
      : undefined,
  });

  return {
    voucher,
    drop,
    ...nestMerchantRecordToVoucherDisplayFields(merchant),
  };
}

export function mapClaimResponseToLegacy(raw: Record<string, unknown>): {
  voucher: Voucher;
  drop: Drop;
} {
  const voucher = mapNestVoucherToLegacy(raw);
  const dropRaw = raw.drop as Record<string, unknown> | undefined;
  const drop = dropRaw
    ? mapNestDropToLegacy({
        ...dropRaw,
        id: dropRaw.id ?? voucher.dropId,
        merchantId: raw.merchantId,
      })
    : mapNestDropToLegacy({
        id: voucher.dropId,
        merchantId: voucher.merchantId,
        name: "",
        description: "",
        location: { lat: 0, lng: 0 },
        radius: 15,
        rewardValue: "",
      });
  return { voucher, drop };
}

export function mapHunterVoucherBundleToLegacy(row: {
  voucher: Record<string, unknown>;
  drop: Record<string, unknown>;
  merchant?: Record<string, unknown>;
}): { voucher: Voucher; drop: Drop } & HunterVoucherMerchantDisplay {
  const voucher = mapNestVoucherToLegacy(row.voucher);
  const dropRaw = row.drop;
  const drop = mapNestDropToLegacy({
    ...dropRaw,
    id: dropRaw.id ?? voucher.dropId,
    merchantId: (dropRaw.merchantId as string) ?? voucher.merchantId,
  });
  return {
    voucher,
    drop,
    ...nestMerchantRecordToVoucherDisplayFields(row.merchant),
  };
}

export function mapHunterVouchersBucketsToLegacy(json: Record<string, unknown>): {
  unredeemed: ({ voucher: Voucher; drop: Drop } & HunterVoucherMerchantDisplay)[];
  redeemed: ({ voucher: Voucher; drop: Drop } & HunterVoucherMerchantDisplay)[];
} {
  const u = (json.unredeemed as Record<string, unknown>[] | undefined) ?? [];
  const r = (json.redeemed as Record<string, unknown>[] | undefined) ?? [];
  return {
    unredeemed: u.map((row) =>
      mapHunterVoucherBundleToLegacy(
        row as {
          voucher: Record<string, unknown>;
          drop: Record<string, unknown>;
          merchant?: Record<string, unknown>;
        },
      ),
    ),
    redeemed: r.map((row) =>
      mapHunterVoucherBundleToLegacy(
        row as {
          voucher: Record<string, unknown>;
          drop: Record<string, unknown>;
          merchant?: Record<string, unknown>;
        },
      ),
    ),
  };
}

export function mapHunterProfileToLegacy(raw: Record<string, unknown>): {
  email?: string | null;
  nickname?: string | null;
  totalClaims?: number;
  totalRedemptions?: number;
  [key: string]: unknown;
} {
  const profile = raw.profile as Record<string, unknown> | undefined;
  const stats = raw.stats as Record<string, unknown> | undefined;
  return {
    id: raw.id,
    email: (raw.email as string) ?? null,
    nickname: (raw.nickname as string) ?? null,
    redeemerMerchantId: (raw.redeemerMerchantId as string) ?? null,
    totalClaims: Number(stats?.totalClaims ?? 0),
    totalRedemptions: Number(stats?.totalRedemptions ?? 0),
    dateOfBirth: nestProfileDobToYmd(profile?.dateOfBirth),
    gender: profile?.gender as string | undefined,
    mobileCountryCode: (profile?.countryCode as string) ?? undefined,
    mobileNumber: (profile?.number as string) ?? undefined,
  };
}

export function mapHunterHistoryToVoucherRows(
  json: Record<string, unknown>
): (Voucher & { drop: Drop | null })[] {
  const vouchers = (json.vouchers as Record<string, unknown>[]) ?? [];
  return vouchers.map((row) => {
    const voucher = {
      id: String(row.voucherId ?? ""),
      dropId: String(row.dropId ?? ""),
      merchantId: "",
      claimedAt: row.claimedAt ? new Date(String(row.claimedAt)) : new Date(),
      redeemedAt: row.redeemedAt
        ? new Date(String(row.redeemedAt))
        : null,
      redeemed: Boolean(row.redeemed),
      userEmail: null,
      userPhone: null,
      magicToken: String(row.magicToken ?? ""),
      deviceId: null,
      hunterId: null,
      expiresAt: null,
    } as Voucher;
    const drop: Drop | null = {
      id: String(row.dropId ?? ""),
      merchantId: "",
      name: String(row.dropName ?? ""),
      description: "",
      latitude: 0,
      longitude: 0,
      radius: 15,
      rewardValue: String(row.rewardValue ?? ""),
      logoUrl: null,
      termsAndConditions: null,
      redemptionType: "anytime",
      redemptionMinutes: null,
      redemptionDeadline: null,
      availabilityType: "unlimited",
      captureLimit: null,
      active: true,
      startTime: null,
      endTime: null,
      voucherAbsoluteExpiresAt: null,
      voucherTtlHoursAfterClaim: null,
      createdAt: new Date(),
    } as Drop;
    return { ...voucher, drop };
  });
}

export function mapAdminStatsToPlatform(raw: Record<string, unknown>) {
  const totalMerchants = Number(raw.totalMerchants ?? 0);
  const verified = Number(raw.verifiedMerchants ?? 0);
  return {
    totalMerchants,
    verifiedMerchants: verified,
    pendingMerchants: Math.max(0, totalMerchants - verified),
    totalDrops: Number(raw.totalDrops ?? 0),
    activeDrops: Number(raw.activeDrops ?? 0),
    totalVouchers: Number(raw.totalVouchers ?? 0),
    redeemedVouchers: Number(raw.totalRedemptions ?? 0),
    totalHunters: Number(raw.totalHunters ?? 0),
  };
}

export function mapAdminAnalyticsToLegacy(raw: Record<string, unknown>) {
  const merchantsOverTime = (raw.merchantsOverTime as { date: string; value: number }[]) ?? [];
  const claimsOverTime = (raw.claimsOverTime as { date: string; value: number }[]) ?? [];
  const redemptionsOverTime =
    (raw.redemptionsOverTime as { date: string; value: number }[]) ?? [];
  const claimsByDate = new Map<string, { claims: number; redemptions: number }>();
  for (const c of claimsOverTime) {
    claimsByDate.set(c.date, {
      claims: c.value,
      redemptions: 0,
    });
  }
  for (const r of redemptionsOverTime) {
    const cur = claimsByDate.get(r.date) ?? { claims: 0, redemptions: 0 };
    cur.redemptions = r.value;
    claimsByDate.set(r.date, cur);
  }
  const claimsOverTimeMerged = Array.from(claimsByDate.entries())
    .map(([date, v]) => ({
      date,
      claims: v.claims,
      redemptions: v.redemptions,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const claimsByHourRaw =
    (raw.claimsByHour as { hour: number; claims: number }[]) ?? [];
  const claimsByHour =
    claimsByHourRaw.length === 24
      ? [...claimsByHourRaw].sort((a, b) => a.hour - b.hour)
      : Array.from({ length: 24 }, (_, hour) => ({
          hour,
          claims: claimsByHourRaw.find((h) => h.hour === hour)?.claims ?? 0,
        }));

  const topMerchantsRaw =
    (raw.topMerchants as Record<string, unknown>[]) ?? [];
  const topDropsRaw = (raw.topDrops as Record<string, unknown>[]) ?? [];

  const conversionRaw = raw.conversionRate ?? raw.redemptionRate;
  const conversionRate =
    typeof conversionRaw === "number" && Number.isFinite(conversionRaw)
      ? conversionRaw
      : Number(conversionRaw ?? 0);

  return {
    merchantGrowth: merchantsOverTime.map((p) => ({
      date: p.date,
      count: p.value,
    })),
    hunterGrowth:
      ((raw.huntersOverTime as { date: string; value: number }[]) ?? []).map(
        (p) => ({ date: p.date, count: p.value })
      ),
    claimsOverTime: claimsOverTimeMerged,
    claimsByHour,
    topMerchants: topMerchantsRaw.map((m) => ({
      id: String(m.id ?? ""),
      businessName: String(m.businessName ?? ""),
      claims: Number(m.voucherCount ?? m.claims ?? 0),
      redemptions: Number(m.redemptionCount ?? m.redemptions ?? 0),
    })),
    topDrops: topDropsRaw.map((d) => ({
      id: String(d.id ?? ""),
      name: String(d.name ?? ""),
      merchantName: String(d.merchantName ?? ""),
      claims: Number(d.voucherCount ?? d.claims ?? 0),
      redemptions: Number(d.redemptionCount ?? d.redemptions ?? 0),
    })),
    conversionRate,
  };
}

export function mapAdminMerchantItem(raw: Record<string, unknown>) {
  return {
    id: String(raw.id ?? ""),
    username: String(raw.username ?? ""),
    businessName: String(raw.businessName ?? ""),
    email: String(raw.email ?? ""),
    emailVerified: Boolean(raw.isVerified ?? false),
    createdAt: toIso(raw.createdAt as Date) ?? "",
  };
}

export function mapAdminDropItem(raw: Record<string, unknown>) {
  const legacy = mapNestDropToLegacy(raw);
  const merchantName = String(raw.merchantName ?? "");
  return { ...legacy, merchantName };
}

export function mapAdminUserItem(raw: Record<string, unknown>) {
  return {
    id: String(raw.id ?? ""),
    deviceId: String(raw.deviceId ?? ""),
    nickname: (raw.nickname as string) ?? null,
    email: (raw.email as string) ?? null,
    totalClaims: Number(raw.totalClaims ?? 0),
    totalRedemptions: Number(raw.totalRedemptions ?? 0),
    createdAt: toIso(raw.createdAt as Date) ?? "",
  };
}

export function toNestBulkPromoPayload(codes: string[]) {
  return {
    codes: codes.map((code) => ({ code: code.trim() })).filter((c) => c.code),
  };
}

export function mapMerchantAnalyticsToLegacy(
  raw: Record<string, unknown>
): import("@/sections/merchant/merchant-dashboard.types").AnalyticsData {
  const overview = raw.overview as Record<string, unknown> | undefined;
  const dailyStats =
    (raw.dailyStats as { date: string; claims: number; redemptions: number }[]) ??
    [];
  const dropPerformance =
    (raw.dropPerformance as Record<string, unknown>[]) ?? [];
  const topDrops = (raw.topDrops as Record<string, unknown>[]) ?? [];
  return {
    overview: {
      totalDrops: Number(overview?.totalDrops ?? 0),
      activeDrops: Number(overview?.activeDrops ?? 0),
      expiredDrops: Number(overview?.expiredDrops ?? 0),
      totalClaims: Number(overview?.totalClaims ?? 0),
      totalRedemptions: Number(overview?.totalRedemptions ?? 0),
      conversionRate: Number(overview?.conversionRate ?? 0),
      avgTimeToRedemption:
        (overview?.avgTimeToRedemption as number | null) ?? null,
    },
    dropPerformance: dropPerformance.map((d) => ({
      id: String(d.id ?? ""),
      name: String(d.name ?? ""),
      claims: Number(d.claims ?? 0),
      redemptions: Number(d.redemptions ?? 0),
      conversionRate: Number(d.conversionRate ?? 0),
      rewardValue: String(d.rewardValue ?? ""),
    })),
    claimsByDay: dailyStats.map((d) => ({
      date: d.date,
      claims: d.claims,
      redemptions: d.redemptions,
    })),
    claimsByHour:
      (raw.claimsByHour as { hour: number; claims: number }[]) ?? [],
    topDrops: topDrops.map((d) => ({
      id: String(d.id ?? ""),
      name: String(d.name ?? ""),
      redemptions: Number(d.redemptions ?? 0),
    })),
    staffPerformance: [],
  };
}

export function mapMerchantStatsToLegacy(raw: Record<string, unknown>) {
  return {
    totalDrops: Number(raw.totalDrops ?? 0),
    activeDrops: Number(raw.activeDrops ?? 0),
    totalVouchers: Number(raw.totalVouchers ?? 0),
    redeemedVouchers: Number(raw.redeemedVouchers ?? 0),
  };
}

export function createDropFormToNestDto(data: {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  radius: number;
  rewardValue: string;
  logoUrl?: string | null;
  termsAndConditions?: string;
  redemptionType: "anytime" | "timer" | "window";
  redemptionMinutes?: number;
  redemptionDeadline?: string;
  availabilityType: "unlimited" | "captureLimit" | "timeWindow";
  captureLimit?: number;
  startTime?: string;
  endTime?: string;
  voucherAbsoluteExpiresAt?: string;
  voucherTtlHoursAfterClaim?: number;
}): Record<string, unknown> {
  const availabilityType =
    data.availabilityType === "captureLimit" ? "limited" : "unlimited";
  const availabilityLimit =
    data.availabilityType === "captureLimit" && data.captureLimit
      ? data.captureLimit
      : undefined;
  return {
    name: data.name,
    description: data.description,
    latitude: data.latitude,
    longitude: data.longitude,
    radius: data.radius,
    rewardValue: data.rewardValue,
    logoUrl: data.logoUrl || undefined,
    termsAndConditions: data.termsAndConditions?.trim()
      ? data.termsAndConditions.trim()
      : undefined,
    redemptionType: data.redemptionType,
    redemptionMinutes:
      data.redemptionType === "timer" ? data.redemptionMinutes : undefined,
    redemptionDeadline:
      data.redemptionType === "window" && data.redemptionDeadline
        ? new Date(data.redemptionDeadline).toISOString()
        : undefined,
    availabilityType,
    availabilityLimit,
    startTime:
      data.availabilityType === "timeWindow" && data.startTime
        ? new Date(data.startTime).toISOString()
        : data.startTime
          ? new Date(data.startTime).toISOString()
          : undefined,
    endTime:
      data.availabilityType === "timeWindow" && data.endTime
        ? new Date(data.endTime).toISOString()
        : data.endTime
          ? new Date(data.endTime).toISOString()
          : undefined,
    voucherAbsoluteExpiresAt:
      data.voucherAbsoluteExpiresAt?.trim() &&
      data.voucherAbsoluteExpiresAt.trim().length > 0
        ? new Date(data.voucherAbsoluteExpiresAt).toISOString()
        : undefined,
    voucherTtlHoursAfterClaim: data.voucherTtlHoursAfterClaim,
    active: true,
  };
}
