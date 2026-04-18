import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { config } from "../../config/app.config";
import { ALLOWED_MIME_TYPES } from "./dto/request/get-signed-url.dto";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_NAMESPACE = /^[a-zA-Z0-9_-]+$/;

type BlobClientPayload = {
  namespace?: string;
};

type ClientUploadResponse =
  | { type: "blob.generate-client-token"; clientToken: string }
  | { type: "blob.upload-completed"; response: "ok" };

@Injectable()
export class BlobService {
  private readonly logger = new Logger(BlobService.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleClientUpload(
    body: HandleUploadBody,
    request: Request,
  ): Promise<ClientUploadResponse> {
    if (!config.blob.token) {
      throw new BadRequestException("Blob storage is not configured");
    }

    const authenticatedUserId =
      body.type === "blob.generate-client-token"
        ? this.verifyBearerToken(request)
        : null;

    return handleUpload({
      body,
      request,
      token: config.blob.token,
      onBeforeGenerateToken: async (pathname, clientPayloadRaw) => {
        const payload = this.parseClientPayload(clientPayloadRaw);
        const namespace = payload.namespace ?? "general";
        if (!ALLOWED_NAMESPACE.test(namespace)) {
          throw new BadRequestException(
            "Namespace must be alphanumeric (hyphens/underscores allowed)",
          );
        }
        if (!pathname.startsWith(`${namespace}/`)) {
          throw new BadRequestException(
            "Upload pathname must be scoped to the requested namespace",
          );
        }

        return {
          allowedContentTypes: [...ALLOWED_MIME_TYPES],
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: authenticatedUserId,
            namespace,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        this.logger.log(
          `Blob upload completed: ${blob.pathname} (payload=${tokenPayload ?? "null"})`,
        );
      },
    });
  }

  private parseClientPayload(raw: string | null): BlobClientPayload {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as BlobClientPayload;
      }
    } catch {
      throw new BadRequestException("Invalid clientPayload");
    }
    return {};
  }

  private verifyBearerToken(request: Request): string {
    const header =
      request.headers?.authorization ?? request.headers?.Authorization;
    const value = Array.isArray(header) ? header[0] : header;
    const match = typeof value === "string" ? /^Bearer\s+(.+)$/i.exec(value) : null;
    if (!match) {
      throw new UnauthorizedException("Authentication required");
    }
    try {
      const payload = this.jwtService.verify<{ sub: string }>(match[1]!, {
        secret: config.jwt.secret,
      });
      if (!payload?.sub) {
        throw new UnauthorizedException("Invalid token");
      }
      return payload.sub;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
