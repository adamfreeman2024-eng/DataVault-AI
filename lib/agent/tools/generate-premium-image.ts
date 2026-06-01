import { tool } from "ai";
import { z } from "zod";

import { executeOpenAIImageGeneration } from "@/lib/ai/dalle";

export const GENERATE_PREMIUM_IMAGE_TOOL_NAME = "generate_premium_image";

/**
 * Premium image tool — only registered after x402 payment is verified.
 * execute() never throws; failures return an error string for the LLM.
 */
export function createGeneratePremiumImageTool() {
  return tool({
    description:
      "Generate a premium image via OpenAI (gpt-image-2). Call when the user explicitly asks for an image. On success returns `{ realUrl }` (https URL or data: URI from base64) — use ONLY that string in Markdown. On failure returns an error string starting with 'Error generating image:' — relay that to the user; do not invent URLs.",
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
      console.log("1. Tool called: generate_premium_image started");

      try {
        const result = await executeOpenAIImageGeneration(prompt);

        if (!result.ok) {
          return result.error;
        }

        return {
          realUrl: result.realUrl,
          prompt,
        };
      } catch (err) {
        console.error("TOOL CATCH ERROR:", err);
        const message =
          err instanceof Error ? err.message : "Unknown tool failure";
        return `Error generating image: ${message}`;
      }
    },
  });
}
