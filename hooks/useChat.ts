"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { callAgentApi } from "@/lib/agent/client-api";
import { submitX402HbarPayment } from "@/lib/wallet/x402-payment";
import { useWallet } from "@/contexts/WalletContext";
import type { AgentChatMessage } from "@/types/agent-api";
import type { ChatMessage } from "@/types/chat";

function createMessage(
  role: ChatMessage["role"],
  content: string,
  imageUrl?: string,
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    ...(imageUrl ? { imageUrl } : {}),
    createdAt: Date.now(),
  };
}

function toAgentMessages(messages: ChatMessage[]): AgentChatMessage[] {
  return messages.map((message) => {
    if (message.imageUrl) {
      return {
        role: message.role,
        content: `${message.content}\n\n[Generated image]: ${message.imageUrl}`,
      };
    }
    return {
      role: message.role,
      content: message.content,
    };
  });
}

export type ChatPhase =
  | "idle"
  | "contacting_agent"
  | "awaiting_payment_approval"
  | "submitting_payment"
  | "generating_response";

const PHASE_LABELS: Record<ChatPhase, string | null> = {
  idle: null,
  contacting_agent: "Contacting agent…",
  awaiting_payment_approval: "Awaiting payment approval…",
  submitting_payment: "Submitting 10 HBAR payment…",
  generating_response: "Generating AI response…",
};

const RESET_PHASES: ChatPhase[] = [
  "awaiting_payment_approval",
  "submitting_payment",
  "generating_response",
  "contacting_agent",
];

export function useChat() {
  const { connector, isConnected, accountIds } = useWallet();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isBusy = phase !== "idle";
  const statusLabel = PHASE_LABELS[phase];

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /** Reset stuck UI when wallet disconnects mid-flow */
  useEffect(() => {
    if (isConnected) return;

    abortRef.current?.abort();
    abortRef.current = null;

    if (!RESET_PHASES.includes(phase)) return;

    queueMicrotask(() => {
      setPhase("idle");
      setError(
        "Wallet disconnected. The in-progress request was cancelled — reconnect to continue.",
      );
    });
  }, [isConnected, phase]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isBusy || !isConnected || !connector) return;

    const payerAccountId = accountIds[0];
    if (!payerAccountId) {
      setError("No connected Hedera account found. Reconnect your wallet.");
      return;
    }

    const userMessage = createMessage("user", trimmed);
    const historyWithUser = [...messages, userMessage];

    setMessages(historyWithUser);
    setInput("");
    setError(null);
    setPhase("contacting_agent");

    const controller = new AbortController();
    abortRef.current = controller;

    const agentMessages = toAgentMessages(historyWithUser);

    try {
      let result = await callAgentApi(agentMessages, {
        signal: controller.signal,
      });

      if (result.kind === "payment_required") {
        if (!isConnected || controller.signal.aborted) {
          throw new Error("Wallet disconnected before payment could complete.");
        }

        const { operatorAccountId, amount } = result.data;

        setPhase("awaiting_payment_approval");

        const transactionId = await submitX402HbarPayment(
          connector,
          payerAccountId,
          operatorAccountId,
          amount,
        );

        if (controller.signal.aborted) {
          throw new Error("Request cancelled.");
        }

        setPhase("generating_response");

        result = await callAgentApi(agentMessages, {
          transactionId,
          signal: controller.signal,
        });
      } else if (result.kind === "success") {
        setPhase("generating_response");
      }

      if (result.kind === "error") {
        const detail = result.data.error ?? "Agent request failed";
        const code = result.data.code ? ` (${result.data.code})` : "";
        throw new Error(`${detail}${code}`);
      }

      if (result.kind !== "success") {
        throw new Error("Unexpected agent response.");
      }

      const assistantMessage = createMessage(
        "assistant",
        result.data.content,
        result.data.imageUrl,
      );
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      const message =
        err instanceof Error ? err.message : "Something went wrong. Try again.";
      setError(message);
    } finally {
      abortRef.current = null;
      setPhase("idle");
    }
  }, [
    accountIds,
    connector,
    input,
    isBusy,
    isConnected,
    messages,
  ]);

  return {
    messages,
    input,
    setInput,
    sendMessage,
    phase,
    statusLabel,
    error,
    clearError,
    isBusy,
  };
}
