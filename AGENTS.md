# DataVault AI — Agent Instructions

## Project
Next.js 16 (App Router) full-stack app. Hedera AI Bounty 3 submission.
Pay-per-use AI agent with x402-inspired HBAR micropayments on Hedera testnet.

## Key rules
- Never use window.location.href — use Next.js useRouter
- Never sync state in useEffect without setTimeout wrapper
- Zero unused imports

## Architecture
- app/api/agent/route.ts — single API entrypoint (x402 gate + agent runner)
- lib/agent/ — core agent logic: classification, x402, replay store, tools
- lib/hedera/ — Hedera SDK client, Agent Kit tool wrappers
- lib/wallet/ — client-side x402 payment + wallet config
- contexts/WalletContext.tsx — DAppConnector lifecycle
- hooks/useChat.ts — chat state + x402 client orchestration

## Payment flow
1. POST /api/agent with messages
2. Premium task → HTTP 402 with settlement instructions
3. Client pays 10 HBAR on Hedera testnet via WalletConnect
4. Retry with transactionId proof
5. Server verifies on-ledger → runs premium agent with HAK tools
