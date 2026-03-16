import { StateGraph } from "@langchain/langgraph";
import { AgentState } from "./state";
import { routerNode } from "./nodes/router";
import { researcherNode } from "./nodes/researcher";
import { editorNode } from "./nodes/editor";
import { createLogger } from "@/lib/observability/logger";

const log = createLogger("agent.graph");

function routeDecision(state: typeof AgentState.State) {
  log.info("Routing", { next: state.next, hasError: !!state.error });

  if (state.error && state.next !== "editor") {
    return "editor";
  }

  return state.next;
}

export function buildAgentGraph() {
  const graph = new StateGraph(AgentState)
    .addNode("router", routerNode)
    .addNode("researcher", researcherNode)
    .addNode("editor", editorNode)
    .addEdge("__start__", "router")
    .addConditionalEdges("router", routeDecision, {
      researcher: "researcher",
      editor: "editor",
      __end__: "__end__",
    })
    .addEdge("researcher", "editor")
    .addEdge("editor", "__end__");

  return graph.compile();
}

export { buildAgentGraph as buildGraph };

let _compiledGraph: ReturnType<typeof buildAgentGraph> | null = null;

export function getAgentGraph() {
  if (!_compiledGraph) {
    _compiledGraph = buildAgentGraph();
    log.info("Agent graph compiled");
  }
  return _compiledGraph;
}
