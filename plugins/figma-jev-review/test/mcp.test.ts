import assert from "node:assert/strict";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createMcpServer } from "../src/mcp/server.js";
import { makeEvaluation, makeReviewInput } from "./helpers.js";

test("MCP 只暴露一个可返回结构化结果的 figma_jev_review 工具", async () => {
  const expected = makeEvaluation();
  const server = createMcpServer(async () => expected);
  const client = new Client({ name: "figma-jev-review-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  try {
    const listed = await client.listTools();
    assert.deepEqual(listed.tools.map((tool) => tool.name), ["figma_jev_review"]);

    const result = await client.callTool({
      name: "figma_jev_review",
      arguments: makeReviewInput()
    });

    assert.equal(result.isError, undefined);
    assert.deepEqual(result.structuredContent, expected);
  } finally {
    await client.close();
    await server.close();
  }
});
