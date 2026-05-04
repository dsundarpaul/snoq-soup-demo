import * as path from "path";
import * as dotenv from "dotenv";
import { z } from "zod";

const envDir = process.cwd();
dotenv.config({ path: path.join(envDir, ".env") });
dotenv.config({ path: path.join(envDir, ".env.local"), override: true });

function parseS3Host(input: string): {
  host: string;
  port?: number;
  useSSL: boolean;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { host: "", useSSL: true };
  }
  const withScheme = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withScheme);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : undefined,
    useSSL: parsed.protocol === "https:",
  };
}

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(3001),
    FRONTEND_URL: z.string(),
    CORS_ORIGIN: z.string().optional(),
    JWT_SECRET: z.string().optional(),
    JWT_EXPIRY: z.string().default("1d"),
    REFRESH_TOKEN_EXPIRY: z.string().optional(),
    MONGODB_URI: z.string(),
    S3_ENABLED: z
      .string()
      .default("true")
      .transform((v) => v === "true" || v === "1"),
    S3_HOST: z.string().default(""),
    S3_ACCESS_KEY: z.string().default(""),
    S3_SECRET_KEY: z.string().default(""),
    S3_DEFAULT_BUCKET: z.string().default(""),
    S3_SUB_PATH: z.string().optional(),
    S3_PUBLIC_URL: z.string().default(""),
    S3_REGION: z.string().default("us-east-1"),
    S3_REJECT_UNAUTHORIZED: z
      .string()
      .default("true")
      .transform((v) => v === "true" || v === "1"),
    S3_PUT_ACL: z
      .string()
      .default("public-read")
      .transform((v) => v !== "none"),
    SMTP_HOST: z.string(),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z
      .string()
      .optional()
      .pipe(z.string().min(1, "SMTP_FROM is required when set"))
      .default("noreply@souqsnap.com"),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_PHONE: z.string().optional(),
    ENABLE_EMAIL: z
      .string()
      .default("true")
      .transform((v) => v === "true" || v === "1"),
    ENABLE_SMS: z
      .string()
      .default("false")
      .transform((v) => v === "true" || v === "1"),
  })
  .transform((env) => {
    const parsedS3Host = parseS3Host(env.S3_HOST);
    const normalizedS3SubPath = env.S3_SUB_PATH
      ? env.S3_SUB_PATH.replace(/^\/+|\/+$/g, "")
      : "";
    return {
      NODE_ENV: env.NODE_ENV,
      PORT: env.PORT,
      FRONTEND_URL: env.FRONTEND_URL,
      CORS_ORIGIN: env.CORS_ORIGIN,
      JWT_SECRET: env.JWT_SECRET,
      JWT_EXPIRY: env.JWT_EXPIRY,
      REFRESH_TOKEN_EXPIRY: env.REFRESH_TOKEN_EXPIRY,
      MONGODB_URI: env.MONGODB_URI,
      TWILIO_ACCOUNT_SID: env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: env.TWILIO_AUTH_TOKEN,
      TWILIO_PHONE: env.TWILIO_PHONE,
      ENABLE_EMAIL: env.ENABLE_EMAIL,
      ENABLE_SMS: env.ENABLE_SMS,
      s3: {
        enabled: env.S3_ENABLED,
        host: parsedS3Host.host,
        port: parsedS3Host.port,
        useSSL: parsedS3Host.useSSL,
        accessKey: env.S3_ACCESS_KEY,
        secretKey: env.S3_SECRET_KEY,
        defaultBucket: env.S3_DEFAULT_BUCKET,
        subPath: normalizedS3SubPath,
        publicURL: env.S3_PUBLIC_URL,
        region: env.S3_REGION,
        rejectUnauthorized: env.S3_REJECT_UNAUTHORIZED,
        putAcl: env.S3_PUT_ACL,
      },
      jwt: {
        secret: env.JWT_SECRET,
        expiresIn: env.JWT_EXPIRY,
        refreshExpiresIn: env.REFRESH_TOKEN_EXPIRY,
      },
      database: {
        uri: env.MONGODB_URI,
      },
      smtp: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
        from: env.SMTP_FROM,
        secure: env.SMTP_PORT === 465,
      },
      twilio: {
        accountSid: env.TWILIO_ACCOUNT_SID,
        authToken: env.TWILIO_AUTH_TOKEN,
        phoneNumber: env.TWILIO_PHONE,
        enabled: Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN),
      },
    };
  })
  .refine(
    (cfg) => {
      if (cfg.NODE_ENV === "production") {
        if (!cfg.JWT_SECRET) return false;
        if (!cfg.MONGODB_URI) return false;
      }
      return true;
    },
    {
      message:
        "JWT_SECRET and MONGODB_URI are required in production environment",
    },
  )
  .superRefine((cfg, ctx) => {
    if (cfg.NODE_ENV !== "production") return;
    const raw =
      cfg.s3.publicURL || (cfg.s3.host ? `https://${cfg.s3.host}` : "");
    if (!raw) return;
    let url: URL;
    try {
      url = new URL(
        raw.includes("://") ? raw : `https://${raw.replace(/^\/\//, "")}`,
      );
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "S3_PUBLIC_URL or S3_HOST must form a valid URL in production when set",
      });
      return;
    }
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "S3_PUBLIC_URL or S3_HOST must not resolve to localhost in production environment",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = parsed.data;
