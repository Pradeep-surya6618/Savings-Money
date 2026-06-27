import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Allow the dev server to accept requests from this LAN IP (e.g. testing on a phone).
  allowedDevOrigins: ["192.168.1.28", "10.174.53.148", "172.17.56.148"],
  experimental: {
    // Avatar uploads go through a Server Action; the default body limit is 1MB, so raise
    // it above the 3MB avatar cap (+ multipart overhead) or 1–3MB uploads would fail.
    serverActions: { bodySizeLimit: "4mb" },
    // Client router cache: reuse a navigated page's RSC payload for a short window so
    // re-visiting a page (e.g. Home ↔ Transactions) is instant instead of re-fetching.
    // router.refresh() after mutations still updates the data.
    staleTimes: { dynamic: 30, static: 180 },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
