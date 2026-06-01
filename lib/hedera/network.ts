import { Client, LedgerId } from "@hiero-ledger/sdk";

import {
  DEFAULT_HEDERA_NETWORK,
  type HederaNetwork,
} from "@/lib/constants";

const LEDGER_BY_NETWORK: Record<HederaNetwork, LedgerId> = {
  testnet: LedgerId.TESTNET,
  mainnet: LedgerId.MAINNET,
  previewnet: LedgerId.PREVIEWNET,
};

export function resolveHederaNetwork(
  network?: string,
): HederaNetwork {
  if (
    network === "testnet" ||
    network === "mainnet" ||
    network === "previewnet"
  ) {
    return network;
  }
  return DEFAULT_HEDERA_NETWORK;
}

export function getLedgerId(network: HederaNetwork = DEFAULT_HEDERA_NETWORK) {
  return LEDGER_BY_NETWORK[network];
}

export function createHederaClient(network: HederaNetwork = DEFAULT_HEDERA_NETWORK) {
  switch (network) {
    case "mainnet":
      return Client.forMainnet();
    case "previewnet":
      return Client.forPreviewnet();
    case "testnet":
    default:
      return Client.forTestnet();
  }
}
