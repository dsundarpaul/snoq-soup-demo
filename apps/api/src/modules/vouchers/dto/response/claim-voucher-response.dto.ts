import { ApiProperty } from "@nestjs/swagger";
import { VoucherResponseDto } from "./voucher-response.dto";
import { MerchantInfoDto } from "./voucher-detail-response.dto";

export class ClaimVoucherResponseDto extends VoucherResponseDto {
  @ApiProperty({
    type: MerchantInfoDto,
    description: "Merchant store details for the claimed voucher",
  })
  merchant!: MerchantInfoDto;
}
