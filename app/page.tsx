import { ChatBox } from "@/components/ChatBox";
import { WalletConnectButton } from "@/components/WalletConnectButton";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              DataVault AI
            </h1>
            <p className="text-sm text-zinc-400">
              Hedera-powered agent bounty workspace
            </p>
          </div>
          <WalletConnectButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
        <ChatBox />
      </main>
    </div>
  );
}
