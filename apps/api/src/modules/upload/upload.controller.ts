import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { Response } from "express";
import { UploadService } from "./upload.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import {
  CurrentUser,
  CurrentUserType,
} from "../../common/decorators/current-user.decorator";
import { PresignUploadDto } from "./dto/request/presign-upload.dto";
import { PresignResponseDto } from "./dto/response/presign-response.dto";

@ApiTags("Upload")
@Controller("upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post("presign")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Generate presigned URL for file upload",
    description:
      "Returns a presigned URL for direct upload to S3/MinIO storage. Supports JPEG, PNG, WebP, and SVG files up to 5MB.",
  })
  @ApiResponse({ status: 201, type: PresignResponseDto })
  @ApiResponse({ status: 400, description: "Invalid file type or size" })
  @HttpCode(HttpStatus.CREATED)
  async generatePresignUrl(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: PresignUploadDto,
  ): Promise<PresignResponseDto> {
    return this.uploadService.generatePresignedUrl(
      user.userId,
      dto.filename,
      dto.contentType,
      dto.size,
    );
  }

  @Get(":key(*)")
  @ApiOperation({
    summary: "Get file by key",
    description:
      "Streams or redirects to the requested file. Use the key from the presign response.",
  })
  @ApiParam({
    name: "key",
    description: "File key/path (e.g., uploads/user-id/filename.png)",
    type: String,
  })
  @ApiResponse({ status: 200, description: "File content" })
  @ApiResponse({ status: 404, description: "File not found" })
  async getFile(
    @Param("key") key: string,
    @Res() res: Response,
  ): Promise<void> {
    // Redirect to public URL for better performance
    const publicUrl = this.uploadService.getPublicUrl(key);
    res.redirect(publicUrl);
  }
}
