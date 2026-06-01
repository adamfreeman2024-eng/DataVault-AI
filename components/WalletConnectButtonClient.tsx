"use client";

import { useHashConnect } from "@/hooks/useHashConnect";

export function WalletConnectButtonClient() {
  const {
    isConnected,
    accountIds,
    isInitializing,
    error,
    connect,
    disconnect,
  } = useHashConnect();

  const primaryAccount = accountIds[0];

  if (error) {
    return (
      <span className="text-sm text-red-400" title={error}>
        Wallet unavailable
      </span>
    );
  }

  if (isConnected && primaryAccount) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-zinc-400 sm:inline">
          {primaryAccount}
        </span>
        <button
          type="button"
          onClick={() => void disconnect()}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={connect}
      disabled={isInitializing}
      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isInitializing ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
