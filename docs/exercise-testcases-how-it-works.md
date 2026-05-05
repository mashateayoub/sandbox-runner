# Exercise Test Cases: How It Works

## Goal
This runner supports LeetCode-style evaluation: student code is executed against multiple test cases and returns per-case verdicts.

## 1) What the platform sends
Endpoint:
- `POST /execute`

Required payload:
- `code` (student submission)
- `language` (`javascript`, `python`, `java`, `go`, `rust`, `c`, `cpp`, `bash`)

Optional for exercise grading:
- `testCases`: array of objects
  - `label` (optional)
  - `input`
  - `expectedOutput`

Example:
```json
{
  "code": "n = int(input())\nprint(n*2)",
  "language": "python",
  "testCases": [
    { "label": "case 1", "input": "5", "expectedOutput": "10" },
    { "label": "case 2", "input": "0", "expectedOutput": "0" }
  ]
}
```

## 2) What the runner does
1. Auth check (Bearer token).
2. Validates payload with schema.
3. For each test case:
   - runs code in isolated Docker container
   - passes `input` as stdin
   - captures program output
4. Compares `actual` vs `expectedOutput` after `trim()` normalization.
5. Builds final verdict summary.

## 3) What the platform receives
Response includes:
- `testResults[]` with per-case `passed`, `expected`, `actual`, `label`
- `passedCount`
- `totalCount`
- `status`, `errorType`, `executionTime`, `runId`

Example fields:
```json
{
  "provider": "remote",
  "status": "completed",
  "errorType": "none",
  "testResults": [
    { "label": "case 1", "passed": true, "expected": "10", "actual": "10" }
  ],
  "passedCount": 1,
  "totalCount": 1
}
```

## 4) Sync vs Async
- `mode: "sync"` (default): immediate response after grading.
- `mode: "async"`: returns `jobId`, then poll `GET /execute/:jobId`.

## 5) Current behavior and limits
- Comparison is strict string equality after `trim()`.
- No built-in float tolerance mode yet.
- No built-in hidden/public test split yet (platform should separate them).
- Async jobs are currently in-memory (not persistent after service restart).

## 6) Resource and safety controls
Each test execution is sandboxed with:
- no network
- read-only root filesystem
- CPU/memory/PID/output limits
- dropped Linux capabilities and non-root user

This is suitable for coding-exercise evaluation workflows.
