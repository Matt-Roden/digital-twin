import type { AgentStateType, RetrievedContext } from "../state";
import { searchResume } from "@/lib/mcp/tools/search-resume";
import { fetchGitHub } from "@/lib/mcp/tools/fetch-github";
import { createLogger } from "@/lib/observability/logger";

const log = createLogger("agent.researcher");

export async function researcherNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const results: RetrievedContext[] = [];

  try {
    const [resumeResults, githubResults] = await Promise.allSettled([
      searchResume(state.intent),
      fetchGitHub(state.intent),
    ]);

    if (resumeResults.status === "fulfilled") {
      results.push(...resumeResults.value);
      log.info("Resume search completed", { count: resumeResults.value.length });
    } else {
      log.warn("Resume search failed", { error: String(resumeResults.reason) });
    }

    if (githubResults.status === "fulfilled") {
      results.push(...githubResults.value);
      log.info("GitHub fetch completed", { count: githubResults.value.length });
    } else {
      log.warn("GitHub fetch failed", { error: String(githubResults.reason) });
    }

    if (results.length === 0) {
      return {
        context: [],
        next: "editor",
        error: "No results found from any data source.",
      };
    }

    return {
      context: results,
      next: "editor",
      error: null,
    };
  } catch (err) {
    log.error("Researcher node failed", { error: String(err) });
    return {
      context: [],
      next: "editor",
      error: `Researcher error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
