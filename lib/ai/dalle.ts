/** OpenAI Images API — DALL·E 3 only (no other model). */
const OPENAI_IMAGES_GENERATIONS_URL =
  "https://api.openai.com/v1/images/generations";

const DALLE_MODEL = "dall-e-3" as const;

type DalleResponse = {
  data?: Array<{ url?: string; revised_prompt?: string }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
    param?: string | null;
  };
};

/**
 * Calls OpenAI Images API (DALL·E 3) directly — used only after x402 verification.
 * Authorization: `process.env.OPENAI_API_KEY` (server-side only).
 */
export async function generateDalle3ImageUrl(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    console.error(
      "[generate_premium_image] OPENAI_API_KEY is missing or empty in environment.",
    );
    throw new Error(
      "OPENAI_API_KEY is required for premium image generation (DALL·E 3).",
    );
  }

  const requestBody = {
    model: DALLE_MODEL,
    prompt: prompt.trim(),
    n: 1,
    size: "1024x1024",
    quality: "standard",
  };

  let response: Response;

  try {
    response = await fetch(OPENAI_IMAGES_GENERATIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (networkError) {
    console.error(
      "[generate_premium_image] OpenAI fetch failed (network):",
      networkError,
    );
    throw new Error(
      networkError instanceof Error
        ? `OpenAI image request failed: ${networkError.message}`
        : "OpenAI image request failed due to a network error.",
    );
  }

  const rawBody = await response.text();

  let body: DalleResponse;
  try {
    body = rawBody ? (JSON.parse(rawBody) as DalleResponse) : {};
  } catch (parseError) {
    console.error("[generate_premium_image] OpenAI response parse error:", {
      parseError,
      status: response.status,
      statusText: response.statusText,
      url: OPENAI_IMAGES_GENERATIONS_URL,
      model: DALLE_MODEL,
      rawBodyPreview: rawBody.slice(0, 1000),
    });
    throw new Error("OpenAI image API returned an invalid JSON response.");
  }

  if (!response.ok) {
    console.error("[generate_premium_image] OpenAI API error response:", {
      status: response.status,
      statusText: response.statusText,
      url: OPENAI_IMAGES_GENERATIONS_URL,
      model: DALLE_MODEL,
      error: body.error,
      errorMessage: body.error?.message,
      errorType: body.error?.type,
      errorCode: body.error?.code,
      fullBody: body,
    });

    const message =
      body.error?.message ??
      `OpenAI image API failed with status ${response.status} (${response.statusText})`;

    throw new Error(message);
  }

  const imageUrl = body.data?.[0]?.url;

  if (!imageUrl) {
    console.error(
      "[generate_premium_image] OpenAI success response missing image URL:",
      { status: response.status, body },
    );
    throw new Error("OpenAI did not return an image URL.");
  }

  return imageUrl;
}
