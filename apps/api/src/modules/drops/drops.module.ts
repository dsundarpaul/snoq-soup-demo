import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DropsService } from "./drops.service";
import { DropsController } from "./drops.controller";
import { Drop, DropSchema } from "../../database/schemas/drop.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Drop.name, schema: DropSchema }]),
  ],
  controllers: [DropsController],
  providers: [DropsService],
  exports: [DropsService],
})
export class DropsModule {}
