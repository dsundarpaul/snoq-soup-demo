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
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export class GetSignedUrlDto {
  @ApiProperty({ example: "logo.png", description: "Original filename" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[^\\/:*?"<>|]+$/, {
    message: "Filename contains invalid characters",
  })
  fileName!: string;

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

  @ApiProperty({
    example: "merchants",
    description: "Storage namespace/folder",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9-]*$/, {
    message: "Namespace must be alphanumeric (hyphens allowed)",
  })
  namespace!: string;
}
