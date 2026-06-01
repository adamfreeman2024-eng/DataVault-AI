import { LedgerId, type Client } from "@hiero-ledger/sdk";
import { getMirrornodeService } from "hedera-agent-kit";

import { resolveHederaNetwork } from "@/lib/hedera/network";

/**
 * Optional read-only enrichment via Hedera Agent Kit mirror helpers.
 * Used after x402 payment for premium tasks — no write transactions from the server.
 */
export async function buildOnChainContextSnippet(
  _client: Client,
  network: ReturnType<typeof resolveHederaNetwork>,
  userText: string,
): Promise<string> {
  const accountMatch = userText.match(/0\.0\.\d+/);
  if (!accountMatch) return "";

  const accountId = accountMatch[0];

  try {
    const ledgerId =
      network === "mainnet"
        ? LedgerId.MAINNET
        : network === "previewnet"
          ? LedgerId.PREVIEWNET
          : LedgerId.TESTNET;

    const mirror = getMirrornodeService(undefined, ledgerId);
    const [account, balance] = await Promise.all([
      mirror.getAccount(accountId),
      mirror.getAccountHbarBalance(accountId),
    ]);

    return [
      "[Hedera mirror context — use for analysis only]",
      `Account: ${account.accountId}`,
      `HBAR balance (tinybars): ${balance.toString()}`,
      `EVM address: ${account.evmAddress}`,
    ].join("\n");
  } catch {
    return "";
  }
}
