"use client";

import type { DAppConnector } from "@hashgraph/hedera-wallet-connect";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  getConnectedAccountIds,
  isWalletActive,
} from "@/lib/wallet/accounts";
import {
  getWalletConnectProjectId,
  getWalletDappMetadata,
} from "@/lib/wallet/config";

export type WalletContextValue = {
  connector: DAppConnector | null;
  isInitializing: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  accountIds: string[];
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const connectorRef = useRef<DAppConnector | null>(null);
  const [connector, setConnector] = useState<DAppConnector | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const syncFromConnector = useCallback((instance: DAppConnector) => {
    const ids = getConnectedAccountIds(instance);
    setAccountIds(ids);
    setIsConnected(isWalletActive(instance));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setIsInitializing(true);
      setError(null);

      try {
        const [
          { DAppConnector, HederaJsonRpcMethod, HederaSessionEvent, HederaChainId },
          { LedgerId },
        ] = await Promise.all([
          import("@hashgraph/hedera-wallet-connect"),
          import("@hiero-ledger/sdk"),
        ]);

        const instance = new DAppConnector(
          getWalletDappMetadata(),
          LedgerId.TESTNET,
          getWalletConnectProjectId(),
          Object.values(HederaJsonRpcMethod),
          [
            HederaSessionEvent.ChainChanged,
            HederaSessionEvent.AccountsChanged,
          ],
          [HederaChainId.Testnet],
        );

        await instance.init({ logger: "error" });

        if (cancelled) return;

        const client = instance.walletConnectClient;
        if (client) {
          const onSessionChange = () => {
            if (!cancelled) syncFromConnector(instance);
          };
          client.on("session_update", onSessionChange);
          client.on("session_delete", onSessionChange);
          client.core.events.on("session_delete", onSessionChange);
        }

        connectorRef.current = instance;
        setConnector(instance);
        syncFromConnector(instance);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to initialize Hedera WalletConnect",
          );
        }
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
      connectorRef.current = null;
    };
  }, [syncFromConnector]);

  const connect = useCallback(async () => {
    const instance = connectorRef.current;
    if (!instance || isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      await instance.openModal();
      syncFromConnector(instance);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Wallet connection was cancelled",
      );
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, syncFromConnector]);

  const disconnect = useCallback(async () => {
    const instance = connectorRef.current;
    if (!instance) return;

    setError(null);

    try {
      await instance.disconnectAll();
      syncFromConnector(instance);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to disconnect wallet",
      );
    }
  }, [syncFromConnector]);

  const value: WalletContextValue = {
    connector,
    isInitializing,
    isConnecting,
    isConnected,
    accountIds,
    error,
    connect,
    disconnect,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
