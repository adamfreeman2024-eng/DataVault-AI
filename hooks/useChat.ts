"use client";

import { useCallback, useState } from "react";

import type { ChatMessage } from "@/types/chat";

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: Date.now(),
  };
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isSubmitting) return;

    const userMessage = createMessage("user", trimmed);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSubmitting(true);

    try {
      // Placeholder: agent + x402 flow will call /api/agent
      const assistantMessage = createMessage(
        "assistant",
        "Agent responses will appear here once /api/agent is implemented.",
      );
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsSubmitting(false);
    }
  }, [input, isSubmitting]);

  return {
    messages,
    input,
    setInput,
    isSubmitting,
    sendMessage,
  };
}
