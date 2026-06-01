import { API_ROUTES } from "@/lib/constants";
import type {
  AgentChatMessage,
  AgentErrorResponse,
  AgentSuccessResponse,
  PaymentRequiredResponse,
} from "@/types/agent-api";

export type AgentApiResult =
  | { kind: "success"; data: AgentSuccessResponse }
  | { kind: "payment_required"; data: PaymentRequiredResponse }
  | { kind: "error"; status: number; data: AgentErrorResponse };

/**
 * Calls the DataVault agent API with optional x402 transaction proof.
 */
export async function callAgentApi(
  messages: AgentChatMessage[],
  transactionId?: string,
): Promise<AgentApiResult> {
  const response = await fetch(API_ROUTES.agent, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      ...(transactionId ? { transactionId } : {}),
    }),
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return {
      kind: "error",
      status: response.status,
      data: { error: "Invalid response from agent API" },
    };
  }

  if (response.status === 402) {
    const payment = data as PaymentRequiredResponse;
    if (payment.requiresPayment) {
      return { kind: "payment_required", data: payment };
    }
  }

  if (!response.ok) {
    return {
      kind: "error",
      status: response.status,
      data: data as AgentErrorResponse,
    };
  }

  return { kind: "success", data: data as AgentSuccessResponse };
}
