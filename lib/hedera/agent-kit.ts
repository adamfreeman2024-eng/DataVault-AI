import type { Client } from "@hiero-ledger/sdk";
import type { ToolSet } from "ai";
import {
  AgentMode,
  HederaAIToolkit,
  coreAccountQueryPlugin,
  coreAccountQueryPluginToolNames,
  coreTokenQueryPlugin,
  coreTokenQueryPluginToolNames,
} from "hedera-agent-kit";

/**
 * Read-only Hedera Agent Kit query tool names wired into the premium agent loop.
 */
export const READ_ONLY_TOOL_NAMES = {
  hbarBalance: coreAccountQueryPluginToolNames.GET_HBAR_BALANCE_QUERY_TOOL,
  account: coreAccountQueryPluginToolNames.GET_ACCOUNT_QUERY_TOOL,
  tokenInfo: coreTokenQueryPluginToolNames.GET_TOKEN_INFO_QUERY_TOOL,
} as const;

const READ_ONLY_TOOL_METHODS = [
  READ_ONLY_TOOL_NAMES.hbarBalance,
  READ_ONLY_TOOL_NAMES.account,
  READ_ONLY_TOOL_NAMES.tokenInfo,
] as const;

/**
 * Vercel AI SDK tools from Hedera Agent Kit (mirror queries only; no writes).
 */
export function createReadOnlyHederaAiTools(client: Client): ToolSet {
  const toolkit = new HederaAIToolkit({
    // hedera-agent-kit bundles @hashgraph/sdk; Hiero Client is structurally compatible.
    client: client as unknown as ConstructorParameters<
      typeof HederaAIToolkit
    >[0]["client"],
    configuration: {
      plugins: [coreAccountQueryPlugin, coreTokenQueryPlugin],
      tools: [...READ_ONLY_TOOL_METHODS],
      context: {
        mode: AgentMode.AUTONOMOUS,
      },
    },
  });

  return toolkit.getTools() as ToolSet;
}
