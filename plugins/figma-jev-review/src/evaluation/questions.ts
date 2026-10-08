import type { MetricKey } from "./types.js";

export type JevNoulQuestion = {
  type: "noul";
  instructions: string;
  criteria: { true: string; false: string };
};

export type JevScoreQuestion = {
  type: "score";
  instructions: string;
  criteria: string[];
};

export type JevChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
};

export type JevQuestion = JevNoulQuestion | JevScoreQuestion | JevChoiceQuestion;
export type JevQuestions = Record<string, JevQuestion>;

type MetricDefinition = {
  key: MetricKey;
  label: string;
  guidance: string;
  weaknesses: Record<string, string>;
};

const scoreLevels = [
  "1 严重且根本性不符合要求，当前结果不可用。",
  "2 主要问题占主导，需要大幅返工。",
  "3 存在严重缺口，关键结果不可靠。",
  "4 有明显问题，实质影响交付质量。",
  "5 多项重要问题仍未解决。",
  "6 达到基本可用水平，但仍有明确改进空间。",
  "7 整体可靠，仅有少量具体弱项。",
  "8 表现较强，只剩轻微且有意义的改进。",
  "9 与当前要求高度匹配，几乎没有实质问题。",
  "10 卓越且证据充分，已没有合理的改进空间；应极少使用。"
];

export const metricDefinitions: readonly MetricDefinition[] = [
  {
    key: "requirementFit",
    label: "需求符合度",
    guidance: "判断明确页面目标、实现边界、验收约束和禁止事项是否完整满足。",
    weaknesses: {
      missing_requirement: "明确要求缺失或实现不完整。",
      incorrect_behavior: "实现行为与要求不一致。",
      invalid_assumption: "实现依赖没有证据支持的假设。"
    }
  },
  {
    key: "visualFidelity",
    label: "视觉还原度",
    guidance: "仅依据提供的截图比较、DOM 测量和 Figma 事实判断布局、字体、颜色与层级；不得假装读取本地截图。",
    weaknesses: {
      layout_mismatch: "布局、尺寸或间距存在重要偏差。",
      typography_mismatch: "字体、字重、行高或文本布局存在重要偏差。",
      insufficient_evidence: "视觉证据不足以支持当前结论。"
    }
  },
  {
    key: "assetFidelity",
    label: "资源还原度",
    guidance: "判断原始资源、本地引用、裁切、透明度、混合、遮罩和层级是否符合取证事实。",
    weaknesses: {
      missing_asset: "要求使用的原始资源缺失。",
      approximate_replacement: "使用了未经授权的近似替代。",
      composition_mismatch: "裁切、透明度、缩放或层级合成不正确。"
    }
  },
  {
    key: "interactionCompleteness",
    label: "交互完整性",
    guidance: "判断设计和项目要求中的状态、入口、反馈、边界与联动是否完整实现。",
    weaknesses: {
      missing_state: "重要状态没有实现或验证。",
      broken_transition: "状态转换或区域联动不正确。",
      missing_feedback: "交互缺少必要反馈或错误状态。"
    }
  },
  {
    key: "responsiveBehavior",
    label: "响应式表现",
    guidance: "判断规定视口、设备、安全区域、溢出与重排策略是否得到证据支持。",
    weaknesses: {
      viewport_failure: "至少一个规定视口出现布局失败。",
      overflow: "文本或控件发生未处理的溢出。",
      missing_device_evidence: "缺少要求设备或视口的验证证据。"
    }
  },
  {
    key: "assumptionDiscipline",
    label: "假设约束",
    guidance: "判断实现是否只采用 Figma、项目现有实现或用户确认支持的决定。",
    weaknesses: {
      invented_design: "实现擅自补造视觉设计。",
      invented_behavior: "实现擅自增加业务行为或交互。",
      hidden_uncertainty: "不确定项被包装成确定要求。"
    }
  },
  {
    key: "projectConsistency",
    label: "项目一致性",
    guidance: "判断组件、设计令牌、目录、数据层和代码约定是否与目标项目一致。",
    weaknesses: {
      missed_reuse: "没有复用合适的现有组件或能力。",
      competing_pattern: "引入了与项目现有做法竞争的新模式。",
      convention_mismatch: "目录、命名或实现方式偏离项目规范。"
    }
  },
  {
    key: "implementationQuality",
    label: "实现质量",
    guidance: "判断代码职责、可读性、耦合、变更成本和抽象是否与页面复杂度相称。",
    weaknesses: {
      mixed_responsibilities: "无关职责耦合在同一边界中。",
      unnecessary_complexity: "控制流或抽象比问题本身更复杂。",
      brittle_structure: "小改动可能引发大范围修改。"
    }
  },
  {
    key: "validationQuality",
    label: "验证质量",
    guidance: "判断测试、截图、测量、控制台检查和边界状态证据是否足以证明要求。",
    weaknesses: {
      missing_coverage: "关键要求没有对应验证。",
      weak_assertion: "检查执行了流程但没有证明重要结果。",
      stale_evidence: "验证证据没有覆盖当前实现。"
    }
  },
  {
    key: "reliability",
    label: "可靠性",
    guidance: "判断错误处理、异步状态、清理、加载失败和运行时错误是否得到合理处理。",
    weaknesses: {
      runtime_error: "存在控制台或运行时错误。",
      cleanup_failure: "组件生命周期结束后仍可能留下资源或状态。",
      invalid_state: "错误或边界状态可能产生不一致结果。"
    }
  }
];

export function questionId(
  metric: MetricKey,
  kind: "applicable" | "score" | "weakness"
): string {
  return `${metric}_${kind}`;
}

export function buildFigmaQuestions(): JevQuestions {
  const questions: JevQuestions = {};

  for (const definition of metricDefinitions) {
    questions[questionId(definition.key, "applicable")] = {
      type: "noul",
      instructions: `提供的状态是否包含足够证据评估${definition.label}？证据不足时回答否。${definition.guidance}`,
      criteria: {
        true: "该维度相关且有足够证据进行可靠判断。",
        false: "该维度不相关或当前证据不足。"
      }
    };
    questions[questionId(definition.key, "score")] = {
      type: "score",
      instructions: `按照当前任务和证据评估${definition.label}。${definition.guidance}`,
      criteria: [...scoreLevels]
    };
    questions[questionId(definition.key, "weakness")] = {
      type: "choice",
      instructions: `选择${definition.label}中证据最充分且影响最大的单一弱项；没有实质问题时选择 no_material_issue。`,
      criteria: {
        no_material_issue: "提供的证据没有显示实质问题。",
        ...definition.weaknesses
      }
    };
  }

  return questions;
}

export function getMetricDefinition(key: MetricKey): MetricDefinition {
  const definition = metricDefinitions.find((candidate) => candidate.key === key);
  if (definition === undefined) throw new Error(`未知指标：${key}`);
  return definition;
}
