"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { callAgentApi } from "@/lib/agent/client-api";
import { submitX402HbarPayment } from "@/lib/wallet/x402-payment";
import { useWallet } from "@/contexts/WalletContext";
import type { AgentChatMessage } from "@/types/agent-api";
import type { ChatMessage } from "@/types/chat";

/** Soft UI unlock — fetch keeps running so a late 200 can still append the reply. */
export const GENERATION_TIMEOUT_MS = 60_000;

export const GENERATION_TIMEOUT_MESSAGE =
  "Response took too long, but task completed";

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
      const imageNote = message.imageUrl.startsWith("data:")
        ? "[Generated image attached in the UI]"
        : `[Generated image]: ${message.imageUrl}`;
      return {
        role: message.role,
        content: `${message.content}\n\n${imageNote}`,
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

/** Phases where the agent HTTP request may run long (exclude wallet approval). */
export const AGENT_REQUEST_TIMEOUT_PHASES: ChatPhase[] = [
  "contacting_agent",
  "generating_response",
];

export function useChat() {
  const { connector, isConnected, accountIds } = useWallet();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const softTimedOutRef = useRef(false);

  const isBusy = phase !== "idle";
  const statusLabel = PHASE_LABELS[phase];

  const clearGenerationTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Unblocks the UI without aborting fetch — late responses can still append messages.
   */
  const softUnlockUi = useCallback((errorMessage?: string) => {
    softTimedOutRef.current = true;
    setPhase("idle");
    if (errorMessage) {
      setError(errorMessage);
    }
  }, []);

  /** Hard cancel (wallet disconnect, unmount). */
  const cancelRequest = useCallback(
    (options?: { errorMessage?: string }) => {
      clearGenerationTimeout();
      abortRef.current?.abort();
      abortRef.current = null;
      softTimedOutRef.current = false;
      setPhase("idle");
      if (options?.errorMessage) {
        setError(options.errorMessage);
      }
    },
    [clearGenerationTimeout],
  );

  const startGenerationTimeout = useCallback(() => {
    clearGenerationTimeout();
    softTimedOutRef.current = false;

    timeoutRef.current = setTimeout(() => {
      softUnlockUi(GENERATION_TIMEOUT_MESSAGE);
    }, GENERATION_TIMEOUT_MS);
  }, [clearGenerationTimeout, softUnlockUi]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /** Reset stuck UI when wallet disconnects mid-flow */
  useEffect(() => {
    if (isConnected) return;

    if (!RESET_PHASES.includes(phase)) return;

    queueMicrotask(() => {
      cancelRequest({
        errorMessage:
          "Wallet disconnected. The in-progress request was cancelled — reconnect to continue.",
      });
    });
  }, [isConnected, phase, cancelRequest]);

  useEffect(() => {
    return () => {
      clearGenerationTimeout();
      abortRef.current?.abort();
    };
  }, [clearGenerationTimeout]);

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
    softTimedOutRef.current = false;
    setPhase("contacting_agent");

    const controller = new AbortController();
    abortRef.current = controller;

    const agentMessages = toAgentMessages(historyWithUser);
    const hadSoftTimeout = () => softTimedOutRef.current;

    try {
      startGenerationTimeout();

      let result = await callAgentApi(agentMessages, {
        signal: controller.signal,
      });

      if (result.kind === "payment_required") {
        clearGenerationTimeout();

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
        startGenerationTimeout();

        result = await callAgentApi(agentMessages, {
          transactionId,
          signal: controller.signal,
        });
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

      if (hadSoftTimeout()) {
        setError(null);
      }
    } catch (err) {
      if (controller.signal.aborted && !hadSoftTimeout()) {
        return;
      }

      if (hadSoftTimeout()) {
        return;
      }

      const message =
        err instanceof Error ? err.message : "Something went wrong. Try again.";
      setError(message);
    } finally {
      clearGenerationTimeout();
      abortRef.current = null;
      setPhase("idle");
      softTimedOutRef.current = false;
    }
  }, [
    accountIds,
    connector,
    input,
    isBusy,
    isConnected,
    messages,
    clearGenerationTimeout,
    startGenerationTimeout,
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
    softUnlockUi,
    agentRequestTimeoutPhases: AGENT_REQUEST_TIMEOUT_PHASES,
  };
}
