import { DEFAULT_HEDERA_NETWORK, type HederaNetwork } from "@/lib/constants";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  return process.env[name];
}

/** Server-only Hedera operator credentials */
export function getHederaOperatorConfig() {
  return {
    accountId: requireEnv("HEDERA_ACCOUNT_ID"),
    privateKey: requireEnv("HEDERA_PRIVATE_KEY"),
    network: (optionalEnv("HEDERA_NETWORK") ??
      DEFAULT_HEDERA_NETWORK) as HederaNetwork,
  };
}

export function getOpenAIConfig() {
  const apiKey = optionalEnv("OPENAI_API_KEY");
  if (!apiKey) return null;
  return {
    apiKey,
    model: optionalEnv("OPENAI_MODEL") ?? "gpt-4o-mini",
  };
}

export function getDeepSeekConfig() {
  const apiKey = optionalEnv("DEEPSEEK_API_KEY");
  if (!apiKey) return null;
  return {
    apiKey,
    model: optionalEnv("DEEPSEEK_MODEL") ?? "deepseek-chat",
    baseURL: "https://api.deepseek.com",
  };
}
