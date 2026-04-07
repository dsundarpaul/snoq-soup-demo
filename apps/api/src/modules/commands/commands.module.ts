import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/database/database.module";
import { AdminSeedCommand } from "./admin-seed.command";

@Module({
  imports: [DatabaseModule],
  providers: [AdminSeedCommand],
})
export class CommandsModule {}
