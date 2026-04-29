import Fastify from "fastify";
import { registerExecuteRoute } from "./routes/execute.js";
import { COMMANDS } from "./executor/commands.js";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ ok: true, service: "sandbox-runner" }));
app.get("/capabilities", async () => ({
  service: "sandbox-runner",
  provider: "remote",
  languages: Object.keys(COMMANDS),
  limits: {
    timeoutMs: Number(process.env.RUNNER_MAX_TIMEOUT_MS || 10_000),
    memoryMb: Number(process.env.RUNNER_MAX_MEMORY_MB || 512),
    cpus: Number(process.env.RUNNER_MAX_CPUS || 1),
    pids: Number(process.env.RUNNER_MAX_PIDS || 128),
    maxOutputBytes: Number(process.env.RUNNER_MAX_OUTPUT_BYTES || 1_048_576),
  },
}));
await registerExecuteRoute(app);

const port = Number(process.env.PORT || 8080);
const host = "0.0.0.0";

try {
  await app.listen({ port, host });
  app.log.info(`sandbox-runner listening on ${host}:${port}`);
}
catch(error) {
  app.log.error(error);
  process.exit(1);
}
