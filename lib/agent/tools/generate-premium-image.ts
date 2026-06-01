import { tool } from "ai";
import { z } from "zod";

import { generateDalle3ImageUrl } from "@/lib/ai/dalle";

export const GENERATE_PREMIUM_IMAGE_TOOL_NAME = "generate_premium_image";

/**
 * Premium image tool — only registered with the model after x402 payment is verified.
 * Execution uses OpenAI DALL·E 3 (OPENAI_API_KEY), not DeepSeek.
 */
export function createGeneratePremiumImageTool() {
  return tool({
    description:
      "Generate a premium image from a text prompt using DALL·E 3. Use ONLY when the user explicitly requests image generation. Requires verified 10 HBAR payment.",
    inputSchema: z.object({
      prompt: z
        .string()
        .min(8)
        .max(4000)
        .describe(
          "Detailed visual description for DALL·E 3 (style, subject, composition).",
        ),
    }),
    execute: async ({ prompt }) => {
      const imageUrl = await generateDalle3ImageUrl(prompt);
      return {
        imageUrl,
        prompt,
      };
    },
  });
}
