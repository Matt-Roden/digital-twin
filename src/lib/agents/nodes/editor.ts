import { createVertex } from "@ai-sdk/google-vertex";
import { generateText } from "ai";
import { AIMessage } from "@langchain/core/messages";
import type { AgentStateType } from "../state";
import { createLogger } from "@/lib/observability/logger";

const log = createLogger("agent.editor");

const vertex = createVertex();

export async function editorNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const contextBlock = state.context
    .map((c) => `[${c.source}] (score: ${c.score ?? "n/a"})\n${c.content}`)
    .join("\n---\n");

  const systemPrompt = `You are the Editor agent for a professional digital twin portfolio.
Your role is to synthesize retrieved context into a polished, accurate response.

Guidelines:
- Be concise and professional. Use a developer-to-developer tone.
- When citing projects or skills, ground every claim in the provided context.
- If context is empty or an error occurred, acknowledge the gap honestly.
- Format responses in clean Markdown. Use bullet points for lists of skills/projects.
- Never fabricate experience, repos, or credentials.

${state.error ? `Warning — an upstream error occurred: ${state.error}` : ""}`;

  try {
    const { text } = await generateText({
      model: vertex("gemini-1.5-flash"),
      system: systemPrompt,
      prompt: `User intent: ${state.intent}

Retrieved context:
${contextBlock || "(no context available)"}

Conversation so far:
${state.messages.map((m) => `${m.getType()}: ${m.content}`).join("\n")}

Compose the final response:`,
    });

    log.info("Editor response generated", { length: text.length });

    return {
      messages: [new AIMessage(text)],
      next: "__end__",
      error: null,
    };
  } catch (err) {
    log.error("Editor failed", { error: String(err) });
    return {
      messages: [
        new AIMessage(
          "I encountered an issue generating a response. Please try again."
        ),
      ],
      next: "__end__",
      error: `Editor error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
