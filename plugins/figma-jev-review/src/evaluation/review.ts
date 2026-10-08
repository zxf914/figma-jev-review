import { evaluateGates } from "./gates.js";
import { reviewInputSchema, toJevState, type ReviewInput } from "./input.js";
import { buildFigmaQuestions, type JevQuestions } from "./questions.js";
import { toEvaluation } from "./transform.js";
import { compareVisualRuns } from "./visual.js";
import type { Evaluation } from "./types.js";
import { JevClient } from "../jev/client.js";
import type { JevResponse } from "../jev/schema.js";

export type ReviewClient = {
  evaluate(state: unknown, questions: JevQuestions): Promise<JevResponse>;
};

export type ReviewDependencies = {
  apiKey?: string;
  client?: ReviewClient;
};

export async function reviewWithJev(
  rawInput: ReviewInput,
  dependencies: ReviewDependencies = {}
): Promise<Evaluation> {
  const input = reviewInputSchema.parse(rawInput);
  const visualComparisons = await compareVisualRuns(input.visualRuns);
  const gates = evaluateGates(input.acceptanceChecks, visualComparisons);
  const client =
    dependencies.client ??
    new JevClient({ apiKey: dependencies.apiKey ?? process.env.JEV_API_KEY ?? "" });
  const response = await client.evaluate(
    { ...toJevState(input), visualComparisons },
    buildFigmaQuestions()
  );
  const visualCategories = new Set(["layout", "typography", "asset", "responsive"]);
  return toEvaluation(response, gates, input.previousEvaluation, {
    hasVisualFacts: input.figmaContext.facts.some((fact) => visualCategories.has(fact.category)),
    hasAssetFacts: input.figmaContext.facts.some((fact) => fact.category === "asset"),
    visualComparisons
  });
}
