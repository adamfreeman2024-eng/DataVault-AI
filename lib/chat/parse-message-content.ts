export type MessageContentPart =
  | { type: "text"; value: string }
  | { type: "image"; alt: string; url: string };

/** Matches Markdown images: ![alt text](https://...) */
const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

/**
 * Splits assistant message text into plain text and Markdown image segments.
 */
export function parseMessageContent(content: string): MessageContentPart[] {
  const parts: MessageContentPart[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(MARKDOWN_IMAGE_REGEX)) {
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      const text = content.slice(lastIndex, matchIndex).trim();
      if (text) {
        parts.push({ type: "text", value: text });
      }
    }

    const url = match[2]?.trim();
    if (url) {
      parts.push({
        type: "image",
        alt: match[1]?.trim() || "Generated image",
        url,
      });
    }

    lastIndex = matchIndex + match[0].length;
  }

  const trailing = content.slice(lastIndex).trim();
  if (trailing) {
    parts.push({ type: "text", value: trailing });
  }

  if (parts.length === 0 && content.trim()) {
    parts.push({ type: "text", value: content.trim() });
  }

  return parts;
}

/**
 * Merges structured `imageUrl` from the API with Markdown segments (no duplicates).
 */
export function buildMessageParts(
  content: string,
  imageUrl?: string,
): MessageContentPart[] {
  const parts = parseMessageContent(content);
  const urls = new Set(
    parts
      .filter((part): part is Extract<MessageContentPart, { type: "image" }> =>
        part.type === "image",
      )
      .map((part) => part.url),
  );

  if (imageUrl && !urls.has(imageUrl)) {
    parts.push({
      type: "image",
      alt: "Generated image",
      url: imageUrl,
    });
  }

  return parts;
}
