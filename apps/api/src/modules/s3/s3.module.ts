import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { S3Service } from "./s3.service";
import { BlobService } from "./blob.service";
import { S3Controller } from "./s3.controller";
import { config } from "../../config/app.config";

@Module({
  imports: [JwtModule.register({ secret: config.jwt.secret })],
  controllers: [S3Controller],
  providers: [S3Service, BlobService],
  exports: [S3Service, BlobService],
})
export class S3Module {}
