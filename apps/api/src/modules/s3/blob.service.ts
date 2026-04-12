import { Injectable, BadRequestException } from "@nestjs/common";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { extname } from "path";
import { config } from "../../config/app.config";
import {
  ALLOWED_MIME_TYPES,
  AllowedMimeType,
} from "./dto/request/get-signed-url.dto";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class BlobService {
  async upload(
    namespace: string,
    fileName: string,
    contentType: AllowedMimeType,
    size: number,
    fileBuffer: Buffer,
  ): Promise<{ publicUrl: string }> {
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
      );
    }

    if (size > MAX_FILE_SIZE) {
      throw new BadRequestException("File size must not exceed 5MB");
    }

    const uniqueName = `${randomUUID()}${extname(fileName).toLowerCase()}`;
    const pathname = `${namespace}/${uniqueName}`;

    const { url } = await put(pathname, fileBuffer, {
      access: "public",
      contentType,
      token: config.blob.token,
    });

    return { publicUrl: url };
  }
}
