import {
  AccountId,
  Hbar,
  HbarUnit,
  Status,
  TransactionId,
  TransactionRecordQuery,
  type Client,
} from "@hiero-ledger/sdk";

import {
  X402_CURRENCY,
  X402_PREMIUM_HBAR_AMOUNT,
} from "@/lib/constants";

export type PaymentRequiredPayload = {
  requiresPayment: true;
  amount: number;
  currency: typeof X402_CURRENCY;
  operatorAccountId: string;
};

export type PaymentVerificationResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Standard x402 response when a premium action has no `transactionId` yet.
 */
export function buildPaymentRequiredResponse(
  operatorAccountId: string,
): PaymentRequiredPayload {
  return {
    requiresPayment: true,
    amount: X402_PREMIUM_HBAR_AMOUNT,
    currency: X402_CURRENCY,
    operatorAccountId,
  };
}

/**
 * Verifies on-ledger (consensus node query) that `transactionId` settled successfully
 * and credited exactly {@link X402_PREMIUM_HBAR_AMOUNT} HBAR to the operator account.
 */
export async function verifyHbarPayment(
  client: Client,
  transactionIdString: string,
  operatorAccountId: string,
): Promise<PaymentVerificationResult> {
  let transactionId: TransactionId;

  try {
    transactionId = TransactionId.fromString(transactionIdString.trim());
  } catch {
    return { ok: false, reason: "Invalid transactionId format." };
  }

  let record;

  try {
    record = await new TransactionRecordQuery()
      .setTransactionId(transactionId)
      .execute(client);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to fetch transaction record.";
    return {
      ok: false,
      reason: `Transaction lookup failed: ${message}`,
    };
  }

  if (record.receipt.status !== Status.Success) {
    return {
      ok: false,
      reason: `Transaction did not succeed (status: ${record.receipt.status.toString()}).`,
    };
  }

  const operator = AccountId.fromString(operatorAccountId);
  const expectedTinybars = Hbar.from(
    X402_PREMIUM_HBAR_AMOUNT,
    HbarUnit.Hbar,
  ).toTinybars();

  let creditedToOperator = 0n;

  for (const transfer of record.transfers) {
    if (!transfer.accountId.equals(operator)) continue;

    const tinybars = BigInt(transfer.amount.toTinybars().toString());
    if (tinybars > 0n) {
      creditedToOperator += tinybars;
    }
  }

  if (creditedToOperator !== BigInt(expectedTinybars.toString())) {
    return {
      ok: false,
      reason: `Expected exactly ${X402_PREMIUM_HBAR_AMOUNT} HBAR to ${operatorAccountId}, but operator received ${Hbar.fromTinybars(
        creditedToOperator.toString(),
      ).toString()}.`,
    };
  }

  return { ok: true };
}
