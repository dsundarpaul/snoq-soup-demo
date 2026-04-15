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
  FRONTEND_URL: e.FRONTEND_URL ?? "",
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
  TWILIO_ACCOUNT_SID: e.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: e.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE: e.TWILIO_PHONE,
  ENABLE_EMAIL: bool(e.ENABLE_EMAIL, true),
  ENABLE_SMS: bool(e.ENABLE_SMS, false),
  s3: {
    host: process.env.S3_HOST,
    secretKey: process.env.S3_SECRET_KEY,
    accessKey: process.env.S3_ACCESS_KEY,
    defaultBucket: process.env.S3_DEFAULT_BUCKET,
    subPath: process.env.S3_SUB_PATH,
    publicURL: process.env.S3_PUBLIC_URL,
    region: process.env.S3_REGION,
  },
  blob: {
    token: e.BLOB_READ_WRITE_TOKEN ?? "",
  },
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
  audit: {
    enabled: bool(e.AUDIT_ENABLED, false),
    baseUrl: (e.AUDIT_SERVICE_URL ?? "").replace(/\/$/, ""),
    serviceKey: e.AUDIT_SERVICE_KEY ?? "",
    flushIntervalMs: num(e.AUDIT_FLUSH_INTERVAL_MS, 500),
    maxBatchSize: num(e.AUDIT_MAX_BATCH_SIZE, 50),
    maxBufferEvents: num(e.AUDIT_MAX_BUFFER_EVENTS, 5000),
    requestTimeoutMs: num(e.AUDIT_REQUEST_TIMEOUT_MS, 800),
    circuitFailureThreshold: num(e.AUDIT_CIRCUIT_FAILURE_THRESHOLD, 5),
    circuitHalfOpenAfterMs: num(e.AUDIT_CIRCUIT_HALF_OPEN_AFTER_MS, 30_000),
  },
};
