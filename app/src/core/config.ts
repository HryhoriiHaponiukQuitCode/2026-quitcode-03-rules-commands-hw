// Єдине місце, де код читає змінні середовища.
// Інтеграції отримують значення лише через readEnv() — і ніколи їх не логують.
import type { Result } from "./types.js";

export function readEnv(name: string, env: NodeJS.ProcessEnv = process.env): Result<string> {
  const value = env[name];
  if (value === undefined || value.trim() === "") {
    return { ok: false, error: `missing environment variable ${name}` };
  }
  return { ok: true, value };
}
