import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  // Embedded PostgreSQL ships WebAssembly and data files that must stay on disk next to the package
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingIncludes: { "/api/**": ["./node_modules/@electric-sql/pglite/dist/**"] },
};

export default nextConfig;
