import { randomUUID } from "crypto";
import { FastifyInstance } from "fastify";
import { assertBearerAuth } from "../auth.js";
import { ExecuteRequestSchema, ExecuteResponse, TestResult } from "../schema.js";
import { runInDocker } from "../executor/index.js";
import type { ExecuteRequest } from "../schema.js";

function normalize(text: string) {
  return text.trim();
}

const RATE_LIMIT_WINDOW_MS = Number(process.env.RUNNER_RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RUNNER_RATE_LIMIT_MAX_REQUESTS || 120);
const MAX_CONCURRENT_EXECUTIONS = Number(process.env.RUNNER_MAX_CONCURRENT_EXECUTIONS || 20);
const TEST_CASE_CONCURRENCY = Number(process.env.RUNNER_TEST_CASE_CONCURRENCY || 4);
const JOB_TTL_MS = Number(process.env.RUNNER_JOB_TTL_MS || 15 * 60 * 1000);

type JobStatus = "queued" | "running" | "completed" | "failed";

interface JobRecord {
  id: string;
  status: JobStatus;
  response?: ExecuteResponse;
  createdAt: number;
  updatedAt: number;
}

const rateBucket = new Map<string, { count: number; windowStart: number }>();
const jobs = new Map<string, JobRecord>();
let inFlightExecutions = 0;

function getRateKey(req: Parameters<typeof assertBearerAuth>[0]) {
  const ip = req.ip || "unknown";
  const auth = req.headers.authorization || "";
  return `${ip}:${auth.slice(0, 24)}`;
}

function allowRequest(req: Parameters<typeof assertBearerAuth>[0]) {
  const now = Date.now();
  const key = getRateKey(req);
  const bucket = rateBucket.get(key);

  if(!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateBucket.set(key, { count: 1, windowStart: now });
    return true;
  }

  if(bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  bucket.count += 1;
  return true;
}

function createRunId() {
  return randomUUID();
}

function cleanupJobs() {
  const now = Date.now();
  for(const [id, job] of jobs.entries()) {
    if(now - job.createdAt > JOB_TTL_MS) {
      jobs.delete(id);
    }
  }
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>) {
  const executing = new Set<Promise<void>>();

  for(let i = 0; i < items.length; i++) {
    const promise = worker(items[i], i).finally(() => executing.delete(promise));
    executing.add(promise);

    if(executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
}

async function executePayload(payload: ExecuteRequest): Promise<ExecuteResponse> {
  const start = performance.now();
  const runId = createRunId();

  if(payload.testCases?.length) {
    const results: TestResult[] = new Array(payload.testCases.length);
    let passedCount = 0;
    let truncationCount = 0;
    let firstErrorType: ExecuteResponse["errorType"] = "none";

    await runWithConcurrency(payload.testCases, Math.max(TEST_CASE_CONCURRENCY, 1), async (test, i) => {
      const run = await runInDocker({
        code: payload.code,
        language: payload.language,
        stdin: test.input,
      });

      const actual = normalize(run.output);
      const expected = normalize(test.expectedOutput);
      const passed = !run.error && actual === expected;
      if(passed) {
        passedCount++;
      }

      if(run.truncated) {
        truncationCount++;
      }

      if(firstErrorType === "none" && run.errorType !== "none") {
        firstErrorType = run.errorType;
      }

      results[i] = {
        label: test.label || `Test ${i + 1}`,
        passed,
        expected,
        actual,
      };
    });

    return {
      provider: "remote",
      runId,
      status: firstErrorType === "none" ? "completed" : "failed",
      error: firstErrorType !== "none",
      errorType: firstErrorType,
      truncated: truncationCount > 0,
      testResults: results,
      passedCount,
      totalCount: payload.testCases.length,
      executionTime: Number((performance.now() - start).toFixed(2)),
      metrics: {
        runDurationMs: Number((performance.now() - start).toFixed(2)),
        truncationCount,
      },
    };
  }

  const run = await runInDocker({
    code: payload.code,
    language: payload.language,
  });

  return {
    provider: "remote",
    runId,
    status: run.error ? "failed" : "completed",
    output: run.output || "No output.",
    error: run.error,
    errorType: run.errorType,
    truncated: run.truncated,
    executionTime: Number((performance.now() - start).toFixed(2)),
    metrics: {
      containerStartMs: run.containerStartMs,
      runDurationMs: run.runDurationMs,
      truncationCount: run.truncated ? 1 : 0,
    },
  };
}

export async function registerExecuteRoute(app: FastifyInstance) {
  app.post("/execute", async (req, reply) => {
    cleanupJobs();

    if(!assertBearerAuth(req)) {
      return reply.status(401).send({ error: "Unauthorized", errorType: "auth_error" });
    }

    if(!allowRequest(req)) {
      return reply.status(429).send({ error: "Rate limit exceeded" });
    }

    if(inFlightExecutions >= MAX_CONCURRENT_EXECUTIONS) {
      return reply.status(503).send({ error: "Runner is busy" });
    }

    const parsed = ExecuteRequestSchema.safeParse(req.body);
    if(!parsed.success) {
      return reply.status(400).send({ error: "Invalid payload", errorType: "validation_error", details: parsed.error.flatten() });
    }

    const payload = parsed.data;

    if(payload.mode === "async") {
      const jobId = createRunId();
      const job: JobRecord = {
        id: jobId,
        status: "queued",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      jobs.set(jobId, job);

      queueMicrotask(async () => {
        inFlightExecutions++;
        job.status = "running";
        job.updatedAt = Date.now();

        try {
          const result = await executePayload(payload);
          job.response = { ...result, jobId };
          job.status = result.error ? "failed" : "completed";
          job.updatedAt = Date.now();
        }
        catch(error: any) {
          job.response = {
            provider: "remote",
            runId: createRunId(),
            jobId,
            status: "failed",
            error: true,
            errorType: "infra_error",
            output: String(error?.message || "Execution failed"),
            executionTime: 0,
            metrics: { runDurationMs: 0 },
          };
          job.status = "failed";
          job.updatedAt = Date.now();
        }
        finally {
          inFlightExecutions--;
        }
      });

      return reply.status(202).send({
        provider: "remote",
        runId: createRunId(),
        jobId,
        status: "queued",
      });
    }

    inFlightExecutions++;
    try {
      const response = await executePayload(payload);
      return reply.send(response);
    }
    finally {
      inFlightExecutions--;
    }
  });

  app.get("/execute/:jobId", async (req, reply) => {
    cleanupJobs();

    if(!assertBearerAuth(req)) {
      return reply.status(401).send({ error: "Unauthorized", errorType: "auth_error" });
    }

    const params = req.params as { jobId: string };
    const job = jobs.get(params.jobId);
    if(!job) {
      return reply.status(404).send({ error: "Job not found" });
    }

    if(job.response) {
      return reply.send(job.response);
    }

    return reply.send({
      provider: "remote",
      runId: params.jobId,
      jobId: params.jobId,
      status: job.status,
    });
  });
}
