/**
 * Evaluation Suite — Faithfulness & Grounding Tests
 *
 * A lightweight eval harness that validates the agent's outputs
 * are grounded in retrieved context (no hallucination).
 *
 * Usage:
 *   pnpm evals
 */

import { createVertex } from "@ai-sdk/google-vertex";
import { generateObject } from "ai";
import { z } from "zod";

interface EvalCase {
  name: string;
  query: string;
  context: string;
  agentResponse: string;
  expectedFaithful: boolean;
}

const cases: EvalCase[] = [
  {
    name: "Grounded claim — should pass",
    query: "What languages does the candidate know?",
    context: "The candidate is proficient in TypeScript, Python, and Go.",
    agentResponse:
      "Based on their resume, the candidate is proficient in TypeScript, Python, and Go.",
    expectedFaithful: true,
  },
  {
    name: "Hallucinated claim — should fail",
    query: "What languages does the candidate know?",
    context: "The candidate is proficient in TypeScript, Python, and Go.",
    agentResponse:
      "The candidate is an expert in Rust, Haskell, and C++ with 10 years of experience in each.",
    expectedFaithful: false,
  },
  {
    name: "Partial grounding — edge case",
    query: "Tell me about their experience.",
    context:
      "5 years at Acme Corp as a Senior Engineer. Led a team of 4.",
    agentResponse:
      "They spent 5 years at Acme Corp as a Senior Engineer where they led a team of 4 and architected a microservices platform.",
    expectedFaithful: false,
  },
];

const faithfulnessSchema = z.object({
  faithful: z
    .boolean()
    .describe("Whether every claim in the response is supported by the context."),
  reasoning: z
    .string()
    .describe("Step-by-step explanation of which claims are or are not grounded."),
  unsupportedClaims: z
    .array(z.string())
    .describe("List of specific claims not found in the context."),
});

const vertex = createVertex();
const model = vertex("gemini-1.5-flash") as Parameters<typeof generateObject>[0]["model"];

async function judgeFaithfulness(
  context: string,
  response: string
): Promise<z.infer<typeof faithfulnessSchema>> {
  const { object } = await generateObject({
    model,
    schema: faithfulnessSchema,
    system: `You are a strict factual grounding evaluator.
Given a context and a response, determine if EVERY factual claim in the response is directly supported by the context.
A claim that adds information not present in the context is NOT faithful, even if it might be true.`,
    prompt: `Context:\n${context}\n\nResponse to evaluate:\n${response}`,
  });
  return object;
}

async function main() {
  console.log("\nDigital Twin — Faithfulness Evaluation\n");
  console.log("-".repeat(50));

  let passed = 0;
  let failed = 0;

  for (const tc of cases) {
    process.stdout.write(`  ${tc.name}... `);

    try {
      const result = await judgeFaithfulness(tc.context, tc.agentResponse);

      const correct = result.faithful === tc.expectedFaithful;
      if (correct) {
        passed++;
        console.log("PASS");
      } else {
        failed++;
        console.log("FAIL");
        console.log(`    Expected faithful=${tc.expectedFaithful}, got=${result.faithful}`);
        console.log(`    Reasoning: ${result.reasoning}`);
        if (result.unsupportedClaims.length > 0) {
          console.log(`    Unsupported: ${result.unsupportedClaims.join("; ")}`);
        }
      }
    } catch (err) {
      failed++;
      console.log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log("-".repeat(50));
  console.log(`\n  Results: ${passed} passed, ${failed} failed, ${cases.length} total\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
