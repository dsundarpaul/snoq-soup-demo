import * as dotenv from "dotenv";

dotenv.config();

function num(v: string | undefined, fallback: number): number {
  if (v === undefined || v === "") {
    return fallback;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined || v === "") {
    return fallback;
  }
  return v === "true" || v === "1";
}

const e = process.env;

export const config = {
  NODE_ENV: e.NODE_ENV ?? "development",
  PORT: num(e.PORT, 3001),
  CORS_ORIGIN: e.CORS_ORIGIN,
  JWT_SECRET: e.JWT_SECRET ?? "",
  JWT_EXPIRY: e.JWT_EXPIRY ?? "24h",
  REFRESH_TOKEN_EXPIRY: e.REFRESH_TOKEN_EXPIRY ?? "7d",
  MONGODB_URI: e.MONGODB_URI ?? "",
  MINIO_ENDPOINT: e.MINIO_ENDPOINT ?? "",
  MINIO_ACCESS_KEY: e.MINIO_ACCESS_KEY ?? "",
  MINIO_SECRET_KEY: e.MINIO_SECRET_KEY ?? "",
  MINIO_BUCKET: e.MINIO_BUCKET ?? "souqsnap-uploads",
  MINIO_USE_SSL: bool(e.MINIO_USE_SSL, false),
  MINIO_PORT: num(e.MINIO_PORT, 9000),
  MINIO_REGION: e.MINIO_REGION,
  MINIO_BUCKET_NAME: e.MINIO_BUCKET_NAME,
  MINIO_PUBLIC_URL: e.MINIO_PUBLIC_URL,
  S3_ENDPOINT: e.S3_ENDPOINT,
  S3_ACCESS_KEY: e.S3_ACCESS_KEY,
  S3_SECRET_KEY: e.S3_SECRET_KEY,
  S3_BUCKET_NAME: e.S3_BUCKET_NAME ?? "souqsnap-uploads",
  S3_REGION: e.S3_REGION ?? "us-east-1",
  S3_PUBLIC_URL: e.S3_PUBLIC_URL,
  SMTP_HOST: e.SMTP_HOST ?? "",
  SMTP_PORT: num(e.SMTP_PORT, 587),
  SMTP_USER: e.SMTP_USER ?? "",
  SMTP_PASS: e.SMTP_PASS ?? "",
  SMTP_FROM: e.SMTP_FROM ?? "noreply@souqsnap.com",
  TWILIO_ACCOUNT_SID: e.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: e.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE: e.TWILIO_PHONE,
  ENABLE_EMAIL: bool(e.ENABLE_EMAIL, true),
  ENABLE_SMS: bool(e.ENABLE_SMS, false),
  jwt: {
    secret: e.JWT_SECRET ?? "",
    expiresIn: e.JWT_EXPIRY ?? "24h",
    refreshExpiresIn: e.REFRESH_TOKEN_EXPIRY ?? "7d",
  },
  database: {
    uri: e.MONGODB_URI ?? "",
  },
  storage: {
    endpoint: e.S3_ENDPOINT || e.MINIO_ENDPOINT || "http://localhost:9000",
    region: e.S3_REGION || e.MINIO_REGION || "us-east-1",
    accessKey: e.S3_ACCESS_KEY || e.MINIO_ACCESS_KEY || "",
    secretKey: e.S3_SECRET_KEY || e.MINIO_SECRET_KEY || "",
    bucket:
      e.S3_BUCKET_NAME ||
      e.MINIO_BUCKET_NAME ||
      e.MINIO_BUCKET ||
      "souqsnap-uploads",
    publicUrl:
      e.S3_PUBLIC_URL ||
      e.MINIO_PUBLIC_URL ||
      e.S3_ENDPOINT ||
      e.MINIO_ENDPOINT ||
      "http://localhost:9000",
  },
  smtp: {
    host: e.SMTP_HOST ?? "",
    port: num(e.SMTP_PORT, 587),
    user: e.SMTP_USER ?? "",
    pass: e.SMTP_PASS ?? "",
    from: e.SMTP_FROM ?? "noreply@souqsnap.com",
    secure: num(e.SMTP_PORT, 587) === 465,
  },
  twilio: {
    accountSid: e.TWILIO_ACCOUNT_SID,
    authToken: e.TWILIO_AUTH_TOKEN,
    phoneNumber: e.TWILIO_PHONE,
    enabled: Boolean(e.TWILIO_ACCOUNT_SID && e.TWILIO_AUTH_TOKEN),
  },
};
