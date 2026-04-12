import { Injectable, BadRequestException } from "@nestjs/common";
import * as Minio from "minio";
import { Agent as HttpsAgent } from "node:https";
import { randomUUID } from "crypto";
import { extname } from "path";
import { config } from "../../config/app.config";
import {
  ALLOWED_MIME_TYPES,
  AllowedMimeType,
} from "./dto/request/get-signed-url.dto";
import { SignedUrlResponseDto } from "./dto/response/signed-url-response.dto";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class S3Service {
  private readonly client: Minio.Client;
  private readonly s3Config = config.s3;

  constructor() {
    this.client = new Minio.Client({
      endPoint: this.s3Config.host || "localhost",
      port: 443,
      useSSL: true,
      accessKey: this.s3Config.accessKey || "",
      secretKey: this.s3Config.secretKey || "",
      transportAgent: new HttpsAgent({ rejectUnauthorized: false }),
    });
  }

  async generateSignedUrl(
    namespace: string,
    fileName: string,
    contentType: AllowedMimeType,
    size: number,
  ): Promise<SignedUrlResponseDto> {
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
      );
    }

    if (size > MAX_FILE_SIZE) {
      throw new BadRequestException("File size must not exceed 5MB");
    }

    const bucket = this.s3Config.defaultBucket || "souqsnap-uploads";
    const subPath = this.s3Config.subPath || "uploads";
    const uniqueName = `${randomUUID()}${extname(fileName).toLowerCase()}`;
    const key = `${subPath}/${namespace}/${uniqueName}`;

    const url = await this.client.presignedPutObject(bucket, key);

    const publicBase = (this.s3Config.publicURL || "").replace(/\/$/, "");
    const publicUrl = `${publicBase}/${bucket}/${key}`;

    return { url, publicUrl };
  }
}
