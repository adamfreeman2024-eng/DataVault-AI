/** OpenAI Images API — gpt-image-2 */
const OPENAI_IMAGES_GENERATIONS_URL =
  "https://api.openai.com/v1/images/generations";

const OPENAI_IMAGE_MODEL = "gpt-image-2" as const;

type OpenAIImageResponse = {
  data?: Array<{ url?: string; revised_prompt?: string }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
    param?: string | null;
  };
};

export type OpenAIImageToolResult =
  | { ok: true; realUrl: string }
  | { ok: false; error: string };

function formatImageError(message: string): string {
  return `Error generating image: ${message}`;
}

/**
 * Awaits OpenAI image generation. Never throws — returns an error string on failure
 * so the LLM can respond gracefully without crashing the agent route.
 */
export async function executeOpenAIImageGeneration(
  prompt: string,
): Promise<OpenAIImageToolResult> {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      console.error(
        "[generate_premium_image] OPENAI_API_KEY is missing or empty in environment.",
      );
      return {
        ok: false,
        error: formatImageError(
          "OPENAI_API_KEY is not configured on the server.",
        ),
      };
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
      const message =
        networkError instanceof Error
          ? networkError.message
          : "Network request failed";
      console.error(
        "[generate_premium_image] OpenAI fetch failed (network):",
        networkError,
      );
      return { ok: false, error: formatImageError(message) };
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
      return {
        ok: false,
        error: formatImageError("OpenAI returned invalid JSON."),
      };
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
        `HTTP ${response.status} ${response.statusText}`;

      return { ok: false, error: formatImageError(message) };
    }

    const realUrl = data.data?.[0]?.url;

    if (!realUrl) {
      console.error(
        "[generate_premium_image] OpenAI success response missing data[0].url:",
        { status: response.status, data },
      );
      return {
        ok: false,
        error: formatImageError("OpenAI did not return data[0].url."),
      };
    }

    console.info("[generate_premium_image] OpenAI returned realUrl:", realUrl);

    return { ok: true, realUrl };
  } catch (unexpected) {
    console.error(
      "[generate_premium_image] Unexpected error in image generation:",
      unexpected,
    );
    const message =
      unexpected instanceof Error
        ? unexpected.message
        : "Unexpected failure during image generation";
    return { ok: false, error: formatImageError(message) };
  }
}
