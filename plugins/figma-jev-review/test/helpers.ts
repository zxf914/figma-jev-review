import { questionId } from "../src/evaluation/questions.js";
import type { ReviewInput } from "../src/evaluation/input.js";
import { metricKeys, type Evaluation } from "../src/evaluation/types.js";
import type { JevResponse } from "../src/jev/schema.js";
import { toEvaluation } from "../src/evaluation/transform.js";

export function makeJevResponse(score = 8): JevResponse {
  const answers: JevResponse["answers"] = {};

  for (const metric of metricKeys) {
    answers[questionId(metric, "applicable")] = { type: "noul", noul: 0.95 };
    answers[questionId(metric, "score")] = {
      type: "score",
      score,
      legend: {},
      probabilities: { [String(score)]: 0.9 },
      confidence: 0.9
    };
    answers[questionId(metric, "weakness")] = {
      type: "choice",
      choice: "no_material_issue",
      probabilities: { no_material_issue: 0.9 },
      confidence: 0.9
    };
  }

  return {
    model: "jev-latest",
    answers,
    usage: { input_tokens: 100, output_tokens: 50 }
  };
}

export function makeReviewInput(): ReviewInput {
  return {
    task: "按照 Figma 节点实现用户列表页面。",
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
    acceptanceChecks: [
      {
        id: "LAY-001",
        severity: "blocking",
        requirement: "默认状态与设计稿一致。",
        status: "passed",
        evidenceKind: "dom-measurement",
        evidence: "1440x900 截图比较通过。"
      }
    ],
    visualRuns: [],
    implementation: { diff: "+export function Page() {}" }
  };
}

export function makeEvaluation(): Evaluation {
  return toEvaluation(makeJevResponse(8), {
    verdict: "passed",
    passed: ["VIS-001"],
    failed: [],
    unknown: [],
    warnings: []
  });
}
