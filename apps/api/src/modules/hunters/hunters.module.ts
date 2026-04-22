import { Module } from "@nestjs/common";
import { DropsModule } from "../drops/drops.module";
import { HuntersService } from "./hunters.service";
import { HuntersController } from "./hunters.controller";

@Module({
  imports: [DropsModule],
  controllers: [HuntersController],
  providers: [HuntersService],
  exports: [HuntersService],
})
export class HuntersModule {}
