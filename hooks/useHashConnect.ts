"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DEFAULT_HEDERA_NETWORK } from "@/lib/constants";

export type WalletConnectionState = {
  status: string;
  accountIds: string[];
  isInitializing: boolean;
  error: string | null;
};

const INITIAL_STATE: WalletConnectionState = {
  status: "Disconnected",
  accountIds: [],
  isInitializing: false,
  error: null,
};

type HashConnectInstance = {
  init: () => Promise<unknown>;
  openPairingModal: () => void;
  disconnect: () => Promise<void>;
  connectedAccountIds: { toString: () => string }[];
  connectionStatusChangeEvent: { on: (cb: (status: string) => void) => void };
  pairingEvent: { on: (cb: (data: unknown) => void) => void };
  disconnectionEvent: { on: (cb: () => void) => void };
};

export function useHashConnect() {
  const hashConnectRef = useRef<HashConnectInstance | null>(null);
  const [state, setState] = useState<WalletConnectionState>(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setState((prev) => ({ ...prev, isInitializing: true, error: null }));

      try {
        const [{ HashConnect }, { getLedgerId }, config] = await Promise.all([
          import("hashconnect"),
          import("@/lib/hedera/network"),
          import("@/lib/hashconnect/config"),
        ]);

        const projectId = config.getHashConnectProjectId();
        const metadata = config.getDappMetadata();
        const ledgerId = getLedgerId(DEFAULT_HEDERA_NETWORK);

        const hashconnect = new HashConnect(
          ledgerId,
          projectId,
          metadata,
          process.env.NODE_ENV === "development",
        ) as HashConnectInstance;

        hashconnect.connectionStatusChangeEvent.on((status) => {
          if (cancelled) return;
          setState((prev) => ({
            ...prev,
            status,
            accountIds: hashconnect.connectedAccountIds.map((id) =>
              id.toString(),
            ),
          }));
        });

        hashconnect.pairingEvent.on(() => {
          if (cancelled) return;
          setState((prev) => ({
            ...prev,
            accountIds: hashconnect.connectedAccountIds.map((id) =>
              id.toString(),
            ),
          }));
        });

        hashconnect.disconnectionEvent.on(() => {
          if (cancelled) return;
          setState((prev) => ({
            ...prev,
            accountIds: [],
          }));
        });

        await hashconnect.init();
        hashConnectRef.current = hashconnect;

        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            isInitializing: false,
            accountIds: hashconnect.connectedAccountIds.map((id) =>
              id.toString(),
            ),
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            isInitializing: false,
            error:
              err instanceof Error ? err.message : "Failed to init HashConnect",
          }));
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
      hashConnectRef.current = null;
    };
  }, []);

  const connect = useCallback(() => {
    hashConnectRef.current?.openPairingModal();
  }, []);

  const disconnect = useCallback(async () => {
    await hashConnectRef.current?.disconnect();
  }, []);

  const isConnected = state.accountIds.length > 0;

  return {
    ...state,
    isConnected,
    connect,
    disconnect,
  };
}
