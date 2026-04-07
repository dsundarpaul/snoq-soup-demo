import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CacheModule } from "@nestjs/cache-manager";
import { redisStore } from "cache-manager-ioredis-yet";

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          host: config.get("REDIS_HOST", "localhost"),
          port: config.get("REDIS_PORT", 6379),
          password: config.get("REDIS_PASSWORD"),
          ttl: 60 * 5, // 5 minutes default
        }),
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [CacheModule],
})
export class RedisModule {}
