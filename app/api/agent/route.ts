import { NextResponse } from "next/server";

import { buildOnChainContextSnippet } from "@/lib/agent/hedera-context";
import { runDataVaultAgent } from "@/lib/agent/run-agent";
import { IS_MOCK_MODE } from "@/lib/agent/tools/generate-premium-image";
import { getLatestUserMessage, requiresPremiumTask } from "@/lib/agent/premium";
import {
  buildPaymentRequiredResponse,
  verifyHbarPayment,
} from "@/lib/agent/x402";
import { getHederaOperatorConfig } from "@/lib/env";
import { createOperatorClient } from "@/lib/hedera/client";
import type {
  AgentErrorResponse,
  AgentRequestBody,
  AgentSuccessResponse,
} from "@/types/agent-api";

export const runtime = "nodejs";

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 12_000;

function jsonError(
  body: AgentErrorResponse,
  status: number,
): NextResponse<AgentErrorResponse> {
  return NextResponse.json(body, { status });
}

function validateMessages(
  messages: AgentRequestBody["messages"],
): string | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "messages must be a non-empty array";
  }

  if (messages.length > MAX_MESSAGES) {
    return `messages exceeds maximum of ${MAX_MESSAGES}`;
  }

  for (const message of messages) {
    if (
      message.role !== "user" &&
      message.role !== "assistant" &&
      message.role !== "system"
    ) {
      return "each message must have role user, assistant, or system";
    }

    if (typeof message.content !== "string" || !message.content.trim()) {
      return "each message must include non-empty content";
    }

    if (message.content.length > MAX_MESSAGE_LENGTH) {
      return `message content exceeds ${MAX_MESSAGE_LENGTH} characters`;
    }
  }

  return null;
}

/**
 * POST /api/agent
 *
 * x402 flow:
 * 1. Classify latest user prompt (free vs premium).
 * 2. Premium + no transactionId → 402 + payment instructions.
 * 3. Premium + transactionId → verify 10 HBAR to operator via Hiero SDK.
 * 4. Run LLM (with optional Hedera mirror context for paid premium tasks).
 */
export async function POST(request: Request) {
  let body: AgentRequestBody;

  try {
    body = (await request.json()) as AgentRequestBody;
  } catch {
    return jsonError({ error: "Invalid JSON body", code: "INVALID_JSON" }, 400);
  }

  const validationError = validateMessages(body.messages);
  if (validationError) {
    return jsonError(
      { error: validationError, code: "INVALID_MESSAGES" },
      400,
    );
  }

  const premiumTask = requiresPremiumTask(body.messages);
  const operatorAccountId = getHederaOperatorConfig().accountId;
  let paymentVerified = false;

  if (premiumTask) {
    const transactionId = body.transactionId?.trim();

    if (!transactionId) {
      return NextResponse.json(buildPaymentRequiredResponse(operatorAccountId), {
        status: 402,
      });
    }

    try {
      const { client } = createOperatorClient();
      const verification = await verifyHbarPayment(
        client,
        transactionId,
        operatorAccountId,
      );

      if (!verification.ok) {
        return jsonError(
          {
            error: verification.reason,
            code: "PAYMENT_VERIFICATION_FAILED",
          },
          400,
        );
      }

      paymentVerified = true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Payment verification error";
      return jsonError(
        { error: message, code: "HEDERA_CLIENT_ERROR" },
        500,
      );
    }
  }

  try {
    const latestUser = getLatestUserMessage(body.messages);
    let extraSystemContext = "";

    if (premiumTask && paymentVerified && latestUser) {
      const { client, network } = createOperatorClient();
      const mirrorContext = await buildOnChainContextSnippet(
        client,
        network,
        latestUser.content,
      );
      if (mirrorContext) {
        extraSystemContext = mirrorContext;
      }
    }

    if (premiumTask && paymentVerified && IS_MOCK_MODE) {
      console.log(
        "[api/agent] MOCK image generation — no OpenAI API call (IS_MOCK_MODE=true)",
      );
    }

    const agentResult = await runDataVaultAgent(body.messages, {
      paymentVerified,
      extraSystemContext,
    });

    const response: AgentSuccessResponse = {
      requiresPayment: false,
      content: agentResult.content,
      ...(agentResult.imageUrl ? { imageUrl: agentResult.imageUrl } : {}),
      premiumTask,
      paymentVerified,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Agent execution failed";
    return jsonError({ error: message, code: "AGENT_EXECUTION_ERROR" }, 500);
  }
}
