import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // voyageai has broken ESM imports and optional deps — keep it external
  // voyageai and pdf-parse have broken ESM/CJS interop — keep external.
  // pdfjs-dist is ESM-only and must be bundled (cannot be externalized via require).
  serverExternalPackages: ["voyageai", "pdf-parse"],
};

export default nextConfig;
