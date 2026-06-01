"use client";

import dynamic from "next/dynamic";

const WalletConnectButtonClient = dynamic(
  () =>
    import("@/components/WalletConnectButtonClient").then(
      (mod) => mod.WalletConnectButtonClient,
    ),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        disabled
        className="rounded-lg bg-emerald-600/60 px-4 py-2 text-sm font-medium text-white"
      >
        Connect Wallet
      </button>
    ),
  },
);

export function WalletConnectButton() {
  return <WalletConnectButtonClient />;
}
