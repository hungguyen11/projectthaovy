import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Dự án không bundle ESLint; dùng `npm run typecheck` để kiểm tra code.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
