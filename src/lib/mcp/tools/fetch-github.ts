import { z } from "zod";
import { Octokit } from "@octokit/rest";
import { createLogger } from "@/lib/observability/logger";
import type { RetrievedContext } from "@/lib/agents/state";

const log = createLogger("tool.fetch_github");

export const fetchGitHubSchema = z.object({
  query: z.string().min(1).max(200),
  maxRepos: z.number().int().min(1).max(30).default(10),
});

export type FetchGitHubInput = z.infer<typeof fetchGitHubSchema>;

function getOctokit() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured");
  return new Octokit({ auth: token });
}

export async function fetchGitHub(
  query: string,
  options?: Partial<Omit<FetchGitHubInput, "query">>
): Promise<RetrievedContext[]> {
  const input = fetchGitHubSchema.parse({ query, ...options });
  const username = process.env.GITHUB_USERNAME;

  if (!username) {
    log.warn("GITHUB_USERNAME not set, skipping");
    return [];
  }

  log.info("Fetching repos", { username, query: input.query });

  const octokit = getOctokit();

  const { data: repos } = await octokit.repos.listForUser({
    username,
    sort: "updated",
    per_page: input.maxRepos,
    type: "owner",
  });

  const keywords = input.query.toLowerCase().split(/\s+/);

  const relevant = repos.filter((repo) => {
    const haystack =
      `${repo.name} ${repo.description ?? ""} ${repo.language ?? ""}`.toLowerCase();
    return keywords.some((kw) => haystack.includes(kw));
  });

  const targetRepos = relevant.length > 0 ? relevant : repos.slice(0, 5);

  const results: RetrievedContext[] = await Promise.all(
    targetRepos.map(async (repo) => {
      let languages: Record<string, number> = {};
      try {
        const { data } = await octokit.repos.listLanguages({
          owner: username,
          repo: repo.name,
        });
        languages = data;
      } catch {
        log.warn("Failed to fetch languages", { repo: repo.name });
      }

      const topLangs = Object.entries(languages)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([lang]) => lang);

      const content = [
        `**${repo.name}**${repo.fork ? " (fork)" : ""}`,
        repo.description ?? "No description",
        `Stars: ${repo.stargazers_count} | Forks: ${repo.forks_count}`,
        `Languages: ${topLangs.join(", ") || "N/A"}`,
        `Updated: ${repo.updated_at}`,
        repo.homepage ? `Demo: ${repo.homepage}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      return {
        content,
        source: "github" as const,
        score: 1.0,
      };
    })
  );

  log.info("Fetch complete", { repoCount: results.length });
  return results;
}

export const fetchGitHubToolDefinition = {
  name: "fetch_github" as const,
  description:
    "Fetches live repository stats from GitHub for the portfolio owner.",
  parameters: fetchGitHubSchema,
  execute: async (input: FetchGitHubInput) =>
    fetchGitHub(input.query, { maxRepos: input.maxRepos }),
};
