import { describe, it, expect, beforeEach } from "vitest";
import { assertBearerAuth } from "../src/auth.js";

describe("security baseline", () => {
  beforeEach(() => {
    delete process.env.RUNNER_API_TOKEN;
    delete process.env.RUNNER_API_TOKEN_PREVIOUS;
  });

  it("rejects missing bearer token", () => {
    process.env.RUNNER_API_TOKEN = "token-1";
    const ok = assertBearerAuth({ headers: {} } as any);
    expect(ok).toBe(false);
  });

  it("accepts primary token", () => {
    process.env.RUNNER_API_TOKEN = "token-1";
    const ok = assertBearerAuth({ headers: { authorization: "Bearer token-1" } } as any);
    expect(ok).toBe(true);
  });

  it("accepts previous token during rotation", () => {
    process.env.RUNNER_API_TOKEN = "token-2";
    process.env.RUNNER_API_TOKEN_PREVIOUS = "token-1";
    const ok = assertBearerAuth({ headers: { authorization: "Bearer token-1" } } as any);
    expect(ok).toBe(true);
  });

  it("rejects wrong token", () => {
    process.env.RUNNER_API_TOKEN = "token-1";
    const ok = assertBearerAuth({ headers: { authorization: "Bearer token-x" } } as any);
    expect(ok).toBe(false);
  });
});
