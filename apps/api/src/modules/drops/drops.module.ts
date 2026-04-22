import { Module } from "@nestjs/common";
import { DropsService } from "./drops.service";
import { DropsController } from "./drops.controller";

@Module({
  imports: [],
  controllers: [DropsController],
  providers: [DropsService],
  exports: [DropsService],
})
export class DropsModule {}
