import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AWS ECS 上でコンテナ実行するため、依存を同梱した最小構成で出力する（research R2）
  output: "standalone",
  typedRoutes: true,
};

export default nextConfig;
