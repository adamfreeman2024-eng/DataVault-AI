import { generateText, stepCountIs, type ToolSet } from "ai";

import { createDeepSeekLanguageModel } from "@/lib/ai/deepseek-provider";
import {
  createGeneratePremiumImageTool,
  GENERATE_PREMIUM_IMAGE_TOOL_NAME,
} from "@/lib/agent/tools/generate-premium-image";
import { DATAVAULT_SYSTEM_PROMPT } from "@/lib/agent/system-prompt";
import type { AgentChatMessage } from "@/types/agent-api";

export type AgentRunResult = {
  content: string;
  imageUrl?: string;
};

function buildSystemPrompt(extraContext: string): string {
  if (!extraContext.trim()) return DATAVAULT_SYSTEM_PROMPT;
  return `${DATAVAULT_SYSTEM_PROMPT}\n\n${extraContext}`;
}

function toModelMessages(messages: AgentChatMessage[]) {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));
}

function extractImageUrlFromToolResults(
  toolResults: Array<{ toolName: string; output: unknown }>,
): string | undefined {
  for (const result of toolResults) {
    if (result.toolName !== GENERATE_PREMIUM_IMAGE_TOOL_NAME) continue;
    const output = result.output as { imageUrl?: string } | null;
    if (output?.imageUrl) return output.imageUrl;
  }
  return undefined;
}

/**
 * Hybrid agent: DeepSeek for reasoning + optional gated DALL·E tool after x402.
 */
export async function runDataVaultAgent(
  messages: AgentChatMessage[],
  options: {
    paymentVerified: boolean;
    extraSystemContext?: string;
    abortSignal?: AbortSignal;
  },
): Promise<AgentRunResult> {
  const model = createDeepSeekLanguageModel();

  const tools: ToolSet | undefined = options.paymentVerified
    ? { [GENERATE_PREMIUM_IMAGE_TOOL_NAME]: createGeneratePremiumImageTool() }
    : undefined;

  const generateOptions: Parameters<typeof generateText>[0] = {
    model,
    system: buildSystemPrompt(options.extraSystemContext ?? ""),
    messages: toModelMessages(messages),
    stopWhen: stepCountIs(5),
  };

  if (tools) {
    generateOptions.tools = tools;
  }

  if (options.abortSignal) {
    generateOptions.abortSignal = options.abortSignal;
  }

  const result = await generateText(generateOptions);

  const imageUrl = extractImageUrlFromToolResults(
    result.toolResults.map((tr) => ({
      toolName: tr.toolName,
      output: tr.output,
    })),
  );

  const text = result.text.trim();
  if (!text && !imageUrl) {
    throw new Error("The agent returned an empty response.");
  }

  return {
    content:
      text ||
      "Your premium image has been generated and is shown below.",
    ...(imageUrl ? { imageUrl } : {}),
  };
}
