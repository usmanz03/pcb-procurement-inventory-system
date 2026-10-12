import type { NextConfig } from "next";

// Static export so the POC can be hosted on GitHub Pages (or any static host).
// NEXT_PUBLIC_BASE_PATH is set by the Pages workflow to the repository sub-path.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
