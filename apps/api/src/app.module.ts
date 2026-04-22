import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { CacheModule } from "@nestjs/cache-manager";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_GUARD } from "@nestjs/core";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { MerchantsModule } from "./modules/merchants/merchants.module";
import { DropsModule } from "./modules/drops/drops.module";
import { VouchersModule } from "./modules/vouchers/vouchers.module";
import { HuntersModule } from "./modules/hunters/hunters.module";
import { AdminModule } from "./modules/admin/admin.module";
import { CommandsModule } from "./modules/commands/commands.module";
import { ScannerModule } from "./modules/scanner/scanner.module";
import { PromoCodesModule } from "./modules/promo-codes/promo-codes.module";
import { S3Module } from "./modules/s3/s3.module";
import { RequireFetchHeaderGuard } from "./common/guards/require-fetch-header.guard";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // Rate limiting
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: "default",
          ttl: 60000,
          limit: 100,
        },
        {
          name: "strict",
          ttl: 60000,
          limit: 20,
        },
        {
          name: "publicHeavyRead",
          ttl: 60000,
          limit: 10000,
        },
      ],
    }),

    CacheModule.register({
      isGlobal: true,
      ttl: 20_000,
    }),

    // Global modules
    DatabaseModule,

    // Feature modules
    AuthModule,
    MerchantsModule,
    DropsModule,
    VouchersModule,
    HuntersModule,
    AdminModule,
    CommandsModule,
    ScannerModule,
    PromoCodesModule,
    S3Module,
  ],
  providers: [
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RequireFetchHeaderGuard,
    },
  ],
})
export class AppModule {}
