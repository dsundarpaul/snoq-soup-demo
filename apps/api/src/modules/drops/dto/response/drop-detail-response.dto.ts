import { DropResponseDto } from "./drop-response.dto";

export class MerchantInfoDto {
  id!: string;
  name!: string;
  logoUrl?: string;
  username!: string;
  isVerified!: boolean;
}

export class DropDetailResponseDto extends DropResponseDto {
  merchant!: MerchantInfoDto;
  remainingClaims?: number;
  isWithinSchedule!: boolean;
  isAvailable!: boolean;
  userDistance?: number; // in meters
}
