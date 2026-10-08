import type { JevQuestions } from "../evaluation/questions.js";
import { jevResponseSchema, type JevResponse } from "./schema.js";

export const JEV_API_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
export const JEV_MODEL = "jev-latest";

type FetchImplementation = typeof fetch;
type SleepImplementation = (milliseconds: number) => Promise<void>;

export type JevClientOptions = {
  apiKey: string;
  fetchImplementation?: FetchImplementation;
  sleep?: SleepImplementation;
  timeoutMilliseconds?: number;
  maxRetries?: number;
};

export class JevApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "JevApiError";
    if (status !== undefined) this.status = status;
  }
}

export class JevClient {
  readonly #apiKey: string;
  readonly #fetch: FetchImplementation;
  readonly #sleep: SleepImplementation;
  readonly #timeoutMilliseconds: number;
  readonly #maxRetries: number;

  constructor(options: JevClientOptions) {
    const apiKey = options.apiKey.trim();
    if (!apiKey) throw new JevApiError("未设置 JEV_API_KEY。请在启动 Codex 前配置该环境变量。");

    this.#apiKey = apiKey;
    this.#fetch = options.fetchImplementation ?? fetch;
    this.#sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.#timeoutMilliseconds = options.timeoutMilliseconds ?? 30_000;
    this.#maxRetries = options.maxRetries ?? 2;
  }

  async evaluate(state: unknown, questions: JevQuestions): Promise<JevResponse> {
    for (let attempt = 0; attempt <= this.#maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.#timeoutMilliseconds);

      try {
        const response = await this.#fetch(JEV_API_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.#apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ state, model: JEV_MODEL, questions }),
          signal: controller.signal
        });

        if (response.ok) {
          const rawResponse: unknown = await response.json();
          const parsed = jevResponseSchema.safeParse(rawResponse);
          if (!parsed.success) {
            throw new JevApiError("Jev 返回的响应结构不符合预期。");
          }
          return parsed.data;
        }

        if (isRetryable(response.status) && attempt < this.#maxRetries) {
          await this.#sleep(retryDelay(response.headers.get("retry-after"), attempt));
          continue;
        }

        throw await apiStatusError(response);
      } catch (error) {
        if (error instanceof JevApiError) throw error;
        if (isAbortError(error)) {
          throw new JevApiError(`Jev 在 ${this.#timeoutMilliseconds}ms 内没有响应。`);
        }
        throw new JevApiError("无法连接 Jev API，请检查网络后重试。");
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new JevApiError("Jev 请求在重试后仍然失败。");
  }
}

function isRetryable(status: number): boolean {
  return status === 429 || status === 529 || status >= 500;
}

async function apiStatusError(response: Response): Promise<JevApiError> {
  const status = response.status;
  const errorType = await readErrorType(response);

  if (status === 400 && errorType === "max_tokens_exceeded") {
    return new JevApiError("Jev 输入超出限制，请减少无关上下文或拆分评审。", status);
  }
  if (status === 401) return new JevApiError("Jev 拒绝了 JEV_API_KEY，请检查密钥。", status);
  if (status === 422) return new JevApiError("Jev 拒绝了评审状态或 Questions。", status);
  if (status === 429) return new JevApiError("Jev 在重试后仍然限流。", status);
  if (status === 529) return new JevApiError("Jev 在重试后仍然过载。", status);
  return new JevApiError(`Jev API 请求失败，HTTP ${status}。`, status);
}

async function readErrorType(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (!isRecord(body) || !isRecord(body.detail)) return undefined;
    return typeof body.detail.error_type === "string" ? body.detail.error_type : undefined;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function retryDelay(retryAfter: string | null, attempt: number): number {
  if (retryAfter !== null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1_000, 5_000);
  }
  return 250 * 2 ** attempt;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
