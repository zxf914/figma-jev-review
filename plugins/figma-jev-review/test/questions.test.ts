import assert from "node:assert/strict";
import test from "node:test";

import { buildFigmaQuestions, questionId } from "../src/evaluation/questions.js";
import { metricKeys } from "../src/evaluation/types.js";

test("为每个 Figma 指标生成适用性、评分和主要弱项问题", () => {
  const questions = buildFigmaQuestions();

  assert.equal(Object.keys(questions).length, metricKeys.length * 3);
  for (const metric of metricKeys) {
    assert.equal(questions[questionId(metric, "applicable")]?.type, "noul");
    assert.equal(questions[questionId(metric, "score")]?.type, "score");
    assert.equal(questions[questionId(metric, "weakness")]?.type, "choice");
  }
});

test("评分问题包含十个从严重问题到卓越的等级", () => {
  const question = buildFigmaQuestions()[questionId("visualFidelity", "score")];

  assert.equal(question?.type, "score");
  if (question?.type === "score") {
    assert.equal(question.criteria.length, 10);
    assert.match(question.criteria[0] ?? "", /^1 /);
    assert.match(question.criteria[9] ?? "", /^10 /);
  }
});

test("主要弱项问题始终允许选择没有实质问题", () => {
  const question = buildFigmaQuestions()[questionId("assetFidelity", "weakness")];

  assert.equal(question?.type, "choice");
  if (question?.type === "choice") {
    assert.equal(typeof question.criteria.no_material_issue, "string");
  }
});
