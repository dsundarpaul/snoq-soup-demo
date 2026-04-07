import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { appConfig, minioConfig, s3Config } from "./config/app.config";
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
import { UploadModule } from "./modules/upload/upload.module";

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, minioConfig, s3Config],
      cache: true,
    }),

    // Rate limiting
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: "default",
          ttl: 60000, // 1 minute
          limit: 100, // 100 requests per minute
        },
        {
          name: "strict",
          ttl: 60000,
          limit: 20, // 20 requests per minute for sensitive endpoints
        },
      ],
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
    UploadModule,
  ],
  providers: [
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
