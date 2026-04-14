import { ApiProperty } from "@nestjs/swagger";
import { DropResponseDto } from "../../../drops/dto/response/drop-response.dto";
import { VoucherResponseDto } from "./voucher-response.dto";

export class HunterVoucherItemDto {
  @ApiProperty({ type: VoucherResponseDto })
  voucher!: VoucherResponseDto;

  @ApiProperty({ type: DropResponseDto })
  drop!: DropResponseDto;
}

export class HunterVouchersBucketsDto {
  @ApiProperty({ type: [HunterVoucherItemDto] })
  unredeemed!: HunterVoucherItemDto[];

  @ApiProperty({ type: [HunterVoucherItemDto] })
  redeemed!: HunterVoucherItemDto[];
}
