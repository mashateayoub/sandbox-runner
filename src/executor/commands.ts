export type Language = "javascript" | "python" | "java" | "go" | "rust" | "c" | "cpp" | "bash";

export interface LanguageCommand {
  image: string;
  filename: string;
  command: string;
}

export const COMMANDS: Record<Language, LanguageCommand> = {
  javascript: {
    image: "runner-node:1",
    filename: "Main.js",
    command: "node Main.js",
  },
  python: {
    image: "runner-python:1",
    filename: "Main.py",
    command: "python3 Main.py",
  },
  java: {
    image: "runner-java:1",
    filename: "Main.java",
    command: "javac Main.java && java -cp . Main",
  },
  go: {
    image: "runner-go:1",
    filename: "Main.go",
    command: "go run Main.go",
  },
  rust: {
    image: "runner-rust:1",
    filename: "Main.rs",
    command: "rustc Main.rs -O -o main && ./main",
  },
  c: {
    image: "runner-c-cpp:1",
    filename: "Main.c",
    command: "gcc Main.c -O2 -o main && ./main",
  },
  cpp: {
    image: "runner-c-cpp:1",
    filename: "Main.cpp",
    command: "g++ Main.cpp -O2 -std=c++17 -o main && ./main",
  },
  bash: {
    image: "runner-bash:1",
    filename: "Main.sh",
    command: "bash Main.sh",
  },
};
