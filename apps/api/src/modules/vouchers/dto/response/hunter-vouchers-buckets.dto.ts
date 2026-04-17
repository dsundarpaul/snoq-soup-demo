import { ApiProperty } from "@nestjs/swagger";
import { DropResponseDto } from "../../../drops/dto/response/drop-response.dto";
import { VoucherResponseDto } from "./voucher-response.dto";
import { MerchantInfoDto } from "./voucher-detail-response.dto";

export class HunterVoucherItemDto {
  @ApiProperty({ type: VoucherResponseDto })
  voucher!: VoucherResponseDto;

  @ApiProperty({ type: DropResponseDto })
  drop!: DropResponseDto;

  @ApiProperty({
    type: MerchantInfoDto,
    description: "Merchant for store location and contact on voucher views",
  })
  merchant!: MerchantInfoDto;
}

export class HunterVouchersBucketsDto {
  @ApiProperty({ type: [HunterVoucherItemDto] })
  unredeemed!: HunterVoucherItemDto[];

  @ApiProperty({ type: [HunterVoucherItemDto] })
  redeemed!: HunterVoucherItemDto[];

  @ApiProperty({ example: 12 })
  unredeemedTotal!: number;

  @ApiProperty({ example: 34 })
  redeemedTotal!: number;

  @ApiProperty({
    type: [String],
    description: "All drop ids the hunter has claimed (regardless of limits)",
  })
  claimedDropIds!: string[];
}

export class HunterVouchersPageDto {
  @ApiProperty({ type: [HunterVoucherItemDto] })
  items!: HunterVoucherItemDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}
