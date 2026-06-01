import { tool } from "ai";
import { z } from "zod";

import { executeOpenAIImageGeneration } from "@/lib/ai/dalle";

export const GENERATE_PREMIUM_IMAGE_TOOL_NAME = "generate_premium_image";

/**
 * Premium image tool — only registered after x402 payment is verified.
 * The execute handler MUST complete before the model's final reply (see run-agent stopWhen).
 */
export function createGeneratePremiumImageTool() {
  return tool({
    description:
      "Generate a premium image via OpenAI. Call this when the user explicitly asks for an image. Returns a `realUrl` field — you MUST use that exact URL in your final message and MUST NOT invent or recall any other image URL.",
    inputSchema: z.object({
      prompt: z
        .string()
        .min(8)
        .max(4000)
        .describe(
          "Detailed visual description for image generation (style, subject, composition).",
        ),
    }),
    execute: async ({ prompt }) => {
      const { realUrl } = await executeOpenAIImageGeneration(prompt);

      return {
        realUrl,
        prompt,
      };
    },
  });
}
