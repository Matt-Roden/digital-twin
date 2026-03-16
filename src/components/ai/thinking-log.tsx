"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";

export interface ThinkingStep {
  node: string;
  action: string;
  duration?: number;
  status: "running" | "done" | "error";
}

interface ThinkingLogProps {
  steps: ThinkingStep[];
}

export function ThinkingLog({ steps }: ThinkingLogProps) {
  const [expanded, setExpanded] = useState(false);

  if (steps.length === 0) return null;

  const isRunning = steps.some((s) => s.status === "running");

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        <Brain className={`h-3.5 w-3.5 ${isRunning ? "animate-pulse text-blue-500" : ""}`} />
        <span className="font-medium">
          {isRunning ? "Thinking..." : `Completed in ${steps.length} steps`}
        </span>
        {expanded ? (
          <ChevronDown className="ml-auto h-3 w-3" />
        ) : (
          <ChevronRight className="ml-auto h-3 w-3" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-neutral-200 px-3 py-2 dark:border-neutral-800">
          <ol className="space-y-1.5">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <StatusDot status={step.status} />
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-neutral-500">{step.node}</span>
                  <span className="mx-1 text-neutral-400">&rarr;</span>
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {step.action}
                  </span>
                </div>
                {step.duration !== undefined && (
                  <span className="shrink-0 tabular-nums text-neutral-400">
                    {step.duration}ms
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: ThinkingStep["status"] }) {
  const colors = {
    running: "bg-blue-500 animate-pulse",
    done: "bg-emerald-500",
    error: "bg-red-500",
  };

  return (
    <span
      className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${colors[status]}`}
    />
  );
}
