import { describe, it, expect } from "vitest";

describe("x402 replay protection", () => {
  const used = new Set<string>();

  function isAlreadyUsed(id: string): boolean {
    return used.has(id.trim());
  }

  function markUsed(id: string): void {
    const key = id.trim();
    if (key) used.add(key);
  }

  it("rejects reused transaction IDs", () => {
    const txId = "0.0.12345@1730000000.000000001";
    expect(isAlreadyUsed(txId)).toBe(false);
    markUsed(txId);
    expect(isAlreadyUsed(txId)).toBe(true);
  });

  it("normalizes whitespace in transaction IDs", () => {
    markUsed("  0.0.99999@1730000000.000000002  ");
    expect(isAlreadyUsed("0.0.99999@1730000000.000000002")).toBe(true);
  });

  it("does not mark empty strings", () => {
    markUsed("");
    expect(isAlreadyUsed("")).toBe(false);
  });

  it("allows different transaction IDs", () => {
    markUsed("0.0.12345@1730000000.000000001");
    expect(isAlreadyUsed("0.0.12345@1730000000.000000099")).toBe(false);
  });
});
