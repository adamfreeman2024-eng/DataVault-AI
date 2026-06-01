/** OpenAI Images API — gpt-image-2 (quality: low | medium | high | auto) */
const OPENAI_IMAGES_GENERATIONS_URL =
  "https://api.openai.com/v1/images/generations";

const OPENAI_IMAGE_MODEL = "gpt-image-2" as const;

type OpenAIImageItem = {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
  image_url?: string;
};

/** gpt-image-2 success body: `{ created, data: [...], output_format, quality }` */
type OpenAIImageResponse = {
  created?: number;
  data?: OpenAIImageItem[] | { data?: OpenAIImageItem[] };
  output_format?: string;
  quality?: string;
  error?: {
    message?: string;
    type?: string;
    code?: string;
    param?: string | null;
  };
};

function getImageItemsFromResponse(
  responseObj: OpenAIImageResponse,
): OpenAIImageItem[] | undefined {
  const root = responseObj.data;

  if (Array.isArray(root)) {
    return root;
  }

  if (root && typeof root === "object" && Array.isArray(root.data)) {
    return root.data;
  }

  return undefined;
}

function mimeFromOutputFormat(format?: string): string {
  switch (format?.toLowerCase()) {
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "image/png";
  }
}

function b64ToDataUrl(b64: string, mime: string): string {
  const trimmed = b64.trim();
  if (trimmed.startsWith("data:")) {
    return trimmed;
  }
  return `data:${mime};base64,${trimmed}`;
}

/**
 * gpt-image-2 returns base64 in `data[0].b64_json` (no hosted URL).
 * Also supports DALL·E-style `url` and axios-like `{ data: { data: [...] } }`.
 */
function extractImageUrlFromResponse(
  responseObj: OpenAIImageResponse,
): string | undefined {
  const first = getImageItemsFromResponse(responseObj)?.[0];
  if (!first) {
    return undefined;
  }

  if (typeof first.url === "string" && first.url.length > 0) {
    return first.url;
  }

  const altUrl = first.image_url;
  if (typeof altUrl === "string" && altUrl.length > 0) {
    return altUrl;
  }

  if (typeof first.b64_json === "string" && first.b64_json.length > 0) {
    return b64ToDataUrl(
      first.b64_json,
      mimeFromOutputFormat(responseObj.output_format),
    );
  }

  return undefined;
}

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
      quality: "high",
    };

    let response: Response;

    try {
      console.log("2. Sending fetch request to OpenAI (gpt-image-2)...");

      response = await fetch(OPENAI_IMAGES_GENERATIONS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("3. Received response from OpenAI, status:", response.status);
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

    const realUrl = extractImageUrlFromResponse(data);

    if (!realUrl) {
      const firstItem = getImageItemsFromResponse(data)?.[0];
      console.error(
        "[generate_premium_image] OpenAI success response missing image url or b64_json:",
        {
          status: response.status,
          output_format: data.output_format,
          firstItemKeys:
            firstItem && typeof firstItem === "object"
              ? Object.keys(firstItem)
              : [],
        },
      );
      return {
        ok: false,
        error: formatImageError(
          "OpenAI did not return data[0].url or data[0].b64_json.",
        ),
      };
    }

    console.info(
      "[generate_premium_image] OpenAI returned realUrl:",
      realUrl.startsWith("data:")
        ? `data URL (${realUrl.length} chars)`
        : realUrl,
    );

    return { ok: true, realUrl };
  } catch (unexpected) {
    console.error("TOOL CATCH ERROR:", unexpected);
    const message =
      unexpected instanceof Error
        ? unexpected.message
        : "Unexpected failure during image generation";
    return { ok: false, error: formatImageError(message) };
  }
}
