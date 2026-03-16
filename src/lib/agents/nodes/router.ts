import { createVertex } from "@ai-sdk/google-vertex";
import { generateObject } from "ai";
import { z } from "zod";
import type { AgentStateType } from "../state";
import { createLogger } from "@/lib/observability/logger";

const log = createLogger("agent.router");

const routeSchema = z.object({
  intent: z
    .string()
    .describe("A concise summary of what the user is asking about."),
  next: z
    .enum(["researcher", "editor", "__end__"])
    .describe(
      "researcher: needs data lookup. editor: has enough context to compose a response. __end__: greeting or off-topic."
    ),
});

const vertex = createVertex();

export async function routerNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];

  try {
    const { object } = await generateObject({
      model: vertex("gemini-1.5-flash") as Parameters<typeof generateObject>[0]["model"],
      schema: routeSchema,
      system: `You are a routing agent for a professional portfolio digital twin.
Classify the user's message and decide the next step:
- "researcher" if the query requires looking up resume data, GitHub repos, or project details.
- "editor" if there is already sufficient context in the conversation to compose a final answer.
- "__end__" if the message is a greeting, farewell, or off-topic.`,
      prompt: `User message: ${lastMessage.content}
Existing context items: ${state.context.length}`,
    });

    log.info("Route decided", { intent: object.intent, next: object.next });

    return {
      intent: object.intent,
      next: object.next,
    };
  } catch (err) {
    log.error("Router failed, falling back to editor", {
      error: String(err),
    });
    return {
      intent: "fallback",
      next: "editor",
      error: `Router error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
