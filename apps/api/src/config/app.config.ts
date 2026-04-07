import { registerAs } from "@nestjs/config";
import { z } from "zod";

const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(["development", "staging", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRY: z.string().default("24h"),
  REFRESH_TOKEN_EXPIRY: z.string().default("7d"),

  // Database
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  // MinIO/S3 Storage
  MINIO_ENDPOINT: z.string().min(1, "MINIO_ENDPOINT is required"),
  MINIO_ACCESS_KEY: z.string().min(1, "MINIO_ACCESS_KEY is required"),
  MINIO_SECRET_KEY: z.string().min(1, "MINIO_SECRET_KEY is required"),
  MINIO_BUCKET: z.string().default("souqsnap-uploads"),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  MINIO_PORT: z.coerce.number().default(9000),

  // S3-compatible alternative config
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET_NAME: z.string().default("souqsnap-uploads"),
  S3_REGION: z.string().default("us-east-1"),
  S3_PUBLIC_URL: z.string().optional(),

  // Redis
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_TTL: z.coerce.number().default(300),

  // SMTP Email
  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().min(1, "SMTP_USER is required"),
  SMTP_PASS: z.string().min(1, "SMTP_PASS is required"),
  SMTP_FROM: z.string().email().default("noreply@souqsnap.com"),

  // Twilio SMS
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE: z.string().optional(),

  // Optional Features
  ENABLE_EMAIL: z.coerce.boolean().default(true),
  ENABLE_SMS: z.coerce.boolean().default(false),
});

export type AppConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues.map(
      (err) => `${err.path.join(".")}: ${err.message}`,
    );
    throw new Error(`Environment validation failed:\n${errors.join("\n")}`);
  }

  return result.data;
}

export default registerAs("app", () => {
  return validateEnv(process.env);
});

// Helper config exports for specific domains
export const appConfig = registerAs("app", () => validateEnv(process.env));

export const jwtConfig = registerAs("jwt", () => ({
  secret: process.env.JWT_SECRET!,
  expiresIn: process.env.JWT_EXPIRY || "24h",
  refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
}));

export const databaseConfig = registerAs("database", () => ({
  uri: process.env.MONGODB_URI!,
}));

export const minioConfig = registerAs("minio", () => ({
  endpoint: process.env.MINIO_ENDPOINT!,
  port: parseInt(process.env.MINIO_PORT || "9000", 10),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
  bucket: process.env.MINIO_BUCKET || "souqsnap",
}));

export const smtpConfig = registerAs("smtp", () => ({
  host: process.env.SMTP_HOST!,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  user: process.env.SMTP_USER!,
  pass: process.env.SMTP_PASS!,
  from: process.env.SMTP_FROM || "noreply@souqsnap.com",
  secure: parseInt(process.env.SMTP_PORT || "587", 10) === 465,
}));

export const twilioConfig = registerAs("twilio", () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE,
  enabled: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN,
}));

export const redisConfig = registerAs("redis", () => ({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || "0", 10),
  ttl: parseInt(process.env.REDIS_TTL || "300", 10),
}));

export const s3Config = registerAs("s3", () => ({
  endpoint:
    process.env.S3_ENDPOINT ||
    process.env.MINIO_ENDPOINT ||
    "http://localhost:9000",
  accessKey: process.env.S3_ACCESS_KEY || process.env.MINIO_ACCESS_KEY || "",
  secretKey: process.env.S3_SECRET_KEY || process.env.MINIO_SECRET_KEY || "",
  bucket:
    process.env.S3_BUCKET_NAME ||
    process.env.MINIO_BUCKET ||
    "souqsnap-uploads",
  region: process.env.S3_REGION || "us-east-1",
  publicUrl:
    process.env.S3_PUBLIC_URL ||
    process.env.S3_ENDPOINT ||
    process.env.MINIO_ENDPOINT ||
    "http://localhost:9000",
}));
