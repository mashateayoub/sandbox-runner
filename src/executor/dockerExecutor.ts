import { execFile } from "child_process";
import { promisify } from "util";
import { COMMANDS, Language } from "./commands.js";

const execFileAsync = promisify(execFile);

export interface RunOptions {
  code: string;
  language: Language;
  stdin?: string;
}

export interface RunResult {
  output: string;
  error: boolean;
}

const DEFAULT_TIMEOUT_MS = Number(process.env.RUNNER_MAX_TIMEOUT_MS || 10_000);
const MAX_MEMORY_MB = Number(process.env.RUNNER_MAX_MEMORY_MB || 512);
const MAX_CPUS = Number(process.env.RUNNER_MAX_CPUS || 1);
const MAX_PIDS = Number(process.env.RUNNER_MAX_PIDS || 128);
const MAX_OUTPUT_BYTES = Number(process.env.RUNNER_MAX_OUTPUT_BYTES || 1_048_576);

function trimOutput(text: string) {
  if(text.length <= MAX_OUTPUT_BYTES) return text;
  return text.slice(0, MAX_OUTPUT_BYTES) + "\n[truncated]";
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
        `printf '%s' \"$CODE_B64\" | base64 -d > "${command.filename}"`,
        `printf '%s' \"$STDIN_B64\" | base64 -d | sh -lc '${command.command}'`,
      ].join("; ")
    : [
        "set -eu",
        "mkdir -p /tmp/work",
        "cd /tmp/work",
        `printf '%s' \"$CODE_B64\" | base64 -d > "${command.filename}"`,
        `sh -lc '${command.command}'`,
      ].join("; ");

  const dockerArgs = [
    "run",
    "--rm",
    "--network", "none",
    "--cpus", String(MAX_CPUS),
    "--memory", `${MAX_MEMORY_MB}m`,
    "--pids-limit", String(MAX_PIDS),
    "--read-only",
    "--security-opt", "no-new-privileges:true",
    "--tmpfs", "/tmp:rw,exec,size=64m",
    "-e", `CODE_B64=${codeB64}`,
    ...(options.stdin !== undefined ? ["-e", `STDIN_B64=${stdinB64}`] : []),
    command.image,
    "sh",
    "-lc",
    runtimeScript,
  ];

  try {
    const { stdout, stderr } = await execFileAsync("docker", dockerArgs, {
      timeout: DEFAULT_TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
    });

    const merged = String(stdout || stderr || "").trim();
    return {
      output: trimOutput(merged),
      error: !!stderr && !stdout,
    };
  }
  catch(e: any) {
    return {
      output: trimOutput(String(e.stderr || e.message || "Execution failed").trim()),
      error: true,
    };
  }
}
