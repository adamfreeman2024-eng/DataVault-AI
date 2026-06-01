export const APP_NAME = "DataVault AI";

export const HEDERA_NETWORKS = ["testnet", "mainnet", "previewnet"] as const;
export type HederaNetwork = (typeof HEDERA_NETWORKS)[number];

export const DEFAULT_HEDERA_NETWORK: HederaNetwork = "testnet";

export const API_ROUTES = {
  agent: "/api/agent",
} as const;
