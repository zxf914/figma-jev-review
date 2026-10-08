import assert from "node:assert/strict";
import test from "node:test";

import { JevApiError, JevClient } from "../src/jev/client.js";
import { buildFigmaQuestions } from "../src/evaluation/questions.js";
import { makeJevResponse } from "./helpers.js";

test("使用 Bearer 密钥向 Jev 发送状态和自定义 Questions", async () => {
  let capturedRequest: RequestInit | undefined;
  const client = new JevClient({
    apiKey: "secret-key",
    fetchImplementation: async (_url, init) => {
      capturedRequest = init;
      return new Response(JSON.stringify(makeJevResponse()), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  });

  const questions = buildFigmaQuestions();
  const result = await client.evaluate({ task: "实现页面" }, questions);

  assert.equal(result.model, "jev-latest");
  assert.equal(new Headers(capturedRequest?.headers).get("Authorization"), "Bearer secret-key");
  const body = JSON.parse(String(capturedRequest?.body)) as Record<string, unknown>;
  assert.deepEqual(body.state, { task: "实现页面" });
  assert.equal(body.model, "jev-latest");
  assert.deepEqual(body.questions, questions);
});

test("拒绝空的 JEV_API_KEY", () => {
  assert.throws(() => new JevClient({ apiKey: "  " }), /JEV_API_KEY/);
});

test("429 后重试并返回成功结果", async () => {
  let attempts = 0;
  const delays: number[] = [];
  const client = new JevClient({
    apiKey: "secret-key",
    maxRetries: 1,
    sleep: async (milliseconds) => {
      delays.push(milliseconds);
    },
    fetchImplementation: async () => {
      attempts += 1;
      if (attempts === 1) return new Response("rate limited", { status: 429 });
      return new Response(JSON.stringify(makeJevResponse()), { status: 200 });
    }
  });

  await client.evaluate({ task: "实现页面" }, buildFigmaQuestions());

  assert.equal(attempts, 2);
  assert.equal(delays.length, 1);
});

test("拒绝不符合响应 Schema 的 Jev 结果", async () => {
  const client = new JevClient({
    apiKey: "secret-key",
    fetchImplementation: async () => new Response(JSON.stringify({ model: "jev-latest" }), { status: 200 })
  });

  await assert.rejects(
    client.evaluate({ task: "实现页面" }, buildFigmaQuestions()),
    (error: unknown) => error instanceof JevApiError && /响应结构/.test(error.message)
  );
});
