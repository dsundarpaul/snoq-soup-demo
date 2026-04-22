import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { captureException, captureMessage } from "@/lib/observability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

const STRIPPED_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
]);

const FORWARD_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "cookie",
  "user-agent",
  "x-device-id",
] as const;

const DEFAULT_DEV_BACKEND = "http://127.0.0.1:3001";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function normalizeBackendBase(input: string): string | null {
  let raw = input.trim();
  if (!raw) return null;
  raw = raw.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(raw)) {
    const host = raw.split("/")[0].split(":")[0].toLowerCase();
    const isLocal =
      LOOPBACK_HOSTS.has(host) || host.endsWith(".local");
    raw = `${isLocal ? "http" : "https"}://${raw}`;
  }
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}${u.pathname === "/" ? "" : u.pathname}`.replace(
      /\/+$/,
      ""
    );
  } catch {
    return null;
  }
}

function getBackendBase(): string | null {
  const raw = process.env.BACKEND_URL?.trim();
  if (raw) return normalizeBackendBase(raw);
  if (process.env.NODE_ENV === "development") {
    return normalizeBackendBase(DEFAULT_DEV_BACKEND);
  }
  return null;
}

function isSelfProxy(req: NextRequest, backendBase: string): boolean {
  try {
    const target = new URL(backendBase);
    const self = req.nextUrl;
    const sameHost =
      target.hostname === self.hostname ||
      (LOOPBACK_HOSTS.has(target.hostname) &&
        LOOPBACK_HOSTS.has(self.hostname));
    const targetPort = target.port || (target.protocol === "https:" ? "443" : "80");
    const selfPort = self.port || (self.protocol === "https:" ? "443" : "80");
    return sameHost && targetPort === selfPort;
  } catch {
    return false;
  }
}

function logBffProxy(
  payload: Record<string, unknown>,
  level: "info" | "error" = "info"
) {
  const line = JSON.stringify({ source: "bff_proxy", ...payload });
  if (level === "error") {
    console.error(line);
  } else {
    console.info(line);
  }
}

function applyUpstreamHeaders(res: NextResponse, upstream: Response) {
  const h = upstream.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = h.getSetCookie?.();
  if (setCookies?.length) {
    for (const c of setCookies) {
      res.headers.append("set-cookie", c);
    }
  }
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "set-cookie") return;
    if (HOP_BY_HOP.has(lower)) return;
    if (STRIPPED_RESPONSE_HEADERS.has(lower)) return;
    res.headers.set(key, value);
  });
}

async function proxy(
  req: NextRequest,
  pathSegments: string[]
): Promise<Response> {
  const method = req.method;
  const bffPath = pathSegments.join("/");
  const hasSearch = req.nextUrl.search.length > 0;
  const started = performance.now();

  const base = getBackendBase();
  if (!base) {
    logBffProxy(
      {
        method,
        bff_path: bffPath,
        has_query: hasSearch,
        upstream_status: null,
        latency_ms: Math.round(performance.now() - started),
        error_message:
          "BACKEND_URL is missing or invalid. See .env.example for BACKEND_URL.",
      },
      "error"
    );
    return NextResponse.json(
      {
        message:
          "BACKEND_URL is missing or invalid. Set BACKEND_URL to a fully-qualified origin (e.g. https://api.example.com or http://127.0.0.1:3001).",
      },
      { status: 503 }
    );
  }

  if (isSelfProxy(req, base)) {
    logBffProxy(
      {
        method,
        bff_path: bffPath,
        has_query: hasSearch,
        upstream_status: null,
        latency_ms: Math.round(performance.now() - started),
        error_message: `Refusing to self-proxy: BACKEND_URL (${base}) points at this Next app`,
      },
      "error"
    );
    return NextResponse.json(
      {
        message:
          "BACKEND_URL points at this Next.js app itself, which would cause an infinite proxy loop. Set BACKEND_URL to your upstream API origin.",
      },
      { status: 502 }
    );
  }

  const path = pathSegments.join("/");
  const target = `${base}/api/${path}${req.nextUrl.search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body: hasBody ? body : undefined,
      redirect: "manual",
    });
  } catch (err) {
    const latency_ms = Math.round(performance.now() - started);
    const message = err instanceof Error ? err.message : String(err);
    logBffProxy(
      {
        method,
        bff_path: bffPath,
        has_query: hasSearch,
        upstream_status: null,
        latency_ms,
        error_message: message,
      },
      "error"
    );
    captureException(err instanceof Error ? err : new Error(message), {
      tags: { bff: "true", bff_error: "network" },
      extra: { bff_path: bffPath, method },
    });
    return NextResponse.json(
      { message: "Upstream request failed" },
      { status: 502 }
    );
  }

  const latency_ms = Math.round(performance.now() - started);
  logBffProxy({
    method,
    bff_path: bffPath,
    has_query: hasSearch,
    upstream_status: upstream.status,
    latency_ms,
  });

  if (upstream.status >= 500) {
    captureMessage(`BFF upstream ${upstream.status}`, {
      level: "error",
      tags: {
        bff: "true",
        upstream_status: String(upstream.status),
      },
      extra: { bff_path: bffPath, method },
    });
  }

  const res = new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
  });
  applyUpstreamHeaders(res, upstream);
  return res;
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
