import { ApiProperty } from "@nestjs/swagger";

export class SignedUrlResponseDto {
  @ApiProperty({
    example: "https://s3.example.com/bucket/path/abc123.png?X-Amz-...",
    description: "Presigned URL for direct PUT upload",
  })
  url!: string;

  @ApiProperty({
    example: "https://cdn.example.com/bucket/path/abc123.png",
    description: "Public URL to access the file after upload",
  })
  publicUrl!: string;
}
