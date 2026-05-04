import { Module } from "@nestjs/common";
import { DropsModule } from "../drops/drops.module";
import { HuntersController } from "./hunters.controller";
import { HuntersService } from "./hunters.service";
import { OptionalJwtAuthGuard } from "../../common/guards/optional-jwt-auth.guard";
import { HunterResourceGuard } from "../../common/guards/hunter-resource.guard";
import { RegisteredHunterGuard } from "../../common/guards/registered-hunter.guard";

@Module({
  imports: [DropsModule],
  controllers: [HuntersController],
  providers: [
    HuntersService,
    OptionalJwtAuthGuard,
    HunterResourceGuard,
    RegisteredHunterGuard,
  ],
  exports: [HuntersService],
})
export class HuntersModule {}
