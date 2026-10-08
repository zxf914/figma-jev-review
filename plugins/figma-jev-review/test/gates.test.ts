import assert from "node:assert/strict";
import test from "node:test";

import type { AcceptanceCheck } from "../src/evaluation/input.js";
import { evaluateGates } from "../src/evaluation/gates.js";

const check = (
  id: string,
  severity: AcceptanceCheck["severity"],
  status: AcceptanceCheck["status"],
  evidenceKind: AcceptanceCheck["evidenceKind"] = "automated-test"
): AcceptanceCheck => ({
  id,
  severity,
  status,
  evidenceKind,
  requirement: `${id} 的要求`,
  evidence: `${id} 的证据`
});

test("失败或未知的阻塞项使结果为 blocked", () => {
  const failed = evaluateGates([check("VIS-001", "blocking", "failed")]);
  const unknown = evaluateGates([check("AST-001", "blocking", "unknown")]);

  assert.equal(failed.verdict, "blocked");
  assert.deepEqual(failed.failed, ["VIS-001"]);
  assert.equal(unknown.verdict, "blocked");
  assert.deepEqual(unknown.unknown, ["AST-001"]);
});

test("没有阻塞项但 required 失败时结果为 needs_work", () => {
  const result = evaluateGates([
    check("LAY-001", "blocking", "passed"),
    check("INT-001", "required", "failed")
  ]);

  assert.equal(result.verdict, "needs_work");
  assert.deepEqual(result.failed, ["INT-001"]);
});

test("required 未知时结果为 needs_work", () => {
  const result = evaluateGates([check("INT-001", "required", "unknown")]);

  assert.equal(result.verdict, "needs_work");
  assert.deepEqual(result.unknown, ["INT-001"]);
});

test("视觉检查不能仅凭文字声明通过", () => {
  const result = evaluateGates([
    check("VIS-001", "blocking", "passed", "claim")
  ]);

  assert.equal(result.verdict, "blocked");
  assert.deepEqual(result.passed, []);
  assert.deepEqual(result.unknown, ["VIS-001"]);
  assert.match(result.warnings[0] ?? "", /visual-comparison/);
});

test("通过的门禁和 scored 失败不阻塞本地门禁", () => {
  const result = evaluateGates([
    check("VIS-001", "blocking", "passed", "visual-comparison"),
    check("QUA-001", "scored", "failed")
  ]);

  assert.equal(result.verdict, "passed");
  assert.deepEqual(result.passed, ["VIS-001"]);
  assert.deepEqual(result.failed, ["QUA-001"]);
});
