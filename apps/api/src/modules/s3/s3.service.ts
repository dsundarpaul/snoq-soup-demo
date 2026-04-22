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

function buildPublicObjectUrl(
  publicBaseRaw: string,
  bucket: string,
  objectKey: string,
): string {
  const publicBase = publicBaseRaw.replace(/\/$/, "");
  try {
    const href = publicBase.includes("://")
      ? publicBase
      : `https://${publicBase}`;
    const hostFirst = new URL(href).hostname.split(".")[0] ?? "";
    if (hostFirst.toLowerCase() === bucket.toLowerCase()) {
      return `${publicBase}/${objectKey}`;
    }
  } catch {
    return `${publicBase}/${bucket}/${objectKey}`;
  }
  return `${publicBase}/${bucket}/${objectKey}`;
}

function formatUnknownError(err: unknown): Record<string, unknown> {
  if (err instanceof AggregateError) {
    return {
      name: err.name,
      message: err.message,
      errors: err.errors.map((e, i) => ({
        index: i,
        ...formatUnknownError(e),
      })),
    };
  }
  if (err instanceof Error) {
    const base: Record<string, unknown> = {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
    if ("cause" in err && err.cause !== undefined) {
      base.cause = formatUnknownError(err.cause);
    }
    return base;
  }
  return { value: String(err) };
}

@Injectable()
export class S3Service {
  private readonly client: Minio.Client;
  private readonly s3Config = config.s3;

  constructor() {
    const agentOptions =
      config.NODE_ENV === "production" ? {} : { rejectUnauthorized: false };

    const endPoint = this.s3Config.host?.trim() || "localhost";
    console.log("[S3Service] constructing MinIO client", {
      endPoint,
      port: 443,
      useSSL: true,
      NODE_ENV: config.NODE_ENV,
      devTlsRelaxedRejectUnauthorized: config.NODE_ENV !== "production",
      accessKeyPresent: Boolean(this.s3Config.accessKey),
      secretKeyPresent: Boolean(this.s3Config.secretKey),
      defaultBucket: this.s3Config.defaultBucket,
      subPath: this.s3Config.subPath,
      region: this.s3Config.region,
      publicURLPresent: Boolean(this.s3Config.publicURL),
    });

    this.client = new Minio.Client({
      endPoint,
      port: 443,
      useSSL: true,
      accessKey: this.s3Config.accessKey,
      secretKey: this.s3Config.secretKey,
      region: this.s3Config.region,
      transportAgent: new HttpsAgent(agentOptions),
    });
  }

  async generateSignedUrl(
    namespace: string,
    fileName: string,
    contentType: AllowedMimeType,
    size: number,
  ): Promise<SignedUrlResponseDto> {
    const host = this.s3Config.host?.trim() ?? "";
    if (!host) {
      throw new BadRequestException(
        "S3_HOST is not set (or could not be inferred from S3_PUBLIC_URL for DigitalOcean Spaces). Set S3_HOST to the API endpoint hostname only, e.g. blr1.digitaloceanspaces.com (no https://). For local dev, ensure variables are in .env or .env.local (both are loaded). On Vercel, add S3_HOST and S3_PUBLIC_URL to the project environment.",
      );
    }
    if (!this.s3Config.publicURL?.trim()) {
      throw new BadRequestException(
        "S3_PUBLIC_URL is not set. It must be the public base URL for objects (no trailing slash), e.g. https://<bucket>.nyc3.cdn.digitaloceanspaces.com for DigitalOcean Spaces.",
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
      );
    }

    if (size > MAX_FILE_SIZE) {
      throw new BadRequestException("File size must not exceed 5MB");
    }

    const bucket = this.s3Config.defaultBucket;
    const subPath = this.s3Config.subPath;
    const uniqueName = `${randomUUID()}${extname(fileName).toLowerCase()}`;
    const key = `${subPath}/${namespace}/${uniqueName}`;

    console.log("[S3Service] generateSignedUrl", {
      namespace,
      fileName,
      contentType,
      size,
      bucket,
      key,
    });

    let url: string;
    try {
      url = await this.client.presignedPutObject(bucket, key);
    } catch (err) {
      console.error(
        "[S3Service] presignedPutObject failed",
        formatUnknownError(err),
      );
      throw err;
    }

    const publicUrl = buildPublicObjectUrl(
      (this.s3Config.publicURL || "").trim(),
      bucket,
      key,
    );

    console.log("[S3Service] generateSignedUrl ok", {
      publicUrl,
      publicUrlLength: publicUrl.length,
      presignedUrlHost: (() => {
        try {
          return new URL(url).host;
        } catch {
          return "(unparseable url)";
        }
      })(),
    });

    return { url, publicUrl };
  }
}
