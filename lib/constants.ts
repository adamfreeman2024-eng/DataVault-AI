export const APP_NAME = "DataVault AI";

export const HEDERA_NETWORKS = ["testnet", "mainnet", "previewnet"] as const;
export type HederaNetwork = (typeof HEDERA_NETWORKS)[number];

export const DEFAULT_HEDERA_NETWORK: HederaNetwork = "testnet";

export const API_ROUTES = {
  agent: "/api/agent",
} as const;

/** x402 micropayment price for premium agent actions (HBAR). */
export const X402_PREMIUM_HBAR_AMOUNT = 10;

export const X402_CURRENCY = "HBAR" as const;
