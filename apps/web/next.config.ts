import type { NextConfig } from "next";

function hostnameFromEnvUrl(url: string | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).hostname || null;
  } catch {
    return null;
  }
}

const apiOrigin = process.env.API_ORIGIN?.replace(/\/+$/, "") ?? "";

const assetHostnames = [
  hostnameFromEnvUrl(process.env.BACKEND_URL),
  hostnameFromEnvUrl(process.env.API_ORIGIN),
  hostnameFromEnvUrl(process.env.NEXT_PUBLIC_API_URL),
  hostnameFromEnvUrl(process.env.S3_PUBLIC_URL),
  hostnameFromEnvUrl(process.env.NEXT_PUBLIC_S3_PUBLIC_URL),
].filter((h): h is string => Boolean(h));

const uniqueAssetHosts = [...new Set(assetHostnames)];

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    webpackMemoryOptimizations: true,
    optimizePackageImports: [
      "lucide-react",
      "react-icons",
      "date-fns",
      "recharts",
      "framer-motion",
      "@uppy/core",
      "@uppy/dashboard",
      "@uppy/aws-s3",
      "@uppy/react",
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "maps.googleapis.com" },
      { protocol: "https", hostname: "maps.gstatic.com" },
      ...uniqueAssetHosts.flatMap((hostname) => [
        {
          protocol: "https" as const,
          hostname,
        },
        {
          protocol: "http" as const,
          hostname,
        },
      ]),
    ],
  },
  async rewrites() {
    if (!apiOrigin) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
