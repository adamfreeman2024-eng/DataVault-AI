"use client";

import { useChat } from "@/hooks/useChat";

export function ChatBox() {
  const { messages, input, setInput, isSubmitting, sendMessage } = useChat();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage();
  };

  return (
    <section className="flex min-h-[28rem] flex-1 flex-col rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-200">Agent chat</h2>
        <p className="text-xs text-zinc-500">
          Messages will route through /api/agent with Hedera x402 settlement.
        </p>
      </div>

      <div
        className="flex-1 space-y-3 overflow-y-auto p-4"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Send a message to start. Connect your wallet to enable paid agent
            runs.
          </p>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                message.role === "user"
                  ? "ml-auto bg-emerald-900/40 text-emerald-50"
                  : "bg-zinc-800 text-zinc-200"
              }`}
            >
              <header className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                {message.role}
              </header>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </article>
          ))
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-zinc-800 p-4"
      >
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <input
          id="chat-input"
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask the agent…"
          disabled={isSubmitting}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isSubmitting || !input.trim()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </section>
  );
}
