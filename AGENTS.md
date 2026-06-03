# DataVault AI — Agent Instructions
Next.js 16 App Router. Hedera AI Bounty 3.
Pay-per-use AI agent with x402 HBAR micropayments.

## Architecture
- app/api/agent/route.ts — x402 gate + agent runner
- lib/agent/ — classification, x402, replay store, tools
- lib/hedera/ — Hedera SDK, Agent Kit tools
- contexts/WalletContext.tsx — DAppConnector

## Payment flow
1. POST /api/agent → classify
2. Premium → HTTP 402 + settlement
3. Client pays 10 HBAR via WalletConnect
4. Retry with transactionId proof
5. Server verifies on Hedera → premium agent
