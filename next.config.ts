import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // voyageai has broken ESM imports and optional deps — keep it external
  serverExternalPackages: ["voyageai"],
};

export default nextConfig;
