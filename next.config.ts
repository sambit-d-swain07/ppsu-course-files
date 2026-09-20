import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js/esbuild from bundling these packages — they rely on
  // file paths that must stay intact on disk (e.g. the Chromium binary).
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default nextConfig;
