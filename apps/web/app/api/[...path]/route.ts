import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

const FORWARD_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "cookie",
  "user-agent",
  "x-device-id",
] as const;

const DEFAULT_DEV_BACKEND =
  "https://snoq-soup-demo-ipsjhyprt-dsundarpauls-projects.vercel.app";

function getBackendBase(): string | null {
  const raw = process.env.BACKEND_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "development") {
    return DEFAULT_DEV_BACKEND;
  }
  return null;
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
    res.headers.set(key, value);
  });
}

async function proxy(
  req: NextRequest,
  pathSegments: string[]
): Promise<Response> {
  const base = getBackendBase();
  if (!base) {
    return NextResponse.json(
      {
        message:
          "BACKEND_URL is not set. Add it to your environment (e.g. BACKEND_URL=https://your-api-origin) for production.",
      },
      { status: 503 }
    );
  }

  const path = pathSegments.join("/");
  const target = `${base}/api/${path}${req.nextUrl.search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  const method = req.method;
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const upstream = await fetch(target, {
    method,
    headers,
    body: hasBody ? body : undefined,
    redirect: "manual",
  });

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
