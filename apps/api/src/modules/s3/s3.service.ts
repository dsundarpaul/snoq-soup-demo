import { Injectable, Logger } from "@nestjs/common";
import * as Minio from "minio";
import { Agent as HttpsAgent } from "node:https";
import { randomUUID } from "crypto";
import { extname } from "path";

import { config } from "../../config/app.config";
import { GetSignedUrlDto } from "./dto/request/get-signed-url.dto";
import { SignedUrlResponseDto } from "./dto/response/signed-url-response.dto";

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: Minio.Client;
  private readonly s3Config = config.s3;

  constructor() {
    this.client = new Minio.Client({
      endPoint: this.s3Config.host,
      port: 443,
      useSSL: true,
      accessKey: this.s3Config.accessKey,
      secretKey: this.s3Config.secretKey,
      region: this.s3Config.region,
      transportAgent: new HttpsAgent({
        rejectUnauthorized: config.NODE_ENV === "production",
      }),
    });
  }

  async generateSignedUrl(dto: GetSignedUrlDto): Promise<SignedUrlResponseDto> {
    const bucket = this.s3Config.defaultBucket;
    const key = this.buildObjectKey(dto.namespace, dto.fileName);

    const url = await this.client.presignedUrl("PUT", bucket, key, undefined, {
      "x-amz-acl": "public-read",
    });
    const parsed = new URL(url);
    const publicUrl = `${parsed.origin}${parsed.pathname}`;

    this.logger.debug(`generated signed url: bucket=${bucket} key=${key}`);

    return { url, publicUrl };
  }

  async deleteObject(publicUrl: string): Promise<void> {
    const bucket = this.s3Config.defaultBucket;
    const key = this.extractObjectKey(publicUrl, bucket);
    await this.client.removeObject(bucket, key);
  }

  private buildObjectKey(namespace: string, fileName: string): string {
    const uniqueName = `${randomUUID()}${extname(fileName).toLowerCase()}`;
    const parts = [this.s3Config.subPath, namespace, uniqueName].filter(
      (part): part is string => Boolean(part),
    );
    return parts.join("/");
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
