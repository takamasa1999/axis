import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AWS ECS 上でコンテナ実行するため、依存を同梱した最小構成で出力する（research R2）
  output: "standalone",
  typedRoutes: true,
  // 001 の URL から 002 の URL への転送（plan.md「001 からの移行」）
  async redirects() {
    return [
      { source: "/home", destination: "/axis", permanent: false },
      { source: "/sharing", destination: "/axis/sharing", permanent: false },
      { source: "/milestones/:path*", destination: "/axis/milestones/:path*", permanent: false },
      { source: "/agency/login", destination: "/login", permanent: false },
      { source: "/agency/security", destination: "/login", permanent: false },
    ];
  },
};

export default nextConfig;
