import { getOpenAIConfig } from "@/lib/env";

type DalleResponse = {
  data?: Array<{ url?: string }>;
  error?: { message?: string };
};

/**
 * Calls OpenAI Images API (DALL·E 3) directly — used only after x402 verification.
 */
export async function generateDalle3ImageUrl(prompt: string): Promise<string> {
  const config = getOpenAIConfig();
  if (!config?.apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required for premium image generation (DALL·E 3).",
    );
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt.trim(),
      n: 1,
      size: "1024x1024",
      quality: "standard",
    }),
  });

  let body: DalleResponse;
  try {
    body = (await response.json()) as DalleResponse;
  } catch {
    throw new Error("OpenAI image API returned an invalid response.");
  }

  if (!response.ok) {
    const message =
      body.error?.message ??
      `OpenAI image API failed with status ${response.status}`;
    throw new Error(message);
  }

  const imageUrl = body.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error("OpenAI did not return an image URL.");
  }

  return imageUrl;
}
