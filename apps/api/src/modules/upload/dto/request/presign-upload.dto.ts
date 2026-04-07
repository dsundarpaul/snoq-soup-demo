import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsNumber,
  Min,
  Max,
  Matches,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export class PresignUploadDto {
  @ApiProperty({
    example: "logo.png",
    description: "Original filename",
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[^\\/:*?"<>|]+$/, {
    message: "Filename contains invalid characters",
  })
  filename!: string;

  @ApiProperty({
    example: "image/png",
    description: "MIME type of the file",
    enum: ALLOWED_MIME_TYPES,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(ALLOWED_MIME_TYPES, {
    message: `Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
  })
  contentType!: AllowedMimeType;

  @ApiProperty({
    example: 1024000,
    description: "File size in bytes (max 5MB)",
    minimum: 1,
    maximum: MAX_FILE_SIZE,
  })
  @IsNumber()
  @Min(1)
  @Max(MAX_FILE_SIZE, { message: "File size must not exceed 5MB" })
  size!: number;
}
