import { ApiProperty } from "@nestjs/swagger";
import { PromoCodeResponseDto } from "./promo-code-response.dto";

export class PromoCodeListDto {
  @ApiProperty({
    type: [PromoCodeResponseDto],
    description: "List of promo codes",
  })
  items!: PromoCodeResponseDto[];

  @ApiProperty({ type: Number, description: "Total number of promo codes" })
  total!: number;

  @ApiProperty({ type: Number, description: "Current page number" })
  page!: number;

  @ApiProperty({ type: Number, description: "Number of items per page" })
  limit!: number;

  @ApiProperty({ type: Number, description: "Total number of pages" })
  totalPages!: number;
}

export class PromoCodeStatsDto {
  @ApiProperty({ type: String, description: "Drop ID" })
  dropId!: string;

  @ApiProperty({ type: Number, description: "Total number of promo codes" })
  total!: number;

  @ApiProperty({ type: Number, description: "Number of available promo codes" })
  available!: number;

  @ApiProperty({ type: Number, description: "Number of assigned promo codes" })
  assigned!: number;
}
