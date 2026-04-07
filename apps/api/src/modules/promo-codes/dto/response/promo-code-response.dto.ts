import { ApiProperty } from "@nestjs/swagger";

export enum PromoCodeStatus {
  AVAILABLE = "available",
  ASSIGNED = "assigned",
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
    nullable: true,
    description: "Timestamp when code was assigned",
  })
  assignedAt!: Date | null;

  @ApiProperty({ description: "Timestamp when document was created" })
  createdAt!: Date;

  @ApiProperty({ description: "Timestamp when document was last updated" })
  updatedAt!: Date;
}
