import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from "@nestjs/swagger";
import type { HandleUploadBody } from "@vercel/blob/client";
import { BlobService } from "./blob.service";
import { S3Service } from "./s3.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { GetSignedUrlDto } from "./dto/request/get-signed-url.dto";
import { SignedUrlResponseDto } from "./dto/response/signed-url-response.dto";

@ApiTags("S3")
@Controller("s3")
export class S3Controller {
  constructor(
    private readonly s3Service: S3Service,
    private readonly blobService: BlobService,
  ) {}

  @Post("signed-url")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Generate presigned URL for file upload (S3/MinIO)",
  })
  @ApiResponse({ status: 201, type: SignedUrlResponseDto })
  @ApiResponse({ status: 400, description: "Invalid file type or size" })
  @HttpCode(HttpStatus.CREATED)
  async getSignedUrl(
    @Body() dto: GetSignedUrlDto,
  ): Promise<SignedUrlResponseDto> {
    return this.s3Service.generateSignedUrl(
      dto.namespace,
      dto.fileName,
      dto.contentType,
      dto.size,
    );
  }

  @Post("blob/client-upload")
  @ApiOperation({
    summary:
      "Vercel Blob client-upload endpoint. Issues short-lived upload tokens and receives upload-completion callbacks.",
    description:
      "For `blob.generate-client-token` events the caller must send a valid Bearer token in the Authorization header. `blob.upload-completed` events are verified by Vercel's request signature.",
  })
  @ApiBody({
    description:
      "HandleUploadBody from @vercel/blob/client. Forwarded as-is to the SDK.",
    schema: { type: "object" },
  })
  @ApiResponse({ status: 201, description: "Client token or upload ack" })
  @ApiResponse({ status: 400, description: "Invalid file type, size, or namespace" })
  @ApiResponse({ status: 401, description: "Missing or invalid auth token" })
  @HttpCode(HttpStatus.CREATED)
  async handleBlobClientUpload(
    @Req() req: Request,
    @Body() body: HandleUploadBody,
  ): Promise<unknown> {
    return this.blobService.handleClientUpload(body, req);
  }
}
