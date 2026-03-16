import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { HumanMessage } from "@langchain/core/messages";
import { getAgentGraph } from "@/lib/agents/graph";
import { createLogger } from "@/lib/observability/logger";

const log = createLogger("api.chat");

const requestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(2000, "Message too long"),
  threadId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const traceId = crypto.randomUUID();

  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { message } = parsed.data;
    log.info("Chat request", { traceId, messageLength: message.length });

    const graph = getAgentGraph();

    const result = await graph.invoke({
      messages: [new HumanMessage(message)],
    });

    const lastMessage = result.messages[result.messages.length - 1];
    const content =
      typeof lastMessage?.content === "string"
        ? lastMessage.content
        : "I couldn't generate a response. Please try again.";

    log.info("Chat complete", { traceId });

    return NextResponse.json({ content, traceId });
  } catch (err) {
    log.error("Chat error", { traceId, error: String(err) });

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: err.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", traceId },
      { status: 500 }
    );
  }
}
