import type { DAppConnector } from "@hashgraph/hedera-wallet-connect";

/**
 * Pulls a Hedera transaction id from WalletConnect / wallet JSON-RPC payloads.
 */
export function extractTransactionIdFromWalletResult(
  result: unknown,
): string | null {
  if (!result || typeof result !== "object") return null;

  const record = result as Record<string, unknown>;

  if (typeof record.transactionId === "string") {
    return record.transactionId;
  }

  if (record.result && typeof record.result === "object") {
    const nested = record.result as Record<string, unknown>;
    if (typeof nested.transactionId === "string") {
      return nested.transactionId;
    }
  }

  return null;
}

/**
 * Builds HIP-30 signer id (`hedera:testnet:0.0.x`) for DAppConnector requests.
 */
export function toHip30SignerAccountId(
  network: string,
  accountId: string,
): string {
  const normalizedNetwork = network.toLowerCase();
  if (accountId.includes(":")) {
    return accountId;
  }
  return `hedera:${normalizedNetwork}:${accountId}`;
}

/**
 * Prompts the connected wallet (via DAppConnector) to sign and execute an HBAR
 * transfer to the operator account — the on-chain x402 settlement step.
 */
export async function submitX402HbarPayment(
  connector: DAppConnector,
  payerAccountId: string,
  operatorAccountId: string,
  amountHbar: number,
): Promise<string> {
  const [{ TransferTransaction, Hbar, HbarUnit, AccountId }, { transactionToBase64String }] =
    await Promise.all([
      import("@hiero-ledger/sdk"),
      import("@hashgraph/hedera-wallet-connect"),
    ]);

  const payer = AccountId.fromString(payerAccountId);
  const operator = AccountId.fromString(operatorAccountId);
  const payment = new Hbar(amountHbar, HbarUnit.Hbar);

  const transaction = new TransferTransaction()
    .addHbarTransfer(payer, payment.negated())
    .addHbarTransfer(operator, payment)
    .setTransactionMemo("DataVault AI x402");

  const networkName = connector.network.toString().toLowerCase();
  const signerAccountId = toHip30SignerAccountId(networkName, payerAccountId);

  const walletResult = await connector.signAndExecuteTransaction({
    signerAccountId,
    transactionList: transactionToBase64String(transaction),
  });

  const transactionId = extractTransactionIdFromWalletResult(walletResult);
  if (!transactionId) {
    throw new Error(
      "Payment transaction was submitted but no transactionId was returned by the wallet.",
    );
  }

  return transactionId;
}
