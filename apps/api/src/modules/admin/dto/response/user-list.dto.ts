import { ApiProperty } from "@nestjs/swagger";

export class UserListItemDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "Hunter ID",
  })
  id!: string;

  @ApiProperty({ example: "device_abc123", description: "Device ID" })
  deviceId!: string;

  @ApiProperty({
    example: "HunterJoe",
    description: "Hunter nickname",
    nullable: true,
  })
  nickname!: string | null;

  @ApiProperty({
    example: "hunter@example.com",
    description: "Email",
    nullable: true,
  })
  email!: string | null;

  @ApiProperty({ example: 25, description: "Total claims" })
  totalClaims!: number;

  @ApiProperty({ example: 18, description: "Total redemptions" })
  totalRedemptions!: number;

  @ApiProperty({
    example: "2024-01-05T12:00:00.000Z",
    description: "Created at",
  })
  createdAt!: Date;

  @ApiProperty({
    example: "2024-01-10T15:30:00.000Z",
    description: "Last activity",
    nullable: true,
  })
  lastActivity!: Date | null;
}

export class UserListDto {
  @ApiProperty({ type: [UserListItemDto], description: "List of users" })
  items!: UserListItemDto[];

  @ApiProperty({ example: 2800, description: "Total number of users" })
  total!: number;

  @ApiProperty({ example: 1, description: "Current page" })
  page!: number;

  @ApiProperty({ example: 20, description: "Items per page" })
  limit!: number;

  @ApiProperty({ example: 140, description: "Total pages" })
  totalPages!: number;

  @ApiProperty({ example: true, description: "Has next page" })
  hasNextPage!: boolean;

  @ApiProperty({ example: false, description: "Has previous page" })
  hasPrevPage!: boolean;
}
