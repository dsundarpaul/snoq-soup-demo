import { ApiProperty } from "@nestjs/swagger";

export enum PromoCodeStatus {
  AVAILABLE = "available",
  ASSIGNED = "assigned",
}

export class PromoCodeHunterSummaryDto {
  @ApiProperty({ type: String, description: "Hunter ID" })
  id!: string;

  @ApiProperty({ type: String, nullable: true, description: "Hunter nickname" })
  nickname!: string | null;

  @ApiProperty({ type: String, nullable: true, description: "Hunter email" })
  email!: string | null;
}

export class PromoCodeResponseDto {
  @ApiProperty({ type: String, description: "Promo code ID" })
  id!: string;

  @ApiProperty({ type: String, description: "Drop ID" })
  dropId!: string;

  @ApiProperty({ type: String, description: "Merchant ID" })
  merchantId!: string;

  @ApiProperty({ example: "SUMMER2024", description: "Promo code value" })
  code!: string;

  @ApiProperty({ enum: PromoCodeStatus, description: "Promo code status" })
  status!: PromoCodeStatus;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Assigned voucher ID",
  })
  voucherId!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Hunter ID when assigned (always string in API responses)",
  })
  hunterId!: string | null;

  @ApiProperty({
    type: PromoCodeHunterSummaryDto,
    nullable: true,
    description:
      "Hunter profile when loaded (e.g. list endpoint with populate); null otherwise",
  })
  hunter!: PromoCodeHunterSummaryDto | null;

  @ApiProperty({
    nullable: true,
    description: "Timestamp when code was assigned",
  })
  assignedAt!: Date | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Display label: nickname, else email, when hunter is loaded",
  })
  assignedToName!: string | null;

  @ApiProperty({ description: "Timestamp when document was created" })
  createdAt!: Date;

  @ApiProperty({ description: "Timestamp when document was last updated" })
  updatedAt!: Date;
}
