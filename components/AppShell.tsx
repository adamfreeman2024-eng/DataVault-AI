"use client";

import { ChatBox } from "@/components/ChatBox";
import { Navbar } from "@/components/Navbar";
import { WalletProvider } from "@/contexts/WalletContext";

export function AppShell() {
  return (
    <WalletProvider>
      <div className="relative flex min-h-full flex-col">
        <div
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]"
          aria-hidden
        />
        <div
          className="pointer-events-none fixed inset-0 -z-10 bg-grid opacity-[0.35]"
          aria-hidden
        />

        <Navbar />

        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
          <ChatBox />
        </main>
      </div>
    </WalletProvider>
  );
}
