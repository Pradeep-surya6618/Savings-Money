import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Allow the dev server to accept requests from this LAN IP (e.g. testing on a phone).
  allowedDevOrigins: ["192.168.1.20"],
};

export default nextConfig;
