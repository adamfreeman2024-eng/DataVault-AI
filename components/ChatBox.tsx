"use client";

import { useEffect, useRef } from "react";

import { useWallet } from "@/contexts/WalletContext";
import {
  GENERATION_TIMEOUT_MS,
  GENERATION_TIMEOUT_MESSAGE,
  useChat,
} from "@/hooks/useChat";
import { buildMessageParts, type MessageContentPart } from "@/lib/chat/parse-message-content";
import { X402_PREMIUM_HBAR_AMOUNT } from "@/lib/constants";

function ChatImage({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="mt-2 w-full overflow-hidden rounded-lg border border-zinc-600/50 bg-zinc-950/60">
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="mt-2 h-auto max-h-96 w-full max-w-full rounded-lg object-contain"
        />
      </a>
    </figure>
  );
}

function MessageContent({
  content,
  imageUrl,
}: {
  content: string;
  imageUrl?: string;
}) {
  const parts = buildMessageParts(content, imageUrl);

  return (
    <div className="space-y-2">
      {parts.map((part, index) => (
        <MessagePartBlock key={`${part.type}-${index}`} part={part} />
      ))}
    </div>
  );
}

function MessagePartBlock({ part }: { part: MessageContentPart }) {
  if (part.type === "image") {
    return <ChatImage src={part.url} alt={part.alt} />;
  }

  return <p className="whitespace-pre-wrap">{part.value}</p>;
}

function MessageBubble({
  role,
  content,
  imageUrl,
}: {
  role: "user" | "assistant" | "system";
  content: string;
  imageUrl?: string;
}) {
  const isUser = role === "user";

  return (
    <article
      className={`flex max-w-[90%] flex-col gap-1 ${isUser ? "ml-auto items-end" : "items-start"}`}
    >
      <span
        className={`text-[10px] font-semibold uppercase tracking-widest ${
          isUser ? "text-emerald-500/80" : "text-zinc-500"
        }`}
      >
        {isUser ? "You" : role === "assistant" ? "Agent" : "System"}
      </span>
      <div
        className={`max-w-full rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-br-md bg-gradient-to-br from-emerald-600/90 to-emerald-700/90 text-white"
            : "rounded-bl-md border border-zinc-700/60 bg-zinc-800/80 text-zinc-100"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <MessageContent
            content={content}
            {...(imageUrl ? { imageUrl } : {})}
          />
        )}
      </div>
    </article>
  );
}

function StatusBanner({ label }: { label: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-cyan-500/25 bg-cyan-950/40 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
      <p className="text-sm text-cyan-100">{label}</p>
    </div>
  );
}

export function ChatBox() {
  const { isConnected } = useWallet();
  const {
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
    agentRequestTimeoutPhases,
  } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, statusLabel, error]);

  /** Catch-all: unblock UI if a request never settles (e.g. hung fetch). */
  useEffect(() => {
    if (!agentRequestTimeoutPhases.includes(phase)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      softUnlockUi(GENERATION_TIMEOUT_MESSAGE);
    }, GENERATION_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [agentRequestTimeoutPhases, phase, softUnlockUi]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isConnected || isBusy) return;
    void sendMessage();
  };

  const canSend = isConnected && !isBusy && input.trim().length > 0;

  return (
    <section className="flex min-h-[32rem] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-sm">
      <div className="border-b border-zinc-800/80 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Agent workspace
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              DeepSeek chat · DALL·E 3 images · {X402_PREMIUM_HBAR_AMOUNT} HBAR
              premium gate
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
              isConnected
                ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                : "bg-zinc-800 text-zinc-500 ring-1 ring-zinc-700"
            }`}
          >
            {isConnected ? "Wallet linked" : "Wallet required"}
          </span>
        </div>
      </div>

      <div
        className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 py-5 scrollbar-thin"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-2xl border border-dashed border-zinc-700/80 bg-zinc-950/50 px-6 py-8">
              <p className="text-sm font-medium text-zinc-300">
                No messages yet
              </p>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-zinc-500">
                {isConnected
                  ? "Ask for analysis or say “generate an image of…” — premium tasks settle 10 HBAR first."
                  : "Connect your Hedera wallet via WalletConnect to compose and send agent tasks."}
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              role={message.role}
              content={message.content}
              {...(message.imageUrl ? { imageUrl: message.imageUrl } : {})}
            />
          ))
        )}

        {statusLabel ? <StatusBanner label={statusLabel} /> : null}

        {error ? (
          <div
            className="rounded-xl border border-red-500/30 bg-red-950/50 px-4 py-3"
            role="alert"
          >
            <p className="text-sm font-medium text-red-200">Request failed</p>
            <p className="mt-1 text-sm text-red-300/90">{error}</p>
            <button
              type="button"
              onClick={clearError}
              className="mt-2 text-xs font-medium text-red-200 underline underline-offset-2 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <div ref={bottomRef} className="h-px shrink-0" aria-hidden />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-zinc-800/80 bg-zinc-950/50 p-4 sm:p-5"
      >
        <label htmlFor="chat-input" className="sr-only">
          Task description
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <textarea
            id="chat-input"
            rows={3}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canSend) void sendMessage();
              }
            }}
            placeholder={
              isConnected
                ? "e.g. Generate an image of a futuristic Hedera vault in space…"
                : "Connect wallet to enable task submission…"
            }
            disabled={!isConnected || isBusy}
            className="min-h-[4.5rem] flex-1 resize-none rounded-xl border border-zinc-700/80 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!canSend}
            title={
              !isConnected
                ? "Connect your wallet to send"
                : isBusy
                  ? "Please wait for the current request"
                  : !input.trim()
                    ? "Enter a message"
                    : undefined
            }
            className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:from-emerald-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 disabled:shadow-none sm:min-w-[7rem]"
          >
            {isBusy ? "Working…" : "Send"}
          </button>
        </div>
        {!isConnected && (
          <p className="mt-2 text-center text-xs text-amber-500/90 sm:text-left">
            WalletConnect session required before submitting tasks.
          </p>
        )}
      </form>
    </section>
  );
}
