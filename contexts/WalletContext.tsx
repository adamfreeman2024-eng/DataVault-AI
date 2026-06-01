"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import { useHashConnect } from "@/hooks/useHashConnect";

type WalletContextValue = ReturnType<typeof useHashConnect>;

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useHashConnect();

  return (
    <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
