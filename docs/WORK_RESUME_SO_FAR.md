# Sandbox Runner - Full Resume of Work So Far

## Scope
This document summarizes what has been implemented so far in the `sandbox-runner` project, based on the current codebase and project files.

## Project Goal
Build a remote, isolated code-execution service for Proctor so code can run outside the main Next.js app process with strict runtime constraints.

## Current Architecture
- Runtime: Node.js + TypeScript (`type: module`)
- HTTP server: Fastify
- Validation: Zod
- Execution backend: per-request Docker container
- Tests: Vitest

## Implemented Service Surface

### 1. Health + Capability Endpoints
- `GET /health`
  - returns service liveness (`ok: true`, service name).
- `GET /capabilities`
  - returns supported languages and runtime limits derived from env vars:
    - timeout
    - memory
    - cpu
    - pids
    - max output bytes

### 2. Auth
- Bearer-token authorization is enforced for execution route.
- `RUNNER_API_TOKEN` is required at runtime.
- Missing/invalid bearer token on `/execute` returns `401 Unauthorized`.

### 3. Execute Endpoint
- `POST /execute`
- Accepts payload:
  - `code`
  - `language` (`javascript`, `python`, `java`, `go`, `rust`, `c`, `cpp`, `bash`)
  - optional `testCases`
- Two modes are implemented:
  - Direct execution mode: returns merged output, error flag, execution time.
  - Test-case mode: executes once per test case with `stdin`, compares normalized output to expected, and returns `testResults`, `passedCount`, `totalCount`.

### 4. Schema Contract
- Request schema is enforced with Zod (`ExecuteRequestSchema`).
- Input bounds are implemented:
  - code length cap
  - test case count cap
  - per-case input/output size caps
- Invalid payloads return `400` with structured validation details.

## Docker Execution Engine

### 1. Language Command Mapping
Implemented command/image mapping with dedicated runtime images:
- `runner-node:1`
- `runner-python:1`
- `runner-java:1`
- `runner-go:1`
- `runner-rust:1`
- `runner-c-cpp:1`
- `runner-bash:1`

### 2. Isolation and Limits
Each run is isolated with Docker flags:
- `--rm`
- `--network none`
- `--cpus`
- `--memory`
- `--pids-limit`
- `--read-only`
- `--security-opt no-new-privileges:true`
- `--tmpfs /tmp:rw,exec,size=64m`

### 3. Execution Flow
- Source code and optional stdin are base64-encoded and passed as env vars.
- Runtime script decodes files inside container (`/tmp/work`) and executes language-specific command.
- Output is bounded with max-buffer handling and truncation marker (`[truncated]`) when needed.

## Container/Image Setup
- Docker setup exists for each language under `docker/images/*`.
- Project-level `docker-compose.yml` + `Dockerfile` scaffold local startup and build flow.
- `.env.example` and README provide environment and launch guidance.

## Integration with Main Proctor App
Documented environment contract for remote execution provider:
- `EXECUTION_PROVIDER=remote`
- `EXECUTION_REMOTE_URL=http://localhost:8080/execute`
- `EXECUTION_REMOTE_TOKEN=<RUNNER_API_TOKEN>`

This establishes the handshake expected by the main Proctor application.

## Test Coverage Status
Current tests exist but are baseline-level:
- contract test validates schema acceptance/rejection paths.
- security test is currently a placeholder.

## Security Posture Achieved So Far
Implemented baseline hardening:
- process isolation per execution (fresh container)
- no container networking
- constrained CPU/RAM/PIDs
- read-only root filesystem
- no-new-privileges
- bounded output size and request shape validation

## Known Gaps / Next Logical Work
The project is a solid scaffold but not yet internet-exposed production-hard. Main remaining work:
- queueing and concurrency control
- robust rate limiting / abuse controls
- stronger security tests beyond placeholders
- richer observability (audit logs, execution traces, metrics)
- finer policy controls per language/user/exam context
- error taxonomy and client-facing error codes

## Key Files Implemented
- `src/server.ts`
- `src/routes/execute.ts`
- `src/auth.ts`
- `src/schema.ts`
- `src/executor/commands.ts`
- `src/executor/dockerExecutor.ts`
- `test/contract.test.ts`
- `test/security.test.ts`
- `docker/images/*`
- `docker-compose.yml`
- `README.md`

## Net Outcome
A working remote execution service scaffold now exists with authenticated execution, multi-language support, Docker isolation constraints, request contract validation, and basic tests. It is ready for controlled internal use and further hardening.
