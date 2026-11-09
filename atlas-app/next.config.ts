import path from "node:path";
import type { NextConfig } from "next";

// Fixa a raiz do projeto em atlas-app/ (existe outro package-lock.json na
// raiz do repositório, que confundia a detecção automática do Next.js).
const raiz = path.resolve(__dirname);

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: raiz,
  turbopack: {
    root: raiz,
  },
};

export default nextConfig;
