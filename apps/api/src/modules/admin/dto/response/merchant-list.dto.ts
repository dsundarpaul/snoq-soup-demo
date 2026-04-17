import { ApiProperty } from "@nestjs/swagger";

export class MerchantListItemDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "Merchant ID",
  })
  id!: string;

  @ApiProperty({
    example: "merchant@example.com",
    description: "Merchant email",
  })
  email!: string;

  @ApiProperty({ example: "My Business Store", description: "Business name" })
  businessName!: string;

  @ApiProperty({ example: "my_store", description: "Merchant username" })
  username!: string;

  @ApiProperty({ example: true, description: "Whether merchant is verified" })
  isVerified!: boolean;

  @ApiProperty({
    example: false,
    description: "Whether the merchant account is suspended by an admin",
  })
  isSuspended!: boolean;

  @ApiProperty({
    example: true,
    description:
      "Whether the merchant may use the product (not suspended and not locked out)",
  })
  isActive!: boolean;

  @ApiProperty({ example: 15, description: "Total drops created" })
  totalDrops!: number;

  @ApiProperty({ example: 5, description: "Active drops count" })
  activeDrops!: number;

  @ApiProperty({
    example: "2024-01-10T08:00:00.000Z",
    description: "Created at",
  })
  createdAt!: Date;
}

export class MerchantListDto {
  @ApiProperty({
    type: [MerchantListItemDto],
    description: "List of merchants",
  })
  items!: MerchantListItemDto[];

  @ApiProperty({ example: 150, description: "Total number of merchants" })
  total!: number;

  @ApiProperty({ example: 1, description: "Current page" })
  page!: number;

  @ApiProperty({ example: 20, description: "Items per page" })
  limit!: number;

  @ApiProperty({ example: 8, description: "Total pages" })
  totalPages!: number;

  @ApiProperty({ example: false, description: "Has next page" })
  hasNextPage!: boolean;

  @ApiProperty({ example: false, description: "Has previous page" })
  hasPrevPage!: boolean;
}
