import type { Drop, Merchant, Voucher } from "@shared/schema";

type DropWithCount = Drop & { captureCount?: number };

function toIso(v: Date | string | undefined | null): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  return v.toISOString();
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
  return {
    merchant: {
      businessName: String(raw.name ?? ""),
      username: String(raw.username ?? ""),
      logoUrl: (raw.logoUrl as string | null) ?? null,
    },
    drops: [],
  };
}

export function mapVoucherMagicDetailToView(raw: Record<string, unknown>): {
  voucher: Voucher;
  drop: Drop;
  businessName: string;
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
  } as Voucher;
  const drop = mapNestDropToLegacy({
    id: String(dropInfo?.id ?? ""),
    merchantId: String(merchant?.id ?? ""),
    name: String(dropInfo?.name ?? ""),
    description: String(dropInfo?.description ?? ""),
    rewardValue: String(dropInfo?.rewardValue ?? ""),
    logoUrl: dropInfo?.logoUrl ?? null,
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
    businessName: String(merchant?.name ?? ""),
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
    totalClaims: Number(stats?.totalClaims ?? 0),
    totalRedemptions: Number(stats?.totalRedemptions ?? 0),
    dateOfBirth: profile?.dateOfBirth
      ? String(profile.dateOfBirth)
      : undefined,
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
      redemptionType: "anytime",
      redemptionMinutes: null,
      redemptionDeadline: null,
      availabilityType: "unlimited",
      captureLimit: null,
      active: true,
      startTime: null,
      endTime: null,
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
  const claimsOverTimeMerged = Array.from(claimsByDate.entries()).map(
    ([date, v]) => ({
      date,
      claims: v.claims,
      redemptions: v.redemptions,
    })
  );
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
    claimsByHour: [] as { hour: number; claims: number }[],
    topMerchants: [] as {
      id: string;
      businessName: string;
      claims: number;
      redemptions: number;
    }[],
    topDrops: [] as {
      id: string;
      name: string;
      merchantName: string;
      claims: number;
      redemptions: number;
    }[],
    conversionRate: Number(raw.redemptionRate ?? 0),
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

export function mapAdminDropItem(
  raw: Record<string, unknown>,
  merchantName = ""
) {
  const loc = raw.location as { lat?: number; lng?: number } | undefined;
  const redemption = raw.redemption as Record<string, unknown> | undefined;
  const availability = raw.availability as Record<string, unknown> | undefined;
  const schedule = raw.schedule as Record<string, unknown> | undefined;
  return {
    id: String(raw.id ?? ""),
    merchantId: String(raw.merchantId ?? ""),
    name: String(raw.name ?? ""),
    description: String(raw.description ?? ""),
    merchantName,
    rewardValue: String(raw.rewardValue ?? ""),
    latitude: loc?.lat ?? 0,
    longitude: loc?.lng ?? 0,
    radius: Number(raw.radius ?? 0),
    logoUrl: (raw.logoUrl as string | null) ?? null,
    redemptionType: String(redemption?.type ?? "anytime"),
    redemptionMinutes: (redemption?.minutes as number) ?? null,
    redemptionDeadline: redemption?.deadline
      ? toIso(redemption.deadline as Date)
      : null,
    availabilityType: String(availability?.type ?? "unlimited"),
    captureLimit: (availability?.limit as number) ?? null,
    startTime: schedule?.start ? toIso(schedule.start as Date) : null,
    endTime: schedule?.end ? toIso(schedule.end as Date) : null,
    active: raw.active !== false,
    createdAt: toIso(raw.createdAt as Date) ?? "",
  };
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
  redemptionType: "anytime" | "timer" | "window";
  redemptionMinutes?: number;
  redemptionDeadline?: string;
  availabilityType: "unlimited" | "captureLimit" | "timeWindow";
  captureLimit?: number;
  startTime?: string;
  endTime?: string;
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
    active: true,
  };
}
