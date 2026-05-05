# Test Cases Recap and Run Guide

## Test Files Overview

### 1) `test/contract.test.ts`
Purpose: validates the request schema contract (`ExecuteRequestSchema`).

Covered cases:
- Accepts a valid basic payload (`code` + supported `language`).
- Accepts async execution mode (`mode: "async"`).
- Rejects unsupported languages (example: `ruby`).

Why it matters:
- Prevents API contract drift.
- Ensures request validation blocks invalid execution requests before runtime.

---

### 2) `test/security.test.ts`
Purpose: validates authentication behavior (`assertBearerAuth`).

Covered cases:
- Rejects missing bearer token.
- Accepts the primary configured token (`RUNNER_API_TOKEN`).
- Accepts the previous token during rotation (`RUNNER_API_TOKEN_PREVIOUS`).
- Rejects incorrect token values.

Why it matters:
- Protects execution endpoint access.
- Verifies token rotation support without downtime.

---

## How To Run Tests

## Recommended (project root)

```powershell
cd C:\Users\Simplon\Documents\Projects\proctor\sandbox-runner
npm test
```

This runs Vitest (`vitest run`) via `package.json` script.

---

## Fallback (if `npm test` has local PowerShell/npm permission issues)
Run Vitest directly from local dependencies:

```powershell
cd C:\Users\Simplon\Documents\Projects\proctor\sandbox-runner
.\node_modules\.bin\vitest.cmd run
```

---

## Run TypeScript Build Validation
This checks compilation (including test TS files with current `tsconfig.json`):

```powershell
cd C:\Users\Simplon\Documents\Projects\proctor\sandbox-runner
.\node_modules\.bin\tsc.cmd -p tsconfig.json
```

---

## Run a Single Test File

Contract tests only:

```powershell
.\node_modules\.bin\vitest.cmd run test/contract.test.ts
```

Security tests only:

```powershell
.\node_modules\.bin\vitest.cmd run test/security.test.ts
```

---

## Expected Current Limitation
In this environment, Vitest may fail before executing tests due to a process spawn permission issue (`spawn EPERM`) when loading Vite/Vitest config. If that happens:
- TypeScript compile can still be used to validate static correctness.
- Re-run tests in a shell/environment with proper process spawn permissions.

---

## Quick Pass/Fail Signals
- Contract tests pass: schema accepts valid payloads and rejects invalid language.
- Security tests pass: auth accepts primary/previous tokens and rejects missing/invalid bearer tokens.
