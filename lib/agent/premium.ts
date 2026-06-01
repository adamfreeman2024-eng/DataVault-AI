import type { AgentChatMessage } from "@/types/agent-api";

/** Short greetings and small talk — no x402 payment. */
const FREE_CHAT_PATTERN =
  /^(hi|hello|hey|thanks|thank you|good\s+(morning|afternoon|evening)|how are you)\b/i;

/** Explicit image generation requests always require x402 settlement. */
const IMAGE_GENERATION_PATTERN =
  /\b(generate|create|make|draw|design|render|produce)\s+(an?\s+)?(image|picture|illustration|artwork|photo|graphic|visual)\b/i;

/**
 * Signals that the latest user turn needs premium tooling (analysis, generation, on-chain work).
 */
const PREMIUM_TASK_PATTERN =
  /\b(analyz|analysis|analyse|generate|report|audit|forecast|summarize|summarise|research|investigate|compare|evaluate|calculate|model|predict|chart|graph|dataset|data\s+set|on-?chain|blockchain|hedera|token|nft|contract|smart\s+contract|ledger|mirror\s+node|transaction|transfer|balance\s+history|portfolio|defi|dex|swap|liquidity|deep\s+dive|complex|comprehensive|detailed|write\s+(a|an)|create\s+(a|an)|build\s+(a|an)|draft)\b/i;

/**
 * Returns the most recent user message in the thread, if any.
 */
export function getLatestUserMessage(
  messages: AgentChatMessage[],
): AgentChatMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role === "user") return message;
  }
  return undefined;
}

/**
 * Heuristic gate for x402: premium tasks require a verified 10 HBAR transfer.
 */
export function requiresPremiumTask(messages: AgentChatMessage[]): boolean {
  const latest = getLatestUserMessage(messages);
  if (!latest) return false;

  const text = latest.content.trim();
  if (!text) return false;

  if (text.length <= 48 && FREE_CHAT_PATTERN.test(text)) {
    return false;
  }

  if (IMAGE_GENERATION_PATTERN.test(text)) {
    return true;
  }

  if (PREMIUM_TASK_PATTERN.test(text)) {
    return true;
  }

  // Long, multi-sentence prompts are treated as premium work.
  if (text.length >= 200 || text.split(/\n/).length >= 4) {
    return true;
  }

  return false;
}
