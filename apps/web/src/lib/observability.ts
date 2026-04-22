type SentryModule = typeof import("@sentry/nextjs");

type CaptureOptions = {
  level?: "fatal" | "error" | "warning" | "log" | "info" | "debug";
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

type MetricOptions = {
  unit?: string;
  attributes?: Record<string, string>;
};

function readDsn(): string | undefined {
  const isServer = typeof window === "undefined";
  const dsn = isServer
    ? process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN
    : process.env.NEXT_PUBLIC_SENTRY_DSN;
  return dsn && dsn.length > 0 ? dsn : undefined;
}

function readEnvironment(): string | undefined {
  const isServer = typeof window === "undefined";
  return isServer
    ? process.env.SENTRY_ENVIRONMENT ??
        process.env.VERCEL_ENV ??
        process.env.NODE_ENV
    : process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
        process.env.NEXT_PUBLIC_VERCEL_ENV ??
        process.env.NODE_ENV;
}

export const isObservabilityEnabled = (): boolean => readDsn() !== undefined;

let sentryPromise: Promise<SentryModule> | null = null;

function loadSentry(): Promise<SentryModule> | null {
  const dsn = readDsn();
  if (!dsn) return null;
  if (!sentryPromise) {
    sentryPromise = import("@sentry/nextjs").then((Sentry) => {
      const client = Sentry.getClient?.();
      if (!client) {
        Sentry.init({
          dsn,
          environment: readEnvironment(),
          tracesSampleRate:
            process.env.NODE_ENV === "production" ? 0.1 : 1,
        });
      }
      return Sentry;
    });
  }
  return sentryPromise;
}

export function captureException(
  error: unknown,
  options?: CaptureOptions
): void {
  const p = loadSentry();
  if (!p) return;
  void p.then((Sentry) => {
    Sentry.captureException(error, options);
  });
}

export function captureMessage(
  message: string,
  options?: CaptureOptions
): void {
  const p = loadSentry();
  if (!p) return;
  void p.then((Sentry) => {
    Sentry.captureMessage(message, options);
  });
}

export function metricsDistribution(
  name: string,
  value: number,
  options?: MetricOptions
): void {
  const p = loadSentry();
  if (!p) return;
  void p.then((Sentry) => {
    Sentry.metrics.distribution(name, value, options);
  });
}
