import assert from "node:assert/strict";
import test from "node:test";

import { reviewInputSchema } from "../src/evaluation/input.js";

const baseInput = {
  task: "按照指定 Figma 节点实现用户列表页面。",
  figmaContext: {
    url: "https://www.figma.com/design/example/file?node-id=12-34",
    nodeId: "12:34",
    pageName: "用户列表",
    facts: [
      {
        id: "LAY-001",
        category: "layout",
        requirement: "主内容区宽度为 960px。",
        source: "Figma 节点 12:34"
      }
    ]
  },
  acceptanceChecks: [],
  visualRuns: [],
  implementation: {}
};

test("接受包含任务和 Figma 事实的最小评审输入", () => {
  const parsed = reviewInputSchema.parse(baseInput);
  assert.equal(parsed.figmaContext.nodeId, "12:34");
});

test("拒绝没有任何可评估证据的输入", () => {
  const result = reviewInputSchema.safeParse({
    ...baseInput,
    figmaContext: { ...baseInput.figmaContext, facts: [] }
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues[0]?.message ?? "", /至少提供一项可评估证据/);
  }
});

test("拒绝未知字段和非法枚举值", () => {
  const result = reviewInputSchema.safeParse({
    ...baseInput,
    unknownField: true,
    acceptanceChecks: [
      {
        id: "VIS-001",
        severity: "critical",
        requirement: "页面匹配设计稿。",
        status: "passed",
        evidence: "截图比对通过。"
      }
    ]
  });

  assert.equal(result.success, false);
});
