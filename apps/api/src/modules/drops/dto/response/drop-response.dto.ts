export class RedemptionConfigDto {
  type!: "anytime" | "timer" | "window";
  minutes?: number;
  deadline?: Date;
}

export class AvailabilityDto {
  type!: "unlimited" | "limited";
  limit?: number;
}

export class ScheduleDto {
  start?: Date;
  end?: Date;
}

export class DropResponseDto {
  id!: string;
  name!: string;
  description?: string;
  location!: {
    lat: number;
    lng: number;
  };
  radius!: number;
  rewardValue!: string;
  logoUrl?: string | null;
  termsAndConditions?: string | null;
  redemption!: RedemptionConfigDto;
  availability!: AvailabilityDto;
  schedule?: ScheduleDto;
  active!: boolean;
  voucherAbsoluteExpiresAt?: Date | null;
  voucherTtlHoursAfterClaim?: number | null;
  merchantId!: string;
  captureCount?: number;
  createdAt!: Date;
  updatedAt!: Date;
}
