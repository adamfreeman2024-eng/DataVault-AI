import OpenAI from "openai";

import { getDeepSeekConfig } from "@/lib/env";

/**
 * DeepSeek exposes an OpenAI-compatible API.
 * Server-side only — returns null when DEEPSEEK_API_KEY is unset.
 */
export function createDeepSeekClient(): OpenAI | null {
  const config = getDeepSeekConfig();
  if (!config) return null;

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
}

export function getDeepSeekModelId(): string {
  return getDeepSeekConfig()?.model ?? "deepseek-chat";
}
