import { Module } from "@nestjs/common";
import { S3Service } from "./s3.service";
import { BlobService } from "./blob.service";
import { S3Controller } from "./s3.controller";

@Module({
  controllers: [S3Controller],
  providers: [S3Service, BlobService],
  exports: [S3Service, BlobService],
})
export class S3Module {}
