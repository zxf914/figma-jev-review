import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { PNG } from "pngjs";

import { reviewWithJev } from "../src/evaluation/review.js";
import { makeJevResponse, makeReviewInput } from "./helpers.js";

test("编排层把清理后的状态和 Figma Questions 交给 Jev", async () => {
  let capturedState: unknown;
  let capturedQuestionCount = 0;
  const evaluation = await reviewWithJev(makeReviewInput(), {
    client: {
      evaluate: async (state, questions) => {
        capturedState = state;
        capturedQuestionCount = Object.keys(questions).length;
        return makeJevResponse(8);
      }
    }
  });

  assert.equal(evaluation.verdict, "passed");
  assert.equal(capturedQuestionCount, 30);
  assert.equal("previousEvaluation" in (capturedState as Record<string, unknown>), false);
});

test("编排层保留本地阻塞门禁", async () => {
  const input = makeReviewInput();
  input.acceptanceChecks[0] = {
    ...input.acceptanceChecks[0]!,
    status: "failed"
  };

  const evaluation = await reviewWithJev(input, {
    client: { evaluate: async () => makeJevResponse(9) }
  });

  assert.equal(evaluation.verdict, "blocked");
  assert.deepEqual(evaluation.gates.failed, ["LAY-001"]);
});

test("像素差异超过阈值时覆盖调用者提交的视觉通过状态", async () => {
  const directory = await mkdtemp(join(tmpdir(), "figma-jev-review-"));
  const referencePath = join(directory, "reference.png");
  const implementationPath = join(directory, "implementation.png");
  const reference = new PNG({ width: 1, height: 1 });
  reference.data.set([0, 0, 0, 255]);
  const implementation = new PNG({ width: 1, height: 1 });
  implementation.data.set([255, 255, 255, 255]);
  await Promise.all([
    writeFile(referencePath, PNG.sync.write(reference)),
    writeFile(implementationPath, PNG.sync.write(implementation))
  ]);

  const input = makeReviewInput();
  input.acceptanceChecks[0] = {
    id: "VIS-001",
    severity: "blocking",
    requirement: "默认状态与设计稿一致。",
    status: "passed",
    evidenceKind: "visual-comparison",
    evidence: "调用者声称截图一致。"
  };
  input.visualRuns.push({
    viewport: "1x1",
    state: "default",
    screenshotPath: implementationPath,
    referenceScreenshotPath: referencePath,
    maxChangedPixelRatio: 0.2,
    dynamicMasks: [],
    comparisonSummary: "调用者声称无差异。",
    consoleErrors: []
  });

  const evaluation = await reviewWithJev(input, {
    client: { evaluate: async () => makeJevResponse(9) }
  });

  assert.equal(evaluation.verdict, "blocked");
  assert.deepEqual(evaluation.gates.failed, ["VIS-001"]);
  assert.equal(evaluation.visualComparisons?.[0]?.changedPixelRatio, 1);
});
