import type { DAppConnector } from "@hashgraph/hedera-wallet-connect";

export function getConnectedAccountIds(connector: DAppConnector): string[] {
  return connector.signers.map((signer) => signer.getAccountId().toString());
}

export function isWalletActive(connector: DAppConnector): boolean {
  return connector.signers.length > 0;
}
