import { ApiProperty } from "@nestjs/swagger";

export class PresignResponseDto {
  @ApiProperty({
    example: "https://minio.example.com/bucket/uploads/abc123.png?X-Amz-...",
    description: "Presigned URL for direct upload",
  })
  presignedUrl!: string;

  @ApiProperty({
    example: "uploads/abc123.png",
    description: "Object key in the storage bucket",
  })
  key!: string;

  @ApiProperty({
    example: "https://cdn.example.com/uploads/abc123.png",
    description: "Public URL to access the uploaded file",
  })
  publicUrl!: string;

  @ApiProperty({
    example: 300,
    description: "URL expiration time in seconds",
  })
  expiresIn!: number;
}
