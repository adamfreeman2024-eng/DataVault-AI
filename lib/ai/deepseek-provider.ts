import { createOpenAI } from "@ai-sdk/openai";

import { getDeepSeekConfig } from "@/lib/env";

/**
 * DeepSeek via OpenAI-compatible API — primary LLM for chat and tool routing.
 */
export function createDeepSeekLanguageModel() {
  const config = getDeepSeekConfig();
  if (!config) {
    throw new Error(
      "DEEPSEEK_API_KEY is required. Set it in .env.local for agent chat.",
    );
  }

  const provider = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    name: "deepseek",
  });

  return provider.chat(config.model);
}
