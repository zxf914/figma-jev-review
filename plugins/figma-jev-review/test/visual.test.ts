import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { PNG } from "pngjs";

import { comparePngFiles } from "../src/evaluation/visual.js";

async function writePng(path: string, width: number, height: number, rgb: [number, number, number]) {
  const png = new PNG({ width, height });
  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data[offset] = rgb[0];
    png.data[offset + 1] = rgb[1];
    png.data[offset + 2] = rgb[2];
    png.data[offset + 3] = 255;
  }
  await writeFile(path, PNG.sync.write(png));
}

test("计算 PNG 的 MAE 和变化像素比例", async () => {
  const directory = await mkdtemp(join(tmpdir(), "figma-jev-"));
  const referencePath = join(directory, "reference.png");
  const implementationPath = join(directory, "implementation.png");
  await writePng(referencePath, 2, 1, [0, 0, 0]);
  await writePng(implementationPath, 2, 1, [255, 0, 0]);

  const result = await comparePngFiles(referencePath, implementationPath);

  assert.equal(result.status, "compared");
  assert.equal(result.referenceWidth, 2);
  assert.equal(result.referenceHeight, 1);
  assert.equal(result.mae, 85);
  assert.equal(result.changedPixelRatio, 1);
});

test("拒绝比较尺寸不同的 PNG", async () => {
  const directory = await mkdtemp(join(tmpdir(), "figma-jev-"));
  const referencePath = join(directory, "reference.png");
  const implementationPath = join(directory, "implementation.png");
  await writePng(referencePath, 2, 1, [0, 0, 0]);
  await writePng(implementationPath, 1, 1, [0, 0, 0]);

  const result = await comparePngFiles(referencePath, implementationPath);

  assert.equal(result.status, "dimension_mismatch");
  assert.match(result.message ?? "", /尺寸/);
});
