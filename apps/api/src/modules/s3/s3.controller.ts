import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { S3Service } from "./s3.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { GetSignedUrlDto } from "./dto/request/get-signed-url.dto";
import { SignedUrlResponseDto } from "./dto/response/signed-url-response.dto";

@ApiTags("S3")
@Controller("s3")
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @Post("signed-url")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate presigned URL for file upload" })
  @ApiResponse({ status: 201, type: SignedUrlResponseDto })
  @ApiResponse({ status: 400, description: "Invalid file type or size" })
  @HttpCode(HttpStatus.CREATED)
  async getSignedUrl(
    @Body() dto: GetSignedUrlDto,
  ): Promise<SignedUrlResponseDto> {
    return this.s3Service.generateSignedUrl(dto);
  }
}
