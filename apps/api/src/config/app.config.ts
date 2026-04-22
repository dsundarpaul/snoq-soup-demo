import * as path from "path";
import * as dotenv from "dotenv";
import { z } from "zod";

const envDir = process.cwd();
dotenv.config({ path: path.join(envDir, ".env") });
dotenv.config({ path: path.join(envDir, ".env.local"), override: true });

function inferDigitalOceanSpacesApiHost(publicURL: string): string {
  const raw = publicURL?.trim();
  if (!raw) return "";
  try {
    const hostname = new URL(
      raw.includes("://") ? raw : `https://${raw}`,
    ).hostname.toLowerCase();
    const m =
      /^[a-z0-9][a-z0-9-]*\.([a-z0-9-]+)\.(?:cdn\.)?digitaloceanspaces\.com$/.exec(
        hostname,
      );
    if (m) return `${m[1]}.digitaloceanspaces.com`;
  } catch {
    return "";
  }
  return "";
}

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(3001),
    FRONTEND_URL: z.string().default(""),
    CORS_ORIGIN: z.string().optional(),
    JWT_SECRET: z.string().default(""),
    JWT_EXPIRY: z.string().default("24h"),
    REFRESH_TOKEN_EXPIRY: z.string().default("7d"),
    MONGODB_URI: z.string().default(""),
    S3_HOST: z.string().default(""),
    S3_ACCESS_KEY: z.string().default(""),
    S3_SECRET_KEY: z.string().default(""),
    S3_DEFAULT_BUCKET: z.string().default("souqsnap-uploads"),
    S3_SUB_PATH: z.string().default("uploads"),
    S3_PUBLIC_URL: z.string().default(""),
    S3_REGION: z.string().default("us-east-1"),
    SMTP_HOST: z.string().default(""),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string().default(""),
    SMTP_PASS: z.string().default(""),
    SMTP_FROM: z.string().default("noreply@souqsnap.com"),
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
    const publicURL = env.S3_PUBLIC_URL?.trim() ?? "";
    const host =
      env.S3_HOST?.trim() ||
      inferDigitalOceanSpacesApiHost(publicURL) ||
      "";
    let region = env.S3_REGION?.trim() || "us-east-1";
    if (!env.S3_REGION?.trim() && host.endsWith(".digitaloceanspaces.com")) {
      const m = /^([a-z0-9-]+)\.digitaloceanspaces\.com$/i.exec(host);
      const fromHost = m?.[1];
      if (fromHost) region = fromHost;
    }
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
        host,
        accessKey: env.S3_ACCESS_KEY?.trim() ?? "",
        secretKey: env.S3_SECRET_KEY?.trim() ?? "",
        defaultBucket: env.S3_DEFAULT_BUCKET,
        subPath: env.S3_SUB_PATH,
        publicURL,
        region,
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
  .refine(
    (cfg) => {
      if (cfg.NODE_ENV !== "production") return true;
      const raw =
        cfg.s3.publicURL?.trim() ||
        (cfg.s3.host?.trim() ? `https://${cfg.s3.host.trim()}` : "");
      if (!raw) return true;
      try {
        const url = new URL(
          raw.includes("://") ? raw : `https://${raw.replace(/^\/\//, "")}`,
        );
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
          return false;
        }
      } catch {
        return true;
      }
      return true;
    },
    {
      message:
        "S3_PUBLIC_URL or S3_HOST must not resolve to localhost in production environment",
    },
  );

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
