import { NextResponse } from "next/server";

import { buildOnChainContextSnippet } from "@/lib/agent/hedera-context";
import { runDataVaultAgent } from "@/lib/agent/run-agent";
import { IS_MOCK_MODE } from "@/lib/agent/tools/generate-premium-image";
import { getLatestUserMessage, requiresPremiumTask } from "@/lib/agent/premium";
import {
  isX402TransactionAlreadyUsed,
  markX402TransactionUsed,
} from "@/lib/agent/x402-transaction-store";
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

/** Allow OpenAI image gen + DeepSeek tool loop (can exceed default limits). */
export const maxDuration = 300;

const AGENT_EXECUTION_TIMEOUT_MS = 120_000;

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

function createAgentAbortSignal(
  requestSignal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const onRequestAbort = () => controller.abort();
  requestSignal?.addEventListener("abort", onRequestAbort);

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      requestSignal?.removeEventListener("abort", onRequestAbort);
    },
  };
}

function jsonSuccess(
  body: AgentSuccessResponse,
): NextResponse<AgentSuccessResponse> {
  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Connection: "close",
    },
  });
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
  let settledTransactionId: string | undefined;
  let operatorClient: ReturnType<typeof createOperatorClient> | undefined;

  if (premiumTask) {
    const transactionId = body.transactionId?.trim();

    if (!transactionId) {
      return NextResponse.json(buildPaymentRequiredResponse(operatorAccountId), {
        status: 402,
      });
    }

    if (isX402TransactionAlreadyUsed(transactionId)) {
      return jsonError(
        {
          error:
            "This payment transaction has already been used for a premium agent execution.",
          code: "TRANSACTION_ALREADY_USED",
        },
        400,
      );
    }

    try {
      operatorClient = createOperatorClient();
      const verification = await verifyHbarPayment(
        operatorClient.client,
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
      settledTransactionId = transactionId;
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
      const { client, network } =
        operatorClient ?? createOperatorClient();
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

    const { signal, cleanup } = createAgentAbortSignal(
      request.signal,
      AGENT_EXECUTION_TIMEOUT_MS,
    );

    let agentResult: Awaited<ReturnType<typeof runDataVaultAgent>>;

    try {
      const hederaClient =
        paymentVerified && operatorClient
          ? operatorClient.client
          : undefined;

      agentResult = await runDataVaultAgent(body.messages, {
        paymentVerified,
        extraSystemContext,
        abortSignal: signal,
        ...(hederaClient ? { hederaClient } : {}),
      });
    } finally {
      cleanup();
    }

    if (settledTransactionId) {
      markX402TransactionUsed(settledTransactionId);
    }

    const response: AgentSuccessResponse = {
      requiresPayment: false,
      content: agentResult.content,
      ...(agentResult.imageUrl ? { imageUrl: agentResult.imageUrl } : {}),
      premiumTask,
      paymentVerified,
    };

    return jsonSuccess(response);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Agent execution failed";
    return jsonError({ error: message, code: "AGENT_EXECUTION_ERROR" }, 500);
  }
}

/** Debug endpoint — check environment variables on Vercel */
export async function GET() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const hederaId = process.env.HEDERA_ACCOUNT_ID;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: {
      OPENAI_API_KEY: openaiKey
        ? `SET (prefix: ${openaiKey.substring(0, 12)}..., length: ${openaiKey.length})`
        : "NOT SET ❌",
      DEEPSEEK_API_KEY: deepseekKey
        ? `SET (length: ${deepseekKey.length})`
        : "NOT SET ❌",
      HEDERA_ACCOUNT_ID: hederaId
        ? `SET (${hederaId})`
        : "NOT SET ❌",
    },
    nodeEnv: process.env.NODE_ENV,
  });
}
