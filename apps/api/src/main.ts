import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { CommandFactory } from "nest-commander";
import helmet from "helmet";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import cookieParser = require("cookie-parser");
import { config } from "./config/app.config";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrapHttp() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
      xContentTypeOptions: true,
      xFrameOptions: { action: "deny" },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    }),
  );

  // Cookie parser for JWT cookies
  app.use(cookieParser());

  // CORS configuration
  const isProduction = config.NODE_ENV === "production";
  app.enableCors({
    origin: isProduction ? config.CORS_ORIGIN?.split(",") || false : true,
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders:
      "Content-Type,Authorization,X-Requested-With,Accept,X-Device-Id",
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // API prefix
  app.setGlobalPrefix("api/v1");

  // Swagger setup - only in non-production environments
  if (config.NODE_ENV !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("SouqSnap API")
      .setDescription("SouqSnap - Gamified Drops & Voucher Platform API")
      .setVersion("1.0.0")
      .addBearerAuth(
        { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        "JWT",
      )
      .addTag("Auth", "Authentication endpoints")
      .addTag("Merchants", "Merchant management")
      .addTag("Drops", "Drop campaigns")
      .addTag("Vouchers", "Voucher management")
      .addTag("Hunters", "Hunter/Collector management")
      .addTag("Admin", "Admin operations")
      .addTag("Scanner", "QR scanning operations")
      .addTag("PromoCodes", "Promo code management")
      .addTag("Upload", "File upload operations")
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  // Start server
  await app.listen(config.PORT);

  logger.log(
    `🚀 Application running on: http://localhost:${config.PORT}/api/v1`,
  );
  if (config.NODE_ENV !== "production") {
    logger.log(`📚 Swagger docs: http://localhost:${config.PORT}/api/docs`);
  }
  logger.log(`🔧 Environment: ${config.NODE_ENV}`);
}

async function bootstrapCli() {
  await CommandFactory.run(AppModule, ["warn", "error"]);
}

async function bootstrap() {
  // Check if running a command (CLI mode - commands contain ':')
  const args = process.argv.slice(2);
  const isCliMode = args.length > 0 && args[0]?.includes(":");

  if (isCliMode) {
    await bootstrapCli();
  } else {
    await bootstrapHttp();
  }
}

bootstrap();
