import type { DappMetadata } from "hashconnect";

import { APP_NAME } from "@/lib/constants";

export function getHashConnectProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_HASHCONNECT_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "NEXT_PUBLIC_HASHCONNECT_PROJECT_ID is required for wallet connection",
    );
  }
  return projectId;
}

export function getDappMetadata(): DappMetadata {
  return {
    name: process.env.NEXT_PUBLIC_APP_NAME ?? APP_NAME,
    description:
      process.env.NEXT_PUBLIC_APP_DESCRIPTION ??
      "AI agent bounty platform on Hedera",
    icons: [
      process.env.NEXT_PUBLIC_APP_ICON_URL ??
        `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/icon.png`,
    ],
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}
