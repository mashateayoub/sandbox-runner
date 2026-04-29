import { describe, it, expect } from "vitest";
import { ExecuteRequestSchema } from "../src/schema.js";

describe("contract schema", () => {
  it("accepts valid payload", () => {
    const parsed = ExecuteRequestSchema.safeParse({
      code: "print(1)",
      language: "python",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid language", () => {
    const parsed = ExecuteRequestSchema.safeParse({
      code: "x",
      language: "ruby",
    });
    expect(parsed.success).toBe(false);
  });
});
