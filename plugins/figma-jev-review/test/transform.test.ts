import assert from "node:assert/strict";
import test from "node:test";

import { toEvaluation } from "../src/evaluation/transform.js";
import { questionId } from "../src/evaluation/questions.js";
import type { GateResult } from "../src/evaluation/types.js";
import { makeJevResponse } from "./helpers.js";

const passedGates: GateResult = {
  verdict: "passed",
  passed: ["VIS-001"],
  failed: [],
  unknown: [],
  warnings: []
};

test("把 Jev 的 0 至 9 分转换为 1 至 10 分", () => {
  const evaluation = toEvaluation(makeJevResponse(8), passedGates);

  assert.equal(evaluation.metrics.requirementFit.score, 9);
  assert.equal(evaluation.metrics.requirementFit.confidence, 0.9);
  assert.equal(evaluation.verdict, "passed");
});

test("阻塞门禁始终优先于高分", () => {
  const evaluation = toEvaluation(makeJevResponse(9), {
    verdict: "blocked",
    passed: [],
    failed: ["AST-001"],
    unknown: [],
    warnings: []
  });

  assert.equal(evaluation.verdict, "blocked");
});

test("低于 8 分的适用指标产生优先项和 needs_work", () => {
  const response = makeJevResponse(9);
  response.answers[questionId("requirementFit", "score")] = {
    type: "score",
    score: 5,
    legend: {},
    probabilities: { "5": 0.9 },
    confidence: 0.9
  };
  response.answers[questionId("requirementFit", "weakness")] = {
    type: "choice",
    choice: "missing_requirement",
    probabilities: { missing_requirement: 0.9 },
    confidence: 0.9
  };

  const evaluation = toEvaluation(response, passedGates);

  assert.equal(evaluation.verdict, "needs_work");
  assert.equal(evaluation.priorities[0]?.metric, "requirementFit");
  assert.match(evaluation.priorities[0]?.reason ?? "", /要求/);
});

test("视觉事实存在时视觉指标低置信度不能通过", () => {
  const response = makeJevResponse(9);
  response.answers[questionId("visualFidelity", "score")] = {
    type: "score",
    score: 9,
    legend: {},
    probabilities: { "9": 0.6 },
    confidence: 0.6
  };

  const evaluation = toEvaluation(response, passedGates, undefined, { hasVisualFacts: true });

  assert.equal(evaluation.verdict, "needs_work");
  assert.match(evaluation.evidenceWarnings[0] ?? "", /置信度/);
});

test("视觉事实存在时 visualFidelity 不适用不能通过", () => {
  const response = makeJevResponse(9);
  response.answers[questionId("visualFidelity", "applicable")] = { type: "noul", noul: 0.1 };

  const evaluation = toEvaluation(response, passedGates, undefined, { hasVisualFacts: true });

  assert.equal(evaluation.verdict, "needs_work");
  assert.match(evaluation.evidenceWarnings[0] ?? "", /不适用/);
});

test("比较前后评审并列出有意义的提升", () => {
  const previous = toEvaluation(makeJevResponse(5), passedGates);
  const current = toEvaluation(makeJevResponse(7), passedGates, previous);

  assert.equal(current.comparison?.[0]?.direction, "improved");
  assert.equal(current.comparison?.[0]?.delta, 2);
  assert.match(current.improvements?.[0] ?? "", /→/);
  assert.deepEqual(current.regressions, []);
});
