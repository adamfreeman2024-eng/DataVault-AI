/** Shorten a Hedera account id for display (e.g. 0.0.1234567 → 0.0.12345…) */
export function truncateAccountId(accountId: string, visibleTail = 0): string {
  const parts = accountId.split(".");
  if (parts.length < 3) return accountId;

  const shard = parts[0];
  const realm = parts[1];
  const num = parts[2] ?? "";

  if (num.length <= 5) return accountId;

  const head = num.slice(0, 5);
  if (visibleTail > 0 && num.length > head.length + visibleTail) {
    const tail = num.slice(-visibleTail);
    return `${shard}.${realm}.${head}…${tail}`;
  }

  return `${shard}.${realm}.${head}…`;
}
