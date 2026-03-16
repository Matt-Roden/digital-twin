import {
  searchResume,
  searchResumeToolDefinition,
  type SearchResumeInput,
} from "./tools/search-resume";
import {
  fetchGitHub,
  fetchGitHubToolDefinition,
  type FetchGitHubInput,
} from "./tools/fetch-github";
import { createLogger } from "@/lib/observability/logger";

const log = createLogger("mcp.registry");

export const toolRegistry = {
  search_resume: searchResumeToolDefinition,
  fetch_github: fetchGitHubToolDefinition,
} as const;

export type ToolName = keyof typeof toolRegistry;

export async function executeTool(name: ToolName, args: unknown) {
  const tool = toolRegistry[name];
  if (!tool) throw new Error(`Unknown tool: ${name}`);

  log.info("Executing tool", { tool: name });
  const validated = tool.parameters.parse(args);
  const result = await tool.execute(validated as SearchResumeInput & FetchGitHubInput);

  log.info("Tool complete", {
    tool: name,
    resultCount: Array.isArray(result) ? result.length : 1,
  });
  return result;
}

export function listTools() {
  return Object.values(toolRegistry).map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}
