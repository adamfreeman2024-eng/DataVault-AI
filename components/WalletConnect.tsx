"use client";

import dynamic from "next/dynamic";

function WalletConnectSkeleton() {
  return (
    <div className="h-10 w-36 animate-pulse rounded-xl bg-zinc-800/80" />
  );
}

const WalletConnectInner = dynamic(
  () =>
    import("@/components/WalletConnectInner").then(
      (mod) => mod.WalletConnectInner,
    ),
  {
    ssr: false,
    loading: () => <WalletConnectSkeleton />,
  },
);

export function WalletConnect() {
  return <WalletConnectInner />;
}
