/**
 * In-memory replay guard for x402 settlement proofs.
 * Resets when the Node.js server process restarts (no database).
 */
const usedTransactionIds = new Set<string>();

function normalizeTransactionId(transactionId: string): string {
  return transactionId.trim();
}

export function isX402TransactionAlreadyUsed(transactionId: string): boolean {
  const key = normalizeTransactionId(transactionId);
  if (!key) return false;
  return usedTransactionIds.has(key);
}

/**
 * Call only after a premium agent run completes successfully (HTTP 200).
 */
export function markX402TransactionUsed(transactionId: string): void {
  const key = normalizeTransactionId(transactionId);
  if (!key) return;
  usedTransactionIds.add(key);
}
