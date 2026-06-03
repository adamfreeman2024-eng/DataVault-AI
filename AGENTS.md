# DataVault AI — Agent Instructions

## Project
Next.js 16 App Router. Hedera AI Bounty 3 submission.
Pay-per-use AI agent with x402 HBAR micropayments on Hedera testnet.

## Key rules
- Never use window.location.href — use Next.js useRouter
- Zero unused imports

## Architecture
- app/api/agent/route.ts — x402 gate + agent runner
- lib/agent/ — classification, x402, replay store, tools
- lib/hedera/ — Hedera SDK client, Agent Kit tools
- lib/wallet/ — x402 payment + wallet config
- contexts/WalletContext.tsx — DAppConnector lifecycle

## Payment flow
1. POST /api/agent → classify
2. Premium task → HTTP 402 + settlement instructions
3. Client pays 10 HBAR via WalletConnect
4. Retry with transactionId
5. Server verifies on Hedera → runs premium agent
