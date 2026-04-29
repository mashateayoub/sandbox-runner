import { z } from "zod";

export const TestCaseSchema = z.object({
  label: z.string().min(1).max(100).optional().default(""),
  input: z.string().max(20_000).default(""),
  expectedOutput: z.string().max(20_000),
});

export const ExecuteRequestSchema = z.object({
  code: z.string().min(1).max(200_000),
  language: z.enum(["javascript", "python", "java", "go", "rust", "c", "cpp", "bash"]),
  testCases: z.array(TestCaseSchema).max(100).optional(),
});

export type ExecuteRequest = z.infer<typeof ExecuteRequestSchema>;

export interface TestResult {
  label: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export interface ExecuteResponse {
  output?: string;
  error?: boolean;
  executionTime: number;
  provider: "remote";
  testResults?: TestResult[];
  passedCount?: number;
  totalCount?: number;
}
