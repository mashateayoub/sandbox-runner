import { execFile } from "child_process";
import { promisify } from "util";
import { COMMANDS, Language } from "./commands.js";
import { ErrorType } from "../schema.js";

const execFileAsync = promisify(execFile);

export interface RunOptions {
  code: string;
  language: Language;
  stdin?: string;
}

export interface RunResult {
  output: string;
  error: boolean;
  errorType: ErrorType;
  truncated: boolean;
  runDurationMs: number;
  containerStartMs: number;
}

const DEFAULT_TIMEOUT_MS = Number(process.env.RUNNER_MAX_TIMEOUT_MS || 10_000);
const MAX_MEMORY_MB = Number(process.env.RUNNER_MAX_MEMORY_MB || 512);
const MAX_CPUS = Number(process.env.RUNNER_MAX_CPUS || 1);
const MAX_PIDS = Number(process.env.RUNNER_MAX_PIDS || 128);
const MAX_OUTPUT_BYTES = Number(process.env.RUNNER_MAX_OUTPUT_BYTES || 1_048_576);
const NOFILE_ULIMIT = process.env.RUNNER_MAX_NOFILE || "64:64";
const NPROC_ULIMIT = process.env.RUNNER_MAX_NPROC || "128:128";

function trimOutput(text: string) {
  if(text.length <= MAX_OUTPUT_BYTES) {
    return { text, truncated: false };
  }

  return {
    text: text.slice(0, MAX_OUTPUT_BYTES) + "\n[truncated]",
    truncated: true,
  };
}

function classifyDockerError(stderr: string, timedOut: boolean): ErrorType {
  if(timedOut) {
    return "timeout";
  }

  const lower = stderr.toLowerCase();
  if(lower.includes("cannot connect to the docker daemon") || lower.includes("docker: error response from daemon")) {
    return "infra_error";
  }

  if(lower.includes("compilation") || lower.includes("javac") || lower.includes("rustc") || lower.includes("gcc") || lower.includes("g++")) {
    return "compile_error";
  }

  return "runtime_error";
}

export async function runInDocker(options: RunOptions): Promise<RunResult> {
  const command = COMMANDS[options.language];
  const codeB64 = Buffer.from(options.code, "utf8").toString("base64");
  const stdinB64 = options.stdin !== undefined
    ? Buffer.from(options.stdin, "utf8").toString("base64")
    : "";

  const runtimeScript = options.stdin !== undefined
    ? [
        "set -eu",
        "mkdir -p /tmp/work",
        "cd /tmp/work",
        `printf '%s' \"$CODE_B64\" | base64 -d > \"${command.filename}\"`,
        `printf '%s' \"$STDIN_B64\" | base64 -d | sh -c '${command.command}'`,
      ].join("; ")
    : [
        "set -eu",
        "mkdir -p /tmp/work",
        "cd /tmp/work",
        `printf '%s' \"$CODE_B64\" | base64 -d > \"${command.filename}\"`,
        `sh -c '${command.command}'`,
      ].join("; ");

  const dockerArgs = [
    "run",
    "--rm",
    "--network", "none",
    "--cpus", String(MAX_CPUS),
    "--memory", `${MAX_MEMORY_MB}m`,
    "--pids-limit", String(MAX_PIDS),
    "--read-only",
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges:true",
    "--ulimit", `nofile=${NOFILE_ULIMIT}`,
    "--ulimit", `nproc=${NPROC_ULIMIT}`,
    "--user", "10001:10001",
    "--tmpfs", "/tmp:rw,exec,size=64m",
    "-e", `CODE_B64=${codeB64}`,
    ...(options.stdin !== undefined ? ["-e", `STDIN_B64=${stdinB64}`] : []),
    command.image,
    "sh",
    "-c",
    runtimeScript,
  ];

  const runStart = performance.now();
  try {
    const { stdout, stderr } = await execFileAsync("docker", dockerArgs, {
      timeout: DEFAULT_TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
    });

    const raw = String(stdout || stderr || "").trim();
    const trimmed = trimOutput(raw);

    return {
      output: trimmed.text,
      error: !!stderr && !stdout,
      errorType: !!stderr && !stdout ? "runtime_error" : "none",
      truncated: trimmed.truncated,
      runDurationMs: Number((performance.now() - runStart).toFixed(2)),
      containerStartMs: 0,
    };
  }
  catch(e: any) {
    const stderr = String(e?.stderr || e?.message || "Execution failed").trim();
    const trimmed = trimOutput(stderr);
    const timedOut = Boolean(e?.killed) || e?.signal === "SIGTERM";

    return {
      output: trimmed.text,
      error: true,
      errorType: classifyDockerError(stderr, timedOut),
      truncated: trimmed.truncated,
      runDurationMs: Number((performance.now() - runStart).toFixed(2)),
      containerStartMs: 0,
    };
  }
}
