import { ApiProperty } from "@nestjs/swagger";

export class TimeSeriesDataPoint {
  @ApiProperty({ example: "2024-01-01", description: "Date or time period" })
  date!: string;

  @ApiProperty({ example: 45, description: "Value for this time period" })
  value!: number;
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
