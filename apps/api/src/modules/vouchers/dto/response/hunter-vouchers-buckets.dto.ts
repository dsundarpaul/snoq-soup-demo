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
}
