import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { z } from "zod";

import { reviewInputSchema } from "../evaluation/input.js";
import { reviewWithJev } from "../evaluation/review.js";
import { evaluationSchema, type Evaluation } from "../evaluation/types.js";

const serverInstructions = [
  "Figma Jev Review evaluates explicit implementation evidence; it does not read Figma or repositories automatically.",
  "Collect Figma facts, browser screenshots, DOM measurements, console results, tests, and focused code context before calling figma_jev_review.",
  "For visual checks, provide readable absolute PNG paths in referenceScreenshotPath and screenshotPath. The plugin calculates dimensions, RGB MAE, and changed-pixel ratio before calling Jev.",
  "A caller-authored claim cannot pass a VIS check. Required unknown checks, low-confidence core visual metrics, and inapplicable visual metrics with relevant Figma facts produce needs_work or blocked.",
  "Split visual acceptance into concrete regions or concerns and record at least three observed differences instead of one broad visual claim.",
  "Use the first call as a baseline, inspect weak dimensions yourself, make the smallest justified improvement, validate again, and pass the prior result unchanged as previousEvaluation.",
  "Never send secrets, credentials, environment files, private keys, generated output, vendored code, or unrelated repository content.",
  "Do not game scores with speculative architecture, unnecessary abstraction, meaningless tests, or behavior outside the user's requirements."
].join(" ");

export type ReviewHandler = (input: z.infer<typeof reviewInputSchema>) => Promise<Evaluation>;

export function createMcpServer(review: ReviewHandler = reviewWithJev): McpServer {
  const server = new McpServer(
    { name: "figma-jev-review", version: "0.1.0" },
    { instructions: serverInstructions }
  );

  server.registerTool(
    "figma_jev_review",
    {
      title: "Figma implementation review with Jev",
      description:
        "Evaluate a Figma implementation from explicit design facts, typed acceptance evidence, readable reference and implementation PNGs, focused code, and validation results. The tool performs deterministic PNG comparison and evidence gates before combining them with Jev metric scores. Failed or unknown blocking checks always produce a blocked verdict; required unknown checks and low-confidence core visual metrics produce needs_work. Call after local validation, then rescore meaningful improvements with previousEvaluation.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true
      },
      inputSchema: reviewInputSchema,
      outputSchema: evaluationSchema
    },
    async (input) => {
      try {
        const evaluation = await review(input);
        return {
          content: [{ type: "text", text: JSON.stringify(evaluation) }],
          structuredContent: evaluation
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Figma Jev Review 执行失败。";
        return {
          isError: true,
          content: [{ type: "text", text: message }]
        };
      }
    }
  );

  return server;
}

export async function runStdioServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await createMcpServer().connect(transport);
}
