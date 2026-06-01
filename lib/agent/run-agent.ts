import { generateText, stepCountIs, type ToolSet } from "ai";

import { createDeepSeekLanguageModel } from "@/lib/ai/deepseek-provider";
import {
  createGeneratePremiumImageTool,
  GENERATE_PREMIUM_IMAGE_TOOL_NAME,
} from "@/lib/agent/tools/generate-premium-image";
import {
  DATAVAULT_SYSTEM_PROMPT,
  IMAGE_TOOL_EXECUTION_RULES,
} from "@/lib/agent/system-prompt";
import { userRequestsImageGeneration } from "@/lib/agent/premium";
import type { AgentChatMessage } from "@/types/agent-api";

export type AgentRunResult = {
  content: string;
  imageUrl?: string;
};

const MARKDOWN_IMAGE_REGEX = /!\[[^\]]*\]\([^)]+\)/g;

type ToolOutputWithUrl = {
  realUrl?: string;
  imageUrl?: string;
};

function buildSystemPrompt(extraContext: string, toolsEnabled: boolean): string {
  const parts = [DATAVAULT_SYSTEM_PROMPT];

  if (toolsEnabled) {
    parts.push(IMAGE_TOOL_EXECUTION_RULES);
  }

  if (extraContext.trim()) {
    parts.push(extraContext);
  }

  return parts.join("\n\n");
}

function toModelMessages(messages: AgentChatMessage[]) {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));
}

function extractRealUrlFromToolOutput(output: unknown): string | undefined {
  if (!output || typeof output !== "object") return undefined;
  const record = output as ToolOutputWithUrl;
  return record.realUrl ?? record.imageUrl;
}

/**
 * Collects realUrl from every step — not only the last step's toolResults.
 */
function extractRealUrlFromAllSteps(result: {
  steps: Array<{
    toolResults: Array<{ toolName: string; output: unknown }>;
  }>;
  toolResults: Array<{ toolName: string; output: unknown }>;
}): string | undefined {
  for (const step of result.steps) {
    for (const toolResult of step.toolResults) {
      if (toolResult.toolName !== GENERATE_PREMIUM_IMAGE_TOOL_NAME) continue;
      const realUrl = extractRealUrlFromToolOutput(toolResult.output);
      if (realUrl) return realUrl;
    }
  }

  for (const toolResult of result.toolResults) {
    if (toolResult.toolName !== GENERATE_PREMIUM_IMAGE_TOOL_NAME) continue;
    const realUrl = extractRealUrlFromToolOutput(toolResult.output);
    if (realUrl) return realUrl;
  }

  return undefined;
}

/**
 * Strips hallucinated markdown images and injects the verified OpenAI URL.
 */
function buildFinalContent(modelText: string, realUrl: string): string {
  const stripped = modelText.replace(MARKDOWN_IMAGE_REGEX, "").trim();
  const imageMarkdown = `![Generated image](${realUrl})`;

  if (stripped) {
    return `${stripped}\n\n${imageMarkdown}`;
  }

  return `Your premium image is ready.\n\n${imageMarkdown}`;
}

/**
 * Hybrid agent: DeepSeek for reasoning + optional gated image tool after x402.
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
  const toolsEnabled = options.paymentVerified;
  const wantsImage = userRequestsImageGeneration(messages);

  const tools: ToolSet | undefined = toolsEnabled
    ? { [GENERATE_PREMIUM_IMAGE_TOOL_NAME]: createGeneratePremiumImageTool() }
    : undefined;

  const generateOptions: Parameters<typeof generateText>[0] = {
    model,
    system: buildSystemPrompt(options.extraSystemContext ?? "", toolsEnabled),
    messages: toModelMessages(messages),
    /**
     * Step 1: model calls generate_premium_image (async execute awaits OpenAI).
     * Step 2: model writes final answer using tool result realUrl.
     */
    stopWhen: tools ? stepCountIs(2) : stepCountIs(1),
  };

  if (tools) {
    generateOptions.tools = tools;

    if (wantsImage) {
      generateOptions.toolChoice = {
        type: "tool",
        toolName: GENERATE_PREMIUM_IMAGE_TOOL_NAME,
      };
    }
  }

  if (options.abortSignal) {
    generateOptions.abortSignal = options.abortSignal;
  }

  const result = await generateText(generateOptions);

  const realUrl = extractRealUrlFromAllSteps(result);

  if (realUrl) {
    const content = buildFinalContent(result.text.trim(), realUrl);
    return {
      content,
      imageUrl: realUrl,
    };
  }

  const text = result.text.trim();
  if (!text) {
    throw new Error("The agent returned an empty response.");
  }

  return { content: text };
}
