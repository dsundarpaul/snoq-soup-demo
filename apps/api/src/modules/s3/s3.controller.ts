import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { BlobService } from "./blob.service";
import { S3Service } from "./s3.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { GetSignedUrlDto } from "./dto/request/get-signed-url.dto";
import { SignedUrlResponseDto } from "./dto/response/signed-url-response.dto";
import { AllowedMimeType } from "./dto/request/get-signed-url.dto";
import { Audit } from "../audit/audit.decorator";

@ApiTags("S3")
@Controller("s3")
export class S3Controller {
  constructor(
    private readonly s3Service: S3Service,
    private readonly blobService: BlobService,
  ) {}

  @Post("signed-url")
  @Audit("s3.signed_url")
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

  @Post("upload")
  @Audit("s3.upload")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload file to Vercel Blob storage" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["file", "namespace"],
      properties: {
        file: { type: "string", format: "binary" },
        namespace: { type: "string", example: "merchants" },
      },
    },
  })
  @ApiResponse({
    status: 201,
    schema: { properties: { publicUrl: { type: "string" } } },
  })
  @ApiResponse({ status: 400, description: "Invalid file type or size" })
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body("namespace") namespace: string,
  ): Promise<{ publicUrl: string }> {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    if (!namespace || !/^[a-zA-Z0-9_-]+$/.test(namespace)) {
      throw new BadRequestException(
        "Namespace is required and must be alphanumeric",
      );
    }

    return this.blobService.upload(
      namespace,
      file.originalname,
      file.mimetype as AllowedMimeType,
      file.size,
      file.buffer,
    );
  }
}
