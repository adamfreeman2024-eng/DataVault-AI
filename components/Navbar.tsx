"use client";

import { WalletConnect } from "@/components/WalletConnect";
import { APP_NAME } from "@/lib/constants";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 ring-1 ring-emerald-500/30"
            aria-hidden
          >
            <svg
              className="size-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
              />
            </svg>
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-lg font-bold tracking-tight text-transparent">
              {APP_NAME}
            </h1>
            <p className="text-xs text-zinc-500">Hedera x402 agent bounty</p>
          </div>
        </div>

        <WalletConnect />
      </div>
    </header>
  );
}
