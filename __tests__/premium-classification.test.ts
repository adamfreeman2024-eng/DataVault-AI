import { describe, it, expect } from "vitest";

const IMAGE_PATTERN = /\b(generate|create|make|draw|design|render|produce)\s+(an?\s+)?(image|picture|illustration|artwork|photo|graphic|visual)\b|\bdraw\s+(?:a|an)\s+\w+/i;
const PREMIUM_PATTERN = /\b(analyz|analysis|analyse|generate|report|audit|forecast|summarize|research|investigate|compare|evaluate|calculate|model|predict|chart|graph|dataset|data\s+set|on-?chain|blockchain|hedera|token|nft|contract|smart\s+contract|ledger|mirror\s+node|transaction|transfer|balance\s+history|portfolio|defi|dex|swap|liquidity|deep\s+dive|complex|comprehensive|detailed|write\s+(a|an)|create\s+(a|an)|build\s+(a|an)|draft)\b/i;
const FREE_PATTERN = /^(hi|hello|hey|thanks|thank you|good\s+(morning|afternoon|evening)|how are you)\b/i;

function requiresPremiumTask(text: string): boolean {
  if (!text.trim()) return false;
  if (text.length <= 48 && FREE_PATTERN.test(text.trim())) return false;
  if (IMAGE_PATTERN.test(text)) return true;
  if (PREMIUM_PATTERN.test(text)) return true;
  if (text.length >= 200 || text.split(/\n/).length >= 4) return true;
  return false;
}

describe("premium task classification", () => {
  it("greetings are free", () => {
    expect(requiresPremiumTask("hi")).toBe(false);
    expect(requiresPremiumTask("hello")).toBe(false);
    expect(requiresPremiumTask("thanks")).toBe(false);
    expect(requiresPremiumTask("good morning")).toBe(false);
  });

  it("image generation is premium", () => {
    expect(requiresPremiumTask("generate an image of a cat")).toBe(true);
    expect(requiresPremiumTask("create a picture of a sunset")).toBe(true);
    expect(requiresPremiumTask("draw a dragon")).toBe(true);
  });

  it("premium keywords trigger premium", () => {
    expect(requiresPremiumTask("analyze the Hedera token 0.0.1234")).toBe(true);
    expect(requiresPremiumTask("write a report about blockchain")).toBe(true);
    expect(requiresPremiumTask("research HBAR price trends")).toBe(true);
    expect(requiresPremiumTask("audit this smart contract")).toBe(true);
  });

  it("long messages are premium", () => {
    expect(requiresPremiumTask("A".repeat(200))).toBe(true);
  });

  it("multi-line messages are premium", () => {
    expect(requiresPremiumTask("line1\nline2\nline3\nline4")).toBe(true);
  });

  it("short general questions are free", () => {
    expect(requiresPremiumTask("What is the weather?")).toBe(false);
    expect(requiresPremiumTask("Tell me a joke")).toBe(false);
  });
});
