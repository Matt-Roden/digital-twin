import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";

/**
 * Shared state flowing through every node in the Digital Twin graph.
 *
 * Uses LangGraph's Annotation API so each field can declare its own
 * reducer — `messages` appends, everything else last-write-wins.
 */
export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  /** Which node should execute next — set by the Router. */
  next: Annotation<"researcher" | "editor" | "__end__">({
    reducer: (_prev, next) => next,
    default: () => "__end__" as const,
  }),

  /** Structured context retrieved by the Researcher. */
  context: Annotation<RetrievedContext[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  /** Current query intent extracted by the Router. */
  intent: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),

  /** Track errors for the fallback edge. */
  error: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
});

export type AgentStateType = typeof AgentState.State;

export interface RetrievedContext {
  source: "resume" | "github" | "project";
  content: string;
  score?: number;
  metadata?: Record<string, unknown>;
}
