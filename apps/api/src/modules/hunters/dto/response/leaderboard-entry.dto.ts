import { ApiProperty } from "@nestjs/swagger";

export class LeaderboardEntryDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439022",
    description: "Hunter ID",
  })
  id!: string;

  @ApiProperty({ example: "HunterJoe", description: "Hunter nickname" })
  nickname!: string;

  @ApiProperty({ example: 25, description: "Total claims" })
  totalClaims!: number;

  @ApiProperty({ example: 18, description: "Total redemptions" })
  totalRedemptions!: number;

  @ApiProperty({ example: 1, description: "Rank position" })
  rank!: number;
}
