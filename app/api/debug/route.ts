import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const hederaId = process.env.HEDERA_ACCOUNT_ID;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: {
      OPENAI_API_KEY: openaiKey
        ? `✅ SET (prefix: ${openaiKey.substring(0, 10)}..., length: ${openaiKey.length})`
        : "❌ NOT SET",
      DEEPSEEK_API_KEY: deepseekKey
        ? `✅ SET (length: ${deepseekKey.length})`
        : "❌ NOT SET",
      HEDERA_ACCOUNT_ID: hederaId
        ? `✅ SET (${hederaId})`
        : "❌ NOT SET",
    },
    nodeEnv: process.env.NODE_ENV,
  });
}
