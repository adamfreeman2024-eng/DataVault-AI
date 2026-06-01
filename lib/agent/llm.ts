import type OpenAI from "openai";

import { createDeepSeekClient, getDeepSeekModelId } from "@/lib/ai/deepseek";
import { createOpenAIClient, getOpenAIModelId } from "@/lib/ai/openai";
import { DATAVAULT_SYSTEM_PROMPT } from "@/lib/agent/system-prompt";
import type { AgentChatMessage } from "@/types/agent-api";

type LlmClient = {
  client: OpenAI;
  model: string;
  provider: "openai" | "deepseek";
};

/**
 * Prefers OpenAI when configured; otherwise DeepSeek (OpenAI-compatible API).
 */
export function resolveLlmClient(): LlmClient {
  const openai = createOpenAIClient();
  if (openai) {
    return {
      client: openai,
      model: getOpenAIModelId(),
      provider: "openai",
    };
  }

  const deepseek = createDeepSeekClient();
  if (deepseek) {
    return {
      client: deepseek,
      model: getDeepSeekModelId(),
      provider: "deepseek",
    };
  }

  throw new Error(
    "No AI provider configured. Set OPENAI_API_KEY or DEEPSEEK_API_KEY in .env.local",
  );
}

/**
 * Runs a single chat completion with the enforced DataVault system prompt.
 */
export async function generateAgentReply(
  messages: AgentChatMessage[],
  extraSystemContext = "",
): Promise<string> {
  const { client, model } = resolveLlmClient();

  const systemContent = extraSystemContext
    ? `${DATAVAULT_SYSTEM_PROMPT}\n\n${extraSystemContext}`
    : DATAVAULT_SYSTEM_PROMPT;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemContent },
      ...messages.map((message) => ({
        role: message.role as "user" | "assistant" | "system",
        content: message.content,
      })),
    ],
    temperature: 0.6,
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("The AI provider returned an empty response.");
  }

  return content;
}
