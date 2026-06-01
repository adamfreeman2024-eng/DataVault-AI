import { tool } from "ai";
import { z } from "zod";

import { executeOpenAIImageGeneration } from "@/lib/ai/dalle";

export const GENERATE_PREMIUM_IMAGE_TOOL_NAME = "generate_premium_image";

/** Set true to skip OpenAI and return a test Unsplash image. */
export const IS_MOCK_MODE = false;

const MOCK_IMAGE_MARKDOWN =
  "![Test Space Vault](https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?q=80&w=1000)";

/**
 * Sample gpt-image-2 success body (logged in mock mode; no API spend).
 */
function buildMockOpenAIJsonResponse(prompt: string) {
  return {
    created: Math.floor(Date.now() / 1000),
    data: [
      {
        b64_json: "<omitted — real API returns base64 PNG bytes here>",
        revised_prompt: prompt.trim(),
      },
    ],
    output_format: "png",
    quality: "high",
  };
}

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
      console.log("1. Tool called: generate_premium_image started", {
        mockMode: IS_MOCK_MODE,
      });

      try {
        if (IS_MOCK_MODE) {
          const mockJson = buildMockOpenAIJsonResponse(prompt);
          console.log(
            "[generate_premium_image] MOCK_MODE — skipping OpenAI API. Sample JSON response:",
            JSON.stringify(mockJson, null, 2),
          );
          console.log(
            "[generate_premium_image] MOCK_MODE — returning test markdown:",
            MOCK_IMAGE_MARKDOWN,
          );
          return MOCK_IMAGE_MARKDOWN;
        }

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
