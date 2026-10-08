import { z } from "zod";

export const metricKeys = [
  "requirementFit",
  "visualFidelity",
  "assetFidelity",
  "interactionCompleteness",
  "responsiveBehavior",
  "assumptionDiscipline",
  "projectConsistency",
  "implementationQuality",
  "validationQuality",
  "reliability"
] as const;

export type MetricKey = (typeof metricKeys)[number];

export const gateResultSchema = z
  .object({
    verdict: z.enum(["passed", "needs_work", "blocked"]),
    passed: z.array(z.string()),
    failed: z.array(z.string()),
    unknown: z.array(z.string()),
    warnings: z.array(z.string())
  })
  .strict();

export const visualComparisonSchema = z
  .object({
    viewport: z.string(),
    state: z.string(),
    referenceScreenshotPath: z.string().optional(),
    screenshotPath: z.string().optional(),
    status: z.enum(["compared", "missing_input", "dimension_mismatch", "error"]),
    referenceWidth: z.number().int().positive().optional(),
    referenceHeight: z.number().int().positive().optional(),
    implementationWidth: z.number().int().positive().optional(),
    implementationHeight: z.number().int().positive().optional(),
    mae: z.number().min(0).max(255).optional(),
    changedPixelRatio: z.number().min(0).max(1).optional(),
    maxChangedPixelRatio: z.number().min(0).max(1),
    maskedPixelCount: z.number().int().nonnegative(),
    message: z.string().optional()
  })
  .strict();

export const metricEvaluationSchema = z
  .object({
    applicable: z.boolean(),
    score: z.number().min(1).max(10).optional(),
    confidence: z.number().min(0).max(1).optional(),
    weakness: z.string().optional()
  })
  .strict()
  .superRefine((metric, context) => {
    if (metric.applicable && (metric.score === undefined || metric.confidence === undefined)) {
      context.addIssue({
        code: "custom",
        message: "适用的指标必须包含分数和置信度。"
      });
    }
    if (!metric.applicable && (metric.score !== undefined || metric.confidence !== undefined)) {
      context.addIssue({
        code: "custom",
        message: "不适用的指标不能包含分数或置信度。"
      });
    }
  });

const metricsShape = Object.fromEntries(
  metricKeys.map((key) => [key, metricEvaluationSchema])
) as Record<MetricKey, typeof metricEvaluationSchema>;

export const evaluationSchema = z
  .object({
    verdict: z.enum(["passed", "needs_work", "blocked"]),
    gates: gateResultSchema,
    metrics: z.object(metricsShape).strict(),
    priorities: z.array(
      z
        .object({
          metric: z.enum(metricKeys),
          severity: z.enum(["low", "medium", "high"]),
          reason: z.string()
        })
        .strict()
    ),
    evidenceWarnings: z.array(z.string()),
    visualComparisons: z.array(visualComparisonSchema).optional(),
    improvements: z.array(z.string()).optional(),
    regressions: z.array(z.string()).optional(),
    comparison: z
      .array(
        z
          .object({
            metric: z.enum(metricKeys),
            previousScore: z.number().min(1).max(10),
            currentScore: z.number().min(1).max(10),
            delta: z.number().min(-9).max(9),
            direction: z.enum(["improved", "regressed", "unchanged"])
          })
          .strict()
      )
      .optional()
  })
  .strict();

export type GateResult = z.infer<typeof gateResultSchema>;
export type VisualComparison = z.infer<typeof visualComparisonSchema>;
export type MetricEvaluation = z.infer<typeof metricEvaluationSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;
