export interface DashboardStats {
  totalDrops: number;
  activeDrops: number;
  totalVouchers: number;
  redeemedVouchers: number;
}

export interface AnalyticsData {
  overview: {
    totalDrops: number;
    activeDrops: number;
    expiredDrops: number;
    totalClaims: number;
    totalRedemptions: number;
    conversionRate: number;
    avgTimeToRedemption: number | null;
  };
  dropPerformance: Array<{
    id: string;
    name: string;
    claims: number;
    redemptions: number;
    conversionRate: number;
    rewardValue: string;
  }>;
  claimsByDay: Array<{
    date: string;
    claims: number;
    redemptions: number;
  }>;
  claimsByHour: Array<{
    hour: number;
    claims: number;
  }>;
  topDrops: Array<{
    id: string;
    name: string;
    redemptions: number;
  }>;
  staffPerformance?: Array<{
    staffId: string;
    displayName: string;
    redemptions: number;
    scans: number;
    lastActive: string | null;
  }>;
}

export interface PromoCodeRow {
  id: string;
  code: string;
  status: string;
}

export interface PromoCodesResponse {
  codes: PromoCodeRow[];
  stats: { total: number; available: number; assigned: number };
}
