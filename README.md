<p align="center">
  <h1 align="center">🛡️ Sandbox Runner</h1>
  <p align="center">
    <strong>Secure, isolated code execution engine for modern assessment platforms.</strong>
  </p>
  <p align="center">
    <a href="#getting-started">Quick Start</a> ·
    <a href="#supported-languages">Languages</a> ·
    <a href="#api-reference">API Reference</a> ·
    <a href="#security-model">Security</a> ·
    <a href="#architecture">Architecture</a>
  </p>
</p>

---

## Overview

**Sandbox Runner** is a production-grade, Docker-powered remote code execution service purpose-built for the [Proctor](https://github.com/mashateayoub/proctor) exam platform. It provides a single, unified API endpoint to compile, execute, and evaluate student-submitted code across **8 programming languages** — all within ephemeral, hardened containers that are destroyed after every run.

Whether you're administering a timed coding exam for 30 students or running automated grading pipelines at scale, Sandbox Runner ensures every execution is **fast**, **deterministic**, and **completely isolated** from your host infrastructure.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **Multi-Language Support** | JavaScript, Python, Java, Go, Rust, C, C++, and Bash — all from a single API |
| **Ephemeral Containers** | A fresh, disposable container is created for each execution — zero cross-contamination |
| **Built-in Test Runner** | Submit up to 100 test cases per request; get pass/fail verdicts with diff output |
| **Hardened Sandbox** | Network-disabled, read-only rootfs, PID/memory/CPU limits, no-new-privileges |
| **Token Authentication** | Bearer-token gating on all execution endpoints |
| **Capabilities Endpoint** | Programmatically discover supported languages and resource limits at runtime |
| **Configurable Limits** | Fine-tune timeout, memory, CPU, PID, and output caps via environment variables |
| **Structured Logging** | JSON-structured request/response logging via Pino for full observability |

---

## Supported Languages

| Language | Runtime | Compiler/Interpreter |
|---|---|---|
| JavaScript | Node.js 20 | `node` |
| Python | Python 3.x | `python3` |
| Java | JDK 21 | `javac` + `java` |
| Go | Go 1.22+ | `go run` |
| Rust | Rust stable | `rustc` |
| C | GCC | `gcc -O2` |
| C++ | G++ (C++17) | `g++ -O2 -std=c++17` |
| Bash | Alpine sh | `bash` |

Each language ships as a pre-built, minimal Docker image stored under `docker/images/`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Proctor Platform                    │
│              (Next.js · Exam Management)                │
└──────────────────────┬──────────────────────────────────┘
                       │  HTTPS / Bearer Token
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   Sandbox Runner                        │
│            Fastify · TypeScript · Zod                   │
│                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Auth    │→ │  Validation  │→ │  Docker Executor  │  │
│  │  Guard   │  │  (Zod)       │  │  (ephemeral run)  │  │
│  └──────────┘  └──────────────┘  └─────────┬─────────┘  │
│                                            │            │
│                                            ▼            │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Disposable Runtime Containers           │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │   │
│  │  │ Node │ │ Py   │ │ Java │ │ Go   │ │ Rust │…  │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘   │   │
│  │  --network none · --read-only · --no-new-priv    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### How It Works

1. **Proctor** sends a `POST /execute` request containing the student's source code and (optionally) test cases.
2. **Auth Guard** validates the Bearer token against the configured secret.
3. **Zod Validation** parses and sanitizes the payload (code length, language enum, test-case limits).
4. **Docker Executor** spawns an ephemeral container with the appropriate runtime image, injects the code via base64-encoded environment variables, and captures stdout/stderr.
5. If **test cases** are provided, each case is run in its own container with the supplied stdin, and the output is diffed against the expected result.
6. The container is **automatically destroyed** after execution (`docker run --rm`).

---

## Getting Started

### Prerequisites

- **Docker Engine** ≥ 24.0 (with Docker Compose V2)
- **Node.js** ≥ 20 (for local development only)

### 1. Clone & Configure

```bash
git clone https://github.com/mashateayoub/sandbox-runner.git
cd sandbox-runner
cp .env.example .env
```

Edit `.env` and set a strong, random value for `RUNNER_API_TOKEN`:

```env
PORT=8080
RUNNER_API_TOKEN=your-secure-random-token-here
RUNNER_MAX_TIMEOUT_MS=10000
RUNNER_MAX_MEMORY_MB=512
RUNNER_MAX_CPUS=1
RUNNER_MAX_PIDS=128
RUNNER_MAX_OUTPUT_BYTES=1048576
RUNNER_ALLOWED_LANGUAGES=javascript,python,java,go,rust,c,cpp,bash
```

### 2. Build & Launch

```bash
docker compose up --build
```

This builds all 7 runtime images and starts the Sandbox Runner service on port `8080`.

### 3. Verify

```bash
# Health check
curl http://localhost:8080/health
# → {"ok":true,"service":"sandbox-runner"}

# Discover capabilities
curl http://localhost:8080/capabilities
```

---

## API Reference

### `GET /health`

Returns service health status. No authentication required.

**Response:**
```json
{ "ok": true, "service": "sandbox-runner" }
```

---

### `GET /capabilities`

Returns supported languages and configured resource limits. No authentication required.

**Response:**
```json
{
  "service": "sandbox-runner",
  "provider": "remote",
  "languages": ["javascript", "python", "java", "go", "rust", "c", "cpp", "bash"],
  "limits": {
    "timeoutMs": 10000,
    "memoryMb": 512,
    "cpus": 1,
    "pids": 128,
    "maxOutputBytes": 1048576
  }
}
```

---

### `POST /execute`

Execute code in a sandboxed container. **Requires Bearer token authentication.**

**Headers:**
| Header | Value |
|---|---|
| `Authorization` | `Bearer <RUNNER_API_TOKEN>` |
| `Content-Type` | `application/json` |

#### Simple Execution

```bash
curl -X POST http://localhost:8080/execute \
  -H "Authorization: Bearer <RUNNER_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello, World!\")",
    "language": "python"
  }'
```

**Response:**
```json
{
  "provider": "remote",
  "output": "Hello, World!",
  "error": false,
  "executionTime": 342.17
}
```

#### With Test Cases

Submit up to **100 test cases** per request. Each test case runs in its own isolated container.

```bash
curl -X POST http://localhost:8080/execute \
  -H "Authorization: Bearer <RUNNER_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "n = int(input())\nprint(n * 2)",
    "language": "python",
    "testCases": [
      { "label": "Double 5",  "input": "5",  "expectedOutput": "10" },
      { "label": "Double 0",  "input": "0",  "expectedOutput": "0"  },
      { "label": "Negative",  "input": "-3", "expectedOutput": "-6" }
    ]
  }'
```

**Response:**
```json
{
  "provider": "remote",
  "testResults": [
    { "label": "Double 5",  "passed": true,  "expected": "10", "actual": "10" },
    { "label": "Double 0",  "passed": true,  "expected": "0",  "actual": "0"  },
    { "label": "Negative",  "passed": true,  "expected": "-6", "actual": "-6" }
  ],
  "passedCount": 3,
  "totalCount": 3,
  "executionTime": 1024.53
}
```

#### Request Schema

| Field | Type | Required | Constraints |
|---|---|---|---|
| `code` | `string` | ✅ | 1 – 200,000 characters |
| `language` | `enum` | ✅ | `javascript` · `python` · `java` · `go` · `rust` · `c` · `cpp` · `bash` |
| `testCases` | `array` | — | Max 100 items |
| `testCases[].label` | `string` | — | Max 100 characters |
| `testCases[].input` | `string` | — | Max 20,000 characters |
| `testCases[].expectedOutput` | `string` | ✅ | Max 20,000 characters |

---

## Security Model

Sandbox Runner enforces **defense-in-depth** at every layer of the execution pipeline:

| Layer | Mechanism | Purpose |
|---|---|---|
| **Network** | `--network none` | No internet access, no lateral movement |
| **Filesystem** | `--read-only` rootfs + `tmpfs /tmp` (64 MB) | Prevent persistent writes; limit scratch space |
| **Privileges** | `--security-opt no-new-privileges:true` | Block privilege escalation via `setuid`/`setgid` |
| **Resources** | `--cpus`, `--memory`, `--pids-limit` | Hard caps on compute, memory, and process count |
| **Lifecycle** | `docker run --rm` | Container is destroyed immediately after execution |
| **Output** | `MAX_OUTPUT_BYTES` truncation | Prevent memory exhaustion from excessive output |
| **Timeout** | `RUNNER_MAX_TIMEOUT_MS` | Kill long-running or infinite-loop submissions |
| **Authentication** | Bearer token on `/execute` | Prevent unauthorized access to the execution engine |

> **⚠️ Production Note:** For internet-facing deployments, add a reverse proxy with rate limiting (e.g., Nginx, Caddy, or a cloud load balancer) in front of the service.

---

## Integration with Proctor

Add the following environment variables to your Proctor `.env.local` file to route code execution through Sandbox Runner:

```env
EXECUTION_PROVIDER=remote
EXECUTION_REMOTE_URL=http://localhost:8080/execute
EXECUTION_REMOTE_TOKEN=<RUNNER_API_TOKEN>
```

Once configured, all student code submissions in Proctor exams will be compiled, executed, and graded by Sandbox Runner automatically.

---

## Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | HTTP port the service binds to |
| `RUNNER_API_TOKEN` | — | **Required.** Shared secret for Bearer authentication |
| `RUNNER_MAX_TIMEOUT_MS` | `10000` | Maximum execution time per container (ms) |
| `RUNNER_MAX_MEMORY_MB` | `512` | Memory limit per container (MB) |
| `RUNNER_MAX_CPUS` | `1` | CPU quota per container |
| `RUNNER_MAX_PIDS` | `128` | Maximum number of processes per container |
| `RUNNER_MAX_OUTPUT_BYTES` | `1048576` | Maximum stdout/stderr capture size (bytes) |
| `RUNNER_ALLOWED_LANGUAGES` | `javascript,python,...` | Comma-separated list of enabled languages |

---

## Tech Stack

| Component | Technology |
|---|---|
| Runtime | Node.js 20 (Alpine) |
| Framework | Fastify 5 |
| Validation | Zod |
| Logging | Pino (JSON structured logs) |
| Language | TypeScript (ES2022, strict mode) |
| Containerization | Docker + Docker Compose |
| Testing | Vitest |

---

## Development

```bash
# Install dependencies
npm install

# Start in watch mode (requires Docker running)
npm run dev

# Run tests
npm test

# Production build
npm run build
npm start
```

---

## Project Structure

```
sandbox-runner/
├── src/
│   ├── server.ts              # Fastify app entry point
│   ├── auth.ts                # Bearer token authentication
│   ├── schema.ts              # Zod request/response schemas
│   ├── routes/
│   │   └── execute.ts         # POST /execute handler + test runner
│   └── executor/
│       ├── index.ts           # Executor barrel export
│       ├── commands.ts        # Language → image/filename/command mapping
│       └── dockerExecutor.ts  # Docker CLI orchestration
├── docker/
│   └── images/                # Runtime Dockerfiles
│       ├── node/
│       ├── python/
│       ├── java/
│       ├── go/
│       ├── rust/
│       ├── c-cpp/
│       └── bash/
├── test/
│   ├── contract.test.ts       # API contract tests
│   └── security.test.ts       # Security constraint tests
├── docker-compose.yml         # Full-stack orchestration
├── Dockerfile                 # Service container build
├── .env.example               # Environment variable template
├── tsconfig.json              # TypeScript configuration
└── package.json
```

---

## License

This project is part of the **Proctor** platform. All rights reserved.

---

<p align="center">
  Built with 🔒 security-first design for <strong>Proctor</strong> — the AI-powered exam proctoring platform.
</p>
