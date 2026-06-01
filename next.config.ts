import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["hashconnect"],
  serverExternalPackages: ["@hiero-ledger/sdk", "hedera-agent-kit"],
};

export default nextConfig;
