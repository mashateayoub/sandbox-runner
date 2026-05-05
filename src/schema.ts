import { z } from "zod";

export const ErrorTypeSchema = z.enum(["none", "compile_error", "runtime_error", "timeout", "infra_error", "validation_error", "auth_error"]);
export type ErrorType = z.infer<typeof ErrorTypeSchema>;

export const ExecutionStatusSchema = z.enum(["queued", "running", "completed", "failed"]);
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

export const TestCaseSchema = z.object({
  label: z.string().min(1).max(100).optional().default(""),
  input: z.string().max(20_000).default(""),
  expectedOutput: z.string().max(20_000),
});

export const ExecuteRequestSchema = z.object({
  code: z.string().min(1).max(200_000),
  language: z.enum(["javascript", "python", "java", "go", "rust", "c", "cpp", "bash"]),
  testCases: z.array(TestCaseSchema).max(100).optional(),
  mode: z.enum(["sync", "async"]).optional().default("sync"),
});

export type ExecuteRequest = z.infer<typeof ExecuteRequestSchema>;

export interface TestResult {
  label: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export interface RunMetrics {
  queueWaitMs?: number;
  containerStartMs?: number;
  runDurationMs: number;
  truncationCount?: number;
}

export interface ExecuteResponse {
  provider: "remote";
  runId: string;
  status: ExecutionStatus;
  output?: string;
  error?: boolean;
  errorType: ErrorType;
  truncated?: boolean;
  executionTime: number;
  metrics?: RunMetrics;
  testResults?: TestResult[];
  passedCount?: number;
  totalCount?: number;
  jobId?: string;
}
