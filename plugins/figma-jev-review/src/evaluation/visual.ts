import { readFile } from "node:fs/promises";

import { PNG } from "pngjs";

import type { ReviewInput } from "./input.js";
import type { VisualComparison } from "./types.js";

type VisualRun = ReviewInput["visualRuns"][number];
type Mask = VisualRun["dynamicMasks"][number];
type PngComparison = Omit<
  VisualComparison,
  "viewport" | "state" | "referenceScreenshotPath" | "screenshotPath" | "maxChangedPixelRatio"
>;

const changedChannelThreshold = 24;

export async function compareVisualRuns(runs: VisualRun[]): Promise<VisualComparison[]> {
  return Promise.all(
    runs.map(async (run) => ({
      viewport: run.viewport,
      state: run.state,
      ...(run.referenceScreenshotPath === undefined
        ? {}
        : { referenceScreenshotPath: run.referenceScreenshotPath }),
      ...(run.screenshotPath === undefined ? {} : { screenshotPath: run.screenshotPath }),
      maxChangedPixelRatio: run.maxChangedPixelRatio,
      ...(await compareOptionalRun(run))
    }))
  );
}

async function compareOptionalRun(run: VisualRun): Promise<PngComparison> {
  if (run.referenceScreenshotPath === undefined || run.screenshotPath === undefined) {
    return {
      status: "missing_input",
      maskedPixelCount: 0,
      message: "视觉比较需要 referenceScreenshotPath 和 screenshotPath。"
    };
  }
  return comparePngFiles(run.referenceScreenshotPath, run.screenshotPath, run.dynamicMasks);
}

export async function comparePngFiles(
  referencePath: string,
  implementationPath: string,
  masks: Mask[] = []
): Promise<PngComparison> {
  try {
    const [referenceBuffer, implementationBuffer] = await Promise.all([
      readFile(referencePath),
      readFile(implementationPath)
    ]);
    const reference = PNG.sync.read(referenceBuffer);
    const implementation = PNG.sync.read(implementationBuffer);

    if (reference.width !== implementation.width || reference.height !== implementation.height) {
      return {
        status: "dimension_mismatch",
        referenceWidth: reference.width,
        referenceHeight: reference.height,
        implementationWidth: implementation.width,
        implementationHeight: implementation.height,
        maskedPixelCount: 0,
        message: `图片尺寸不一致：参考图 ${reference.width}x${reference.height}，实现图 ${implementation.width}x${implementation.height}。`
      };
    }

    let absoluteError = 0;
    let changedPixels = 0;
    let comparedPixels = 0;
    let maskedPixelCount = 0;
    for (let y = 0; y < reference.height; y += 1) {
      for (let x = 0; x < reference.width; x += 1) {
        if (masks.some((mask) => contains(mask, x, y))) {
          maskedPixelCount += 1;
          continue;
        }
        const offset = (y * reference.width + x) * 4;
        let maxDifference = 0;
        for (let channel = 0; channel < 3; channel += 1) {
          const difference = Math.abs(
            (reference.data[offset + channel] ?? 0) - (implementation.data[offset + channel] ?? 0)
          );
          absoluteError += difference;
          maxDifference = Math.max(maxDifference, difference);
        }
        if (maxDifference > changedChannelThreshold) changedPixels += 1;
        comparedPixels += 1;
      }
    }

    if (comparedPixels === 0) {
      return {
        status: "error",
        referenceWidth: reference.width,
        referenceHeight: reference.height,
        implementationWidth: implementation.width,
        implementationHeight: implementation.height,
        maskedPixelCount,
        message: "动态区域遮罩覆盖了全部像素，无法进行视觉比较。"
      };
    }

    return {
      status: "compared",
      referenceWidth: reference.width,
      referenceHeight: reference.height,
      implementationWidth: implementation.width,
      implementationHeight: implementation.height,
      mae: round(absoluteError / (comparedPixels * 3), 2),
      changedPixelRatio: round(changedPixels / comparedPixels, 4),
      maskedPixelCount
    };
  } catch (error) {
    return {
      status: "error",
      maskedPixelCount: 0,
      message: error instanceof Error ? `无法读取或解析 PNG：${error.message}` : "无法读取或解析 PNG。"
    };
  }
}

function contains(mask: Mask, x: number, y: number): boolean {
  return x >= mask.x && x < mask.x + mask.width && y >= mask.y && y < mask.y + mask.height;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
