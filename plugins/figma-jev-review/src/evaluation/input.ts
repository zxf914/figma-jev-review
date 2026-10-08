import { z } from "zod";

import { evaluationSchema } from "./types.js";

const figmaFactSchema = z
  .object({
    id: z.string().min(1),
    category: z.enum(["layout", "typography", "asset", "interaction", "responsive"]),
    requirement: z.string().min(1),
    source: z.string().min(1)
  })
  .strict();

const figmaContextSchema = z
  .object({
    url: z.string().url(),
    nodeId: z.string().min(1),
    pageName: z.string().min(1),
    facts: z.array(figmaFactSchema)
  })
  .strict();

export const acceptanceCheckSchema = z
  .object({
    id: z.string().min(1),
    severity: z.enum(["blocking", "required", "scored"]),
    requirement: z.string().min(1),
    status: z.enum(["passed", "failed", "unknown"]),
    evidenceKind: z
      .enum([
        "claim",
        "source-inspection",
        "dom-measurement",
        "browser-interaction",
        "automated-test",
        "visual-comparison"
      ])
      .default("claim"),
    evidence: z.string().min(1)
  })
  .strict();

const dynamicMaskSchema = z
  .object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    width: z.number().int().positive(),
    height: z.number().int().positive()
  })
  .strict();

const visualRunSchema = z
  .object({
    viewport: z.string().min(1),
    state: z.string().min(1),
    screenshotPath: z.string().min(1).optional(),
    referenceScreenshotPath: z.string().min(1).optional(),
    maxChangedPixelRatio: z.number().min(0).max(1).default(0.2),
    dynamicMasks: z.array(dynamicMaskSchema).default([]),
    comparisonSummary: z.string().min(1),
    consoleErrors: z.array(z.string())
  })
  .strict();

const reviewFileSchema = z
  .object({
    path: z.string().min(1),
    content: z.string()
  })
  .strict();

const implementationSchema = z
  .object({
    diff: z.string().min(1).optional(),
    files: z.array(reviewFileSchema).min(1).optional()
  })
  .strict();

export const reviewInputSchema = z
  .object({
    task: z.string().min(1),
    figmaContext: figmaContextSchema,
    acceptanceChecks: z.array(acceptanceCheckSchema),
    visualRuns: z.array(visualRunSchema),
    implementation: implementationSchema,
    repositoryContext: z.string().min(1).optional(),
    previousEvaluation: evaluationSchema.optional()
  })
  .strict()
  .superRefine((input, context) => {
    const hasEvidence =
      input.figmaContext.facts.length > 0 ||
      input.acceptanceChecks.length > 0 ||
      Boolean(input.implementation.diff || input.implementation.files?.length);

    if (!hasEvidence) {
      context.addIssue({
        code: "custom",
        message: "至少提供一项可评估证据。"
      });
    }
  });

export type AcceptanceCheck = z.infer<typeof acceptanceCheckSchema>;
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export function toJevState(input: ReviewInput): Omit<ReviewInput, "previousEvaluation"> {
  const { previousEvaluation: _previousEvaluation, ...state } = input;
  return state;
}
