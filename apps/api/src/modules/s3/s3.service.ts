import { Injectable, Logger } from "@nestjs/common";
import * as Minio from "minio";
import { Agent as HttpsAgent } from "node:https";
import { randomUUID } from "crypto";
import { basename, extname } from "path";

import { config } from "../../config/app.config";
import { GetSignedUrlDto } from "./dto/request/get-signed-url.dto";
import { SignedUrlResponseDto } from "./dto/response/signed-url-response.dto";

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: Minio.Client | null;
  private readonly s3Config = config.s3;
  private readonly isConfigured: boolean;
  private readonly putObjectRequestHeaders: Record<string, string>;

  constructor() {
    this.isConfigured = Boolean(
      this.s3Config.enabled &&
        this.s3Config.host &&
        this.s3Config.accessKey &&
        this.s3Config.secretKey &&
        this.s3Config.defaultBucket &&
        this.s3Config.publicURL,
    );
    this.putObjectRequestHeaders = this.s3Config.putAcl
      ? { "x-amz-acl": "public-read" }
      : {};

    if (!this.isConfigured) {
      this.client = null;
      this.logger.warn("S3 is not fully configured; signed URL uploads disabled.");
      return;
    }

    this.client = new Minio.Client({
      endPoint: this.s3Config.host,
      port: this.s3Config.port,
      useSSL: this.s3Config.useSSL,
      accessKey: this.s3Config.accessKey,
      secretKey: this.s3Config.secretKey,
      region: this.s3Config.region,
      transportAgent: new HttpsAgent({
        rejectUnauthorized: this.s3Config.rejectUnauthorized,
      }),
    });
  }

  isReady(): boolean {
    return Boolean(this.client && this.isConfigured);
  }

  async generateSignedUrl(dto: GetSignedUrlDto): Promise<SignedUrlResponseDto> {
    if (!this.client || !this.isConfigured) {
      throw new Error("S3 storage is not ready");
    }
    const bucket = this.s3Config.defaultBucket;
    const key = this.buildObjectKey(dto.namespace, dto.fileName);

    const url = await this.client.presignedUrl(
      "PUT",
      bucket,
      key,
      undefined,
      this.putObjectRequestHeaders,
    );
    const publicUrl = this.publicUrlForKey(key, bucket);

    this.logger.debug(`generated signed url: bucket=${bucket} key=${key}`);

    return { url, publicUrl };
  }

  async deleteObject(publicUrl: string): Promise<void> {
    if (!this.client || !this.isConfigured) {
      throw new Error("S3 storage is not ready");
    }
    const bucket = this.s3Config.defaultBucket;
    const key = this.extractObjectKey(publicUrl, bucket);
    await this.client.removeObject(bucket, key);
  }

  private buildObjectKey(namespace: string, fileName: string): string {
    const sanitizedStem = basename(fileName, extname(fileName))
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const stem = sanitizedStem || "file";
    const uniqueName = `${randomUUID()}_${stem}${extname(fileName).toLowerCase()}`;
    const parts = [this.s3Config.subPath, namespace, uniqueName].filter(
      (part): part is string => Boolean(part),
    );
    return parts.join("/");
  }

  private publicUrlForKey(key: string, bucket: string): string {
    const base = this.s3Config.publicURL.replace(/\/+$/, "");
    const url = new URL(base.includes("://") ? base : `https://${base}`);
    const normalizedKey = key.replace(/^\/+/, "");
    const isVirtualHosted = url.hostname
      .toLowerCase()
      .startsWith(`${bucket.toLowerCase()}.`);

    if (isVirtualHosted) {
      return `${base}/${normalizedKey}`;
    }
    return `${base}/${bucket}/${normalizedKey}`;
  }

  private extractObjectKey(publicUrl: string, bucket: string): string {
    let u: URL;
    try {
      u = new URL(publicUrl);
    } catch {
      return publicUrl;
    }
    const path = u.pathname;
    if (u.hostname.toLowerCase().startsWith(`${bucket.toLowerCase()}.`)) {
      return path.replace(/^\//, "");
    }
    const withBucket = `/${bucket}/`;
    if (path.startsWith(withBucket)) {
      return path.slice(withBucket.length);
    }
    return path.replace(/^\//, "");
  }
}
