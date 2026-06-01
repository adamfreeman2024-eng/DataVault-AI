import { NextResponse } from "next/server";

import { createDeepSeekClient, getDeepSeekModelId } from "@/lib/ai/deepseek";
import { createOpenAIClient, getOpenAIModelId } from "@/lib/ai/openai";
import { createAgentKitPlaceholder } from "@/lib/hedera/agent-kit";

export const runtime = "nodejs";

type AgentRequestBody = {
  message?: string;
};

/**
 * Skeleton for agent orchestration, x402 micropayments, and AI execution.
 * Implementation intentionally deferred.
 */
export async function POST(request: Request) {
  let body: AgentRequestBody = {};

  try {
    body = (await request.json()) as AgentRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 },
    );
  }

  const openai = createOpenAIClient();
  const deepseek = createDeepSeekClient();
  const agentKit = createAgentKitPlaceholder();

  return NextResponse.json(
    {
      status: "not_implemented",
      hint: "Wire Hedera client, x402 settlement, and LLM invocation here.",
      receivedMessage: message,
      providers: {
        openai: openai ? { model: getOpenAIModelId() } : null,
        deepseek: deepseek ? { model: getDeepSeekModelId() } : null,
      },
      agentKit,
    },
    { status: 501 },
  );
}
