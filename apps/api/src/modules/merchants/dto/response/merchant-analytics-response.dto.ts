export interface DailyStatDto {
  date: string;
  claims: number;
  redemptions: number;
}

export interface DropPerformanceDto {
  id: string;
  name: string;
  claims: number;
  redemptions: number;
  conversionRate: number;
  rewardValue: string;
}

export interface TopDropDto {
  id: string;
  name: string;
  redemptions: number;
}

export interface OverviewDto {
  totalDrops: number;
  activeDrops: number;
  expiredDrops: number;
  totalClaims: number;
  totalRedemptions: number;
  conversionRate: number;
  avgTimeToRedemption: number | null;
}

export class MerchantAnalyticsResponseDto {
  overview!: OverviewDto;
  dailyStats!: DailyStatDto[];
  dropPerformance!: DropPerformanceDto[];
  topDrops!: TopDropDto[];
}
