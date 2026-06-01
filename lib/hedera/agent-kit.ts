import type { Client } from "@hiero-ledger/sdk";

/**
 * Placeholder for Hedera Agent Kit initialization.
 * Wire HederaLangchainToolkit / plugins here when implementing agent flows.
 *
 * @see https://github.com/hashgraph/hedera-agent-kit-js
 */
export type AgentKitInitOptions = {
  client: Client;
};

export function createAgentKitPlaceholder() {
  return {
    ready: false as const,
    message:
      "Hedera Agent Kit wiring pending — connect toolkit, tools, and plugins in a follow-up.",
  };
}
