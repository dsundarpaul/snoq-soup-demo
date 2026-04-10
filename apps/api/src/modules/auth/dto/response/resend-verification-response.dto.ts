import { ApiProperty } from "@nestjs/swagger";

export class ResendVerificationResponseDto {
  @ApiProperty({
    example: "If the email exists, a verification link has been sent.",
  })
  message!: string;
}
