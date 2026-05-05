# Recap: Last Conversation Changes

## Scope
Implemented a substantial upgrade of `sandbox-runner` focused on security hardening, execution controls, richer API responses, and async job support.

## Files Updated
- `.env.example`
- `src/auth.ts`
- `src/executor/dockerExecutor.ts`
- `src/routes/execute.ts`
- `src/schema.ts`
- `src/server.ts`
- `test/contract.test.ts`
- `test/security.test.ts`
- `tsconfig.json`

## Key Changes

### 1. Authentication Hardening
- Replaced plain token comparison with constant-time comparison.
- Added token rotation support via `RUNNER_API_TOKEN_PREVIOUS`.
- File: `src/auth.ts`.

### 2. API Contract Expansion
- Added execution `mode` in request: `sync | async`.
- Added richer response fields: `runId`, `jobId`, `status`, `errorType`, `truncated`, and `metrics`.
- Added error/status enums (`ErrorTypeSchema`, `ExecutionStatusSchema`).
- File: `src/schema.ts`.

### 3. Docker Execution Hardening + Classification
- Added stricter runtime flags:
  - `--cap-drop ALL`
  - `--user 10001:10001`
  - `--ulimit nofile`
  - `--ulimit nproc`
- Added structured error classification:
  - `none`, `compile_error`, `runtime_error`, `timeout`, `infra_error`.
- Added truncation metadata and timing fields to executor results.
- File: `src/executor/dockerExecutor.ts`.

### 4. Execute Route Rework
- Added request rate limiting.
- Added max concurrent execution guard.
- Added bounded parallel execution for test cases while preserving deterministic result order.
- Added async flow:
  - `POST /execute` with `mode: "async"` returns `202` + `jobId`.
  - `GET /execute/:jobId` polls job state/result.
- Added in-memory job store with TTL cleanup.
- File: `src/routes/execute.ts`.

### 5. Capabilities Endpoint Enhancements
- `/capabilities` now reports:
  - `modes` (`sync`, `async`)
  - new operational limits (rate/concurrency/test-case parallelism).
- File: `src/server.ts`.

### 6. Environment Configuration Additions
- Added new env vars:
  - `RUNNER_API_TOKEN_PREVIOUS`
  - `RUNNER_MAX_CONCURRENT_EXECUTIONS`
  - `RUNNER_TEST_CASE_CONCURRENCY`
  - `RUNNER_RATE_LIMIT_WINDOW_MS`
  - `RUNNER_RATE_LIMIT_MAX_REQUESTS`
  - `RUNNER_MAX_NOFILE`
  - `RUNNER_MAX_NPROC`
  - `RUNNER_JOB_TTL_MS`
- File: `.env.example`.

### 7. Tests and TS Config
- Replaced placeholder security tests with real auth/rotation checks.
- Extended contract tests to include async mode validation.
- Fixed TypeScript config `rootDir` to include tests cleanly.
- Files: `test/security.test.ts`, `test/contract.test.ts`, `tsconfig.json`.

## Validation Status From Last Conversation
- TypeScript compile succeeded using local `tsc` binary.
- Vitest execution was blocked by environment-level `spawn EPERM` issue.

## Not Yet Implemented (Mentioned as Next Steps)
- Persist async jobs beyond memory (e.g., Redis/Postgres).
- Add full integration tests for async endpoints.
- Instrument real `containerStartMs` instead of placeholder value.
