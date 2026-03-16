"use server";

import { z } from "zod";
import { HumanMessage } from "@langchain/core/messages";
import { getAgentGraph } from "@/lib/agents/graph";
import { createLogger } from "@/lib/observability/logger";

const log = createLogger("action.sendMessage");

const SendMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  threadId: z.string().uuid().optional(),
});

export type ChatResult = {
  content: string;
  traceId: string;
};

export async function sendMessage(
  input: z.infer<typeof SendMessageSchema>
): Promise<ChatResult> {
  const parsed = SendMessageSchema.parse(input);
  const traceId = crypto.randomUUID();

  log.info("Processing message", {
    traceId,
    messageLength: parsed.message.length,
  });

  const graph = getAgentGraph();

  const result = await graph.invoke({
    messages: [new HumanMessage(parsed.message)],
  });

  const lastMessage = result.messages.at(-1);
  const content =
    typeof lastMessage?.content === "string"
      ? lastMessage.content
      : "I'm not sure how to respond to that.";

  return { content, traceId };
}
