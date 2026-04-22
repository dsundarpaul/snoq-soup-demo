import { ApiProperty } from "@nestjs/swagger";

export class RefreshSessionResponseDto {
  @ApiProperty({ example: true, description: "Session refreshed; new tokens in cookies" })
  ok!: boolean;
}
