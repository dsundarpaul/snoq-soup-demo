import { Injectable, BadRequestException } from "@nestjs/common";
import { config } from "../../config/app.config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { extname } from "path";
import {
  ALLOWED_MIME_TYPES,
  AllowedMimeType,
} from "./dto/request/presign-upload.dto";
import { PresignResponseDto } from "./dto/response/presign-response.dto";

@Injectable()
export class UploadService {
  private s3Client!: S3Client;
  private bucketName!: string;
  private publicBaseUrl!: string;
  private readonly PRESIGN_EXPIRY_SECONDS = 300; // 5 minutes

  constructor() {
    this.configureMinIO();
  }

  configureMinIO(): void {
    const { storage } = config;
    const endpoint = storage.endpoint;
    const region = storage.region;
    const accessKeyId = storage.accessKey;
    const secretAccessKey = storage.secretKey;

    this.bucketName = storage.bucket;
    this.publicBaseUrl = storage.publicUrl;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      console.warn(
        "[UploadService] S3/MinIO configuration incomplete. Upload service may not work correctly.",
      );
      console.warn(
        "[UploadService] Missing: endpoint, accessKey, or secretKey",
      );
    } else {
      console.log(
        `[UploadService] Configured with endpoint: ${endpoint}, bucket: ${this.bucketName}`,
      );
    }

    this.s3Client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for MinIO compatibility
    });
  }

  async generatePresignedUrl(
    userId: string,
    filename: string,
    contentType: AllowedMimeType,
    size: number,
  ): Promise<PresignResponseDto> {
    // Validate file type
    if (!this.validateFileType(contentType)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
      );
    }

    // Validate file size (5MB max)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (size > MAX_FILE_SIZE) {
      throw new BadRequestException("File size must not exceed 5MB");
    }

    // Generate unique key
    const key = this.generateKey(userId, filename);

    // Create presigned URL for PUT operation
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: this.PRESIGN_EXPIRY_SECONDS,
    });

    return {
      presignedUrl,
      key,
      publicUrl: this.getPublicUrl(key),
      expiresIn: this.PRESIGN_EXPIRY_SECONDS,
    };
  }

  getPublicUrl(key: string): string {
    const baseUrl = this.publicBaseUrl.replace(/\/$/, "");
    return `${baseUrl}/${this.bucketName}/${key}`;
  }

  validateFileType(contentType: string): boolean {
    return ALLOWED_MIME_TYPES.includes(contentType as AllowedMimeType);
  }

  private generateKey(userId: string, originalFilename: string): string {
    const uuid = randomUUID();
    const extension = extname(originalFilename).toLowerCase();
    const timestamp = Date.now();
    return `uploads/${userId}/${timestamp}-${uuid}${extension}`;
  }

  async getFileObject(key: string): Promise<GetObjectCommandOutput | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return response;
    } catch (error) {
      return null;
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }
}
