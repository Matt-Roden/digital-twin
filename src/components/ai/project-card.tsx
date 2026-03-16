import { ExternalLink, GitFork, Star } from "lucide-react";

interface ProjectCardProps {
  name: string;
  description: string;
  url: string;
  stars: number;
  forks?: number;
  language?: string;
  languages?: string[];
  demo?: string;
}

const langColors: Record<string, string> = {
  TypeScript: "bg-blue-500",
  JavaScript: "bg-yellow-400",
  Python: "bg-green-500",
  Go: "bg-cyan-500",
  Rust: "bg-orange-500",
  Java: "bg-red-500",
};

export function ProjectCard({
  name,
  description,
  url,
  stars,
  forks,
  language,
  languages,
  demo,
}: ProjectCardProps) {
  return (
    <div className="group rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-900 hover:underline dark:text-neutral-100"
          >
            {name}
            <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
          <p className="mt-1 text-sm leading-snug text-neutral-600 dark:text-neutral-400">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-500">
        {language && (
          <span className="flex items-center gap-1">
            <span
              className={`inline-block h-2 w-2 rounded-full ${langColors[language] ?? "bg-neutral-400"}`}
            />
            {language}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3" />
          {stars.toLocaleString()}
        </span>
        {forks !== undefined && (
          <span className="flex items-center gap-1">
            <GitFork className="h-3 w-3" />
            {forks.toLocaleString()}
          </span>
        )}
        {demo && (
          <a
            href={demo}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-blue-600 hover:underline dark:text-blue-400"
          >
            Live Demo
          </a>
        )}
      </div>

      {languages && languages.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {languages.map((lang) => (
            <span
              key={lang}
              className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
            >
              {lang}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
