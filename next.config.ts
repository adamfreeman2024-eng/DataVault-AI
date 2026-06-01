import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hashgraph/hedera-wallet-connect"],
  serverExternalPackages: ["@hiero-ledger/sdk", "hedera-agent-kit"],
};

export default nextConfig;
