import { ApiProperty } from "@nestjs/swagger";

export class TimeSeriesDataPoint {
  @ApiProperty({ example: "2024-01-01", description: "Date or time period" })
  date!: string;

  @ApiProperty({ example: 45, description: "Value for this time period" })
  value!: number;
}

export class AdminClaimsByHourPoint {
  @ApiProperty({ example: 14, description: "Hour of day (0–23, UTC)" })
  hour!: number;

  @ApiProperty({ example: 12, description: "Claims in this hour" })
  claims!: number;
}

export class AdminTopMerchantAnalyticsItem {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessName!: string;

  @ApiProperty({ description: "Vouchers claimed in the period" })
  voucherCount!: number;

  @ApiProperty({ description: "Of those vouchers, how many are redeemed" })
  redemptionCount!: number;
}

export class AdminTopDropAnalyticsItem {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  merchantName!: string;

  @ApiProperty()
  voucherCount!: number;

  @ApiProperty()
  redemptionCount!: number;
}

export class AdminAnalyticsDto {
  @ApiProperty({
    type: [TimeSeriesDataPoint],
    description: "New merchants over time",
  })
  merchantsOverTime!: TimeSeriesDataPoint[];

  @ApiProperty({
    type: [TimeSeriesDataPoint],
    description: "New drops created over time",
  })
  dropsOverTime!: TimeSeriesDataPoint[];

  @ApiProperty({ type: [TimeSeriesDataPoint], description: "Claims over time" })
  claimsOverTime!: TimeSeriesDataPoint[];

  @ApiProperty({
    type: [TimeSeriesDataPoint],
    description: "Redemptions over time",
  })
  redemptionsOverTime!: TimeSeriesDataPoint[];

  @ApiProperty({
    type: [TimeSeriesDataPoint],
    description: "New hunters over time",
  })
  huntersOverTime!: TimeSeriesDataPoint[];

  @ApiProperty({
    type: [AdminClaimsByHourPoint],
    description: "Claim counts by hour of day (UTC) in the period",
  })
  claimsByHour!: AdminClaimsByHourPoint[];

  @ApiProperty({
    type: [AdminTopMerchantAnalyticsItem],
    description: "Merchants with the most vouchers claimed in the period",
  })
  topMerchants!: AdminTopMerchantAnalyticsItem[];

  @ApiProperty({
    type: [AdminTopDropAnalyticsItem],
    description: "Drops with the most vouchers claimed in the period",
  })
  topDrops!: AdminTopDropAnalyticsItem[];

  @ApiProperty({
    example: 42.5,
    description: "Redemptions ÷ claims in period, percent (0–100)",
  })
  conversionRate!: number;

  @ApiProperty({ example: "2024-01-01", description: "Analytics period start" })
  periodStart!: string;

  @ApiProperty({ example: "2024-01-31", description: "Analytics period end" })
  periodEnd!: string;

  @ApiProperty({ example: "daily", description: "Aggregation granularity" })
  granularity!: "hourly" | "daily" | "weekly" | "monthly";

  @ApiProperty({
    example: "2024-01-15T10:30:00.000Z",
    description: "Analytics generated at",
  })
  generatedAt!: Date;
}
