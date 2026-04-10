import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class VerifyEmailDto {
  @ApiProperty({ description: "Email verification token from the email link" })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
