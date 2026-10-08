import { getMetricDefinition, metricDefinitions, questionId } from "./questions.js";
import {
  evaluationSchema,
  type Evaluation,
  type GateResult,
  type MetricEvaluation,
  type MetricKey,
  type VisualComparison
} from "./types.js";
import type { JevResponse } from "../jev/schema.js";

const meaningfulDelta = 0.75;

export class JevEvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JevEvaluationError";
  }
}

export function toEvaluation(
  response: JevResponse,
  gates: GateResult,
  previous?: Evaluation,
  options: {
    hasVisualFacts?: boolean;
    hasAssetFacts?: boolean;
    visualComparisons?: VisualComparison[];
  } = {}
): Evaluation {
  const metrics = {} as Record<MetricKey, MetricEvaluation>;

  for (const definition of metricDefinitions) {
    metrics[definition.key] = transformMetric(response, definition.key);
  }

  const priorities = metricDefinitions
    .map((definition) => ({ definition, evaluation: metrics[definition.key] }))
    .filter(
      (entry): entry is typeof entry & { evaluation: MetricEvaluation & { score: number } } =>
        entry.evaluation.applicable &&
        entry.evaluation.score !== undefined &&
        entry.evaluation.score < 8
    )
    .sort((left, right) => left.evaluation.score - right.evaluation.score)
    .slice(0, 5)
    .map(({ definition, evaluation }) => ({
      metric: definition.key,
      severity: severityFor(evaluation.score),
      reason:
        definition.weaknesses[evaluation.weakness ?? ""] ??
        `${definition.label}仍有明确改进空间。`
    }));

  const evidenceWarnings = [...gates.warnings];
  addCoreMetricWarnings(metrics, options, evidenceWarnings);

  const verdict =
    gates.verdict === "blocked"
      ? "blocked"
      : gates.verdict === "needs_work" || priorities.length > 0 || evidenceWarnings.length > 0
        ? "needs_work"
        : "passed";

  const result: Evaluation = { verdict, gates, metrics, priorities, evidenceWarnings };
  if (options.visualComparisons !== undefined) {
    result.visualComparisons = options.visualComparisons;
  }
  if (previous !== undefined) addComparison(result, previous);
  return evaluationSchema.parse(result);
}

function addCoreMetricWarnings(
  metrics: Record<MetricKey, MetricEvaluation>,
  options: { hasVisualFacts?: boolean; hasAssetFacts?: boolean },
  warnings: string[]
): void {
  if (options.hasVisualFacts) {
    addMetricWarning("visualFidelity", "视觉还原度", metrics.visualFidelity, warnings);
  }
  if (options.hasAssetFacts) {
    addMetricWarning("assetFidelity", "资源还原度", metrics.assetFidelity, warnings);
  }
}

function addMetricWarning(
  key: MetricKey,
  label: string,
  metric: MetricEvaluation,
  warnings: string[]
): void {
  if (!metric.applicable) {
    warnings.push(`${label}存在明确设计事实，但 Jev 将 ${key} 判为不适用。`);
    return;
  }
  if (metric.confidence !== undefined && metric.confidence < 0.8) {
    warnings.push(`${label}的评分置信度为 ${metric.confidence}，低于 0.8。`);
  }
}

function transformMetric(response: JevResponse, key: MetricKey): MetricEvaluation {
  const applicability = response.answers[questionId(key, "applicable")];
  const scoreAnswer = response.answers[questionId(key, "score")];
  const weakness = response.answers[questionId(key, "weakness")];

  if (applicability?.type !== "noul") {
    throw new JevEvaluationError(`Jev 缺少 ${key} 的适用性判断。`);
  }
  if (scoreAnswer?.type !== "score") {
    throw new JevEvaluationError(`Jev 缺少 ${key} 的评分。`);
  }
  if (weakness?.type !== "choice") {
    throw new JevEvaluationError(`Jev 缺少 ${key} 的主要弱项判断。`);
  }

  const applicable = applicability.noul >= 0.5;
  if (!applicable) return { applicable: false };

  const applicabilityCertainty = 0.5 + Math.abs(applicability.noul - 0.5);
  return {
    applicable: true,
    score: round(scoreAnswer.score + 1, 1),
    confidence: round(Math.min(scoreAnswer.confidence, applicabilityCertainty), 2),
    weakness: weakness.choice
  };
}

function addComparison(current: Evaluation, previous: Evaluation): void {
  const comparison: NonNullable<Evaluation["comparison"]> = [];
  const improvements: string[] = [];
  const regressions: string[] = [];

  for (const key of metricDefinitions.map((definition) => definition.key)) {
    const before = previous.metrics[key];
    const after = current.metrics[key];
    if (!before.applicable || !after.applicable || before.score === undefined || after.score === undefined) {
      continue;
    }

    const delta = round(after.score - before.score, 1);
    const direction =
      delta >= meaningfulDelta ? "improved" : delta <= -meaningfulDelta ? "regressed" : "unchanged";
    comparison.push({
      metric: key,
      previousScore: before.score,
      currentScore: after.score,
      delta,
      direction
    });

    const label = getMetricDefinition(key).label;
    if (direction === "improved") improvements.push(`${label}：${before.score} → ${after.score}`);
    if (direction === "regressed") regressions.push(`${label}：${before.score} → ${after.score}`);
  }

  current.comparison = comparison;
  current.improvements = improvements;
  current.regressions = regressions;
}

function severityFor(score: number): "low" | "medium" | "high" {
  if (score <= 3) return "high";
  if (score <= 5) return "medium";
  return "low";
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
