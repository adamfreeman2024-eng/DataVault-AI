import {
  coreAccountQueryPluginToolNames,
  coreTokenQueryPluginToolNames,
} from "hedera-agent-kit";

/**
 * Read-only Hedera Agent Kit query tool names (for future tool-calling loops).
 * Premium routes currently use `getMirrornodeService` for mirror enrichment.
 */
export const READ_ONLY_TOOL_NAMES = {
  hbarBalance: coreAccountQueryPluginToolNames.GET_HBAR_BALANCE_QUERY_TOOL,
  account: coreAccountQueryPluginToolNames.GET_ACCOUNT_QUERY_TOOL,
  tokenInfo: coreTokenQueryPluginToolNames.GET_TOKEN_INFO_QUERY_TOOL,
} as const;
