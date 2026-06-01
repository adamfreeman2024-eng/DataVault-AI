"use client";

import { useWallet } from "@/contexts/WalletContext";
import { truncateAccountId } from "@/lib/format";

export function WalletConnectInner() {
  const {
    isConnected,
    accountIds,
    isInitializing,
    isConnecting,
    error,
    connect,
    disconnect,
  } = useWallet();

  const primaryAccount = accountIds[0];
  const isBusy = isInitializing || isConnecting;

  if (error && !isConnected) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2"
        title={error}
      >
        <span className="size-2 shrink-0 rounded-full bg-red-500" aria-hidden />
        <span className="max-w-[12rem] truncate text-sm text-red-300 sm:max-w-none">
          {error}
        </span>
      </div>
    );
  }

  if (isConnected && primaryAccount) {
    const displayId = truncateAccountId(primaryAccount);

    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/30 px-3 py-2"
          title={primaryAccount}
        >
          <span
            className="size-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
            aria-hidden
          />
          <span className="font-mono text-sm text-emerald-100">{displayId}</span>
        </div>

        <button
          type="button"
          onClick={() => void disconnect()}
          className="rounded-xl border border-zinc-700/80 bg-zinc-800/80 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-700/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void connect()}
      disabled={isBusy}
      className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
    >
      <span className="relative z-10">
        {isInitializing
          ? "Loading…"
          : isConnecting
            ? "Connecting…"
            : "Connect Wallet"}
      </span>
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)",
        }}
        aria-hidden
      />
    </button>
  );
}
