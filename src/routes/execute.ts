import { FastifyInstance } from "fastify";
import { assertBearerAuth } from "../auth.js";
import { ExecuteRequestSchema, ExecuteResponse, TestResult } from "../schema.js";
import { runInDocker } from "../executor/index.js";

function normalize(text: string) {
  return text.trim();
}

export async function registerExecuteRoute(app: FastifyInstance) {
  app.post("/execute", async (req, reply) => {
    if(!assertBearerAuth(req)) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const parsed = ExecuteRequestSchema.safeParse(req.body);
    if(!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const payload = parsed.data;
    const start = performance.now();

    if(payload.testCases?.length) {
      const results: TestResult[] = [];
      let passedCount = 0;

      for(let i = 0; i < payload.testCases.length; i++) {
        const test = payload.testCases[i];
        const run = await runInDocker({
          code: payload.code,
          language: payload.language,
          stdin: test.input,
        });

        const actual = normalize(run.output);
        const expected = normalize(test.expectedOutput);
        const passed = !run.error && actual === expected;
        if(passed) passedCount++;

        results.push({
          label: test.label || `Test ${i + 1}`,
          passed,
          expected,
          actual,
        });
      }

      const response: ExecuteResponse = {
        provider: "remote",
        testResults: results,
        passedCount,
        totalCount: payload.testCases.length,
        executionTime: Number((performance.now() - start).toFixed(2)),
      };

      return reply.send(response);
    }

    const run = await runInDocker({
      code: payload.code,
      language: payload.language,
    });

    const response: ExecuteResponse = {
      provider: "remote",
      output: run.output || "No output.",
      error: run.error,
      executionTime: Number((performance.now() - start).toFixed(2)),
    };

    return reply.send(response);
  });
}
