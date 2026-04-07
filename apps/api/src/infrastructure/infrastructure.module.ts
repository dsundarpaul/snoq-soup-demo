import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RedisModule } from "./redis/redis.module";

@Module({
  imports: [ConfigModule, RedisModule],
  exports: [RedisModule],
})
export class InfrastructureModule {}
