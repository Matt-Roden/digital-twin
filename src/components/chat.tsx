"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { ArrowUp } from "lucide-react";
import { ThinkingLog, type ThinkingStep } from "@/components/ai/thinking-log";
import { clsx } from "clsx";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) throw new Error("Request failed");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const thinkingSteps: ThinkingStep[] = isLoading
    ? [{ node: "router", action: "Classifying intent...", status: "running" }]
    : [];

  return (
    <div className="flex flex-1 flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-6 overflow-y-auto pb-32 pt-6"
      >
        {messages.length === 0 && (
          <div className="pt-20 text-center">
            <p className="text-sm text-neutral-500">
              Start a conversation to explore the portfolio.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                "What tech stack do you specialize in?",
                "Show me your recent projects",
                "Tell me about your experience",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setInput(suggestion)}
                  className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-300"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={clsx(
              "text-sm leading-relaxed",
              msg.role === "user" ? "text-neutral-100" : "text-neutral-400"
            )}
          >
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-neutral-600">
              {msg.role === "user" ? "you" : "twin"}
            </span>
            {msg.content}
          </div>
        ))}

        {isLoading && <ThinkingLog steps={thinkingSteps} />}
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 border-t border-neutral-800 bg-neutral-950/80 px-0 pb-6 pt-4 backdrop-blur-xl"
      >
        <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 focus-within:border-neutral-600">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about my experience..."
            className="flex-1 bg-transparent text-sm text-neutral-100 placeholder-neutral-600 outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-900 transition-opacity disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
