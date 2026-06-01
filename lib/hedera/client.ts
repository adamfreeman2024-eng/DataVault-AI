import { AccountId, PrivateKey } from "@hiero-ledger/sdk";

import { getHederaOperatorConfig } from "@/lib/env";
import {
  createHederaClient,
  resolveHederaNetwork,
} from "@/lib/hedera/network";

/**
 * Server-side Hedera client with operator credentials.
 * Use only in API routes or server actions — never import in client components.
 */
export function createOperatorClient() {
  const { accountId, privateKey, network } = getHederaOperatorConfig();
  const resolvedNetwork = resolveHederaNetwork(network);
  const client = createHederaClient(resolvedNetwork);

  client.setOperator(
    AccountId.fromString(accountId),
    PrivateKey.fromString(privateKey),
  );

  return { client, network: resolvedNetwork, accountId };
}
