import { Module } from "@nestjs/common";
import { ScannerService } from "./scanner.service";
import { ScannerController } from "./scanner.controller";
import { VouchersModule } from "../vouchers/vouchers.module";

@Module({
  imports: [VouchersModule],
  controllers: [ScannerController],
  providers: [ScannerService],
  exports: [ScannerService],
})
export class ScannerModule {}
