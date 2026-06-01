/** OpenAI Images API — gpt-image-1.5 */
const OPENAI_IMAGES_GENERATIONS_URL =
  "https://api.openai.com/v1/images/generations";

const OPENAI_IMAGE_MODEL = "gpt-image-1.5" as const;

type OpenAIImageResponse = {
  data?: Array<{ url?: string; revised_prompt?: string }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
    param?: string | null;
  };
};

export type OpenAIImageExecutionResult = {
  realUrl: string;
};

/**
 * Awaits OpenAI image generation and returns the live URL from `data[0].url`.
 * Server-side only — uses `process.env.OPENAI_API_KEY`.
 */
export async function executeOpenAIImageGeneration(
  prompt: string,
): Promise<OpenAIImageExecutionResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    console.error(
      "[generate_premium_image] OPENAI_API_KEY is missing or empty in environment.",
    );
    throw new Error(
      "OPENAI_API_KEY is required for premium image generation.",
    );
  }

  const payload = {
    model: OPENAI_IMAGE_MODEL,
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
      body: JSON.stringify(payload),
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

  let data: OpenAIImageResponse;
  try {
    data = rawBody ? (JSON.parse(rawBody) as OpenAIImageResponse) : {};
  } catch (parseError) {
    console.error("[generate_premium_image] OpenAI response parse error:", {
      parseError,
      status: response.status,
      statusText: response.statusText,
      url: OPENAI_IMAGES_GENERATIONS_URL,
      model: OPENAI_IMAGE_MODEL,
      rawBodyPreview: rawBody.slice(0, 1000),
    });
    throw new Error("OpenAI image API returned an invalid JSON response.");
  }

  if (!response.ok) {
    console.error("[generate_premium_image] OpenAI API error response:", {
      status: response.status,
      statusText: response.statusText,
      url: OPENAI_IMAGES_GENERATIONS_URL,
      model: OPENAI_IMAGE_MODEL,
      error: data.error,
      errorMessage: data.error?.message,
      fullBody: data,
    });

    const message =
      data.error?.message ??
      `OpenAI image API failed with status ${response.status} (${response.statusText})`;

    throw new Error(message);
  }

  const realUrl = data.data?.[0]?.url;

  if (!realUrl) {
    console.error(
      "[generate_premium_image] OpenAI success response missing data[0].url:",
      { status: response.status, data },
    );
    throw new Error("OpenAI did not return data[0].url.");
  }

  console.info("[generate_premium_image] OpenAI returned realUrl:", realUrl);

  return { realUrl };
}

/** @deprecated Use executeOpenAIImageGeneration */
export async function generateDalle3ImageUrl(prompt: string): Promise<string> {
  const { realUrl } = await executeOpenAIImageGeneration(prompt);
  return realUrl;
}
