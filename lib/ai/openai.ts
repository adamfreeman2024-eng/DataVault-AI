import OpenAI from "openai";

import { getOpenAIConfig } from "@/lib/env";

/**
 * Server-side OpenAI client. Returns null when OPENAI_API_KEY is unset.
 */
export function createOpenAIClient(): OpenAI | null {
  const config = getOpenAIConfig();
  if (!config) return null;

  return new OpenAI({
    apiKey: config.apiKey,
  });
}

export function getOpenAIModelId(): string {
  return getOpenAIConfig()?.model ?? "gpt-4o-mini";
}
