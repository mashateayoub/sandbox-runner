# sandbox-runner

Remote isolated code execution service for Proctor.

## Quick start

1. Copy env file

```bash
cp .env.example .env
```

2. Install dependencies

```bash
npm install
```

3. Build runtime images + start service

```bash
docker compose up --build
```

4. Test health

```bash
curl http://localhost:8080/health
```

5. Test execution

```bash
curl -X POST http://localhost:8080/execute \
  -H "Authorization: Bearer <RUNNER_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"code":"print(7)","language":"python"}'
```

## Connect from Proctor

Set in Proctor `.env.local`:

```env
EXECUTION_PROVIDER=remote
EXECUTION_REMOTE_URL=http://localhost:8080/execute
EXECUTION_REMOTE_TOKEN=<RUNNER_API_TOKEN>
```

## Security defaults

- one fresh container per execution
- no network (`--network none`)
- cpu/memory/pids limits
- read-only rootfs
- no-new-privileges

## Notes

- This is a production-oriented scaffold; add queue/rate limiting before internet exposure.
- Keep this service separate from the Next.js app host.
