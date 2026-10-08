import type { AcceptanceCheck } from "./input.js";
import type { GateResult, VisualComparison } from "./types.js";

export function evaluateGates(
  checks: AcceptanceCheck[],
  visualComparisons?: VisualComparison[]
): GateResult {
  const warnings: string[] = [];
  const effectiveChecks = checks.map((check) => {
    if (!isVisualCheck(check) || check.status !== "passed") return check;
    if (check.evidenceKind !== "visual-comparison") {
      warnings.push(`${check.id} 是视觉检查，但没有提供 visual-comparison 级别的证据。`);
      return { ...check, status: "unknown" as const };
    }
    if (visualComparisons === undefined) return check;

    const compared = visualComparisons.filter((comparison) => comparison.status === "compared");
    if (compared.length === 0) {
      warnings.push(`${check.id} 声称视觉通过，但没有成功读取并比较参考图与实现图。`);
      return { ...check, status: "unknown" as const };
    }
    const unacceptable = visualComparisons.find(
      (comparison) =>
        comparison.status === "dimension_mismatch" ||
        (comparison.status === "compared" &&
          comparison.changedPixelRatio !== undefined &&
          comparison.changedPixelRatio > comparison.maxChangedPixelRatio)
    );
    if (unacceptable !== undefined) {
      warnings.push(`${check.id} 的像素比较未达到设定阈值。`);
      return { ...check, status: "failed" as const };
    }
    if (visualComparisons.some((comparison) => comparison.status !== "compared")) {
      warnings.push(`${check.id} 存在未完成的视觉比较。`);
      return { ...check, status: "unknown" as const };
    }
    return check;
  });

  const passed = effectiveChecks.filter((check) => check.status === "passed").map((check) => check.id);
  const failed = effectiveChecks.filter((check) => check.status === "failed").map((check) => check.id);
  const unknown = effectiveChecks.filter((check) => check.status === "unknown").map((check) => check.id);

  const hasBlockingProblem = effectiveChecks.some(
    (check) => check.severity === "blocking" && check.status !== "passed"
  );
  const hasRequiredProblem = effectiveChecks.some(
    (check) => check.severity === "required" && check.status !== "passed"
  );

  return {
    verdict: hasBlockingProblem ? "blocked" : hasRequiredProblem ? "needs_work" : "passed",
    passed,
    failed,
    unknown,
    warnings
  };
}

function isVisualCheck(check: AcceptanceCheck): boolean {
  return check.id.toUpperCase().startsWith("VIS-") || check.evidenceKind === "visual-comparison";
}
