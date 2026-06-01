import type { SignClientTypes } from "@walletconnect/types";

import { APP_NAME } from "@/lib/constants";

export function getWalletConnectProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_HASHCONNECT_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "NEXT_PUBLIC_HASHCONNECT_PROJECT_ID is required (Reown / WalletConnect project ID)",
    );
  }
  return projectId;
}

export function getWalletDappMetadata(): SignClientTypes.Metadata {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    name: process.env.NEXT_PUBLIC_APP_NAME ?? APP_NAME,
    description:
      process.env.NEXT_PUBLIC_APP_DESCRIPTION ??
      "AI agent bounty platform on Hedera",
    url: appUrl,
    icons: [
      process.env.NEXT_PUBLIC_APP_ICON_URL ?? `${appUrl}/icon.png`,
    ],
  };
}
