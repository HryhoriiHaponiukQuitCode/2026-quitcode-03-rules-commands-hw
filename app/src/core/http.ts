// Єдиний HTTP-клієнт проєкту: таймаут, повтори на 5xx/429 і мережеві збої,
// помилки повертаються як значення. Тіло відповіді — сирий текст:
// розбирайте його через parseJson() з guard.
import { log } from "./log.js";
import type { Result } from "./types.js";

export interface PostOptions {
  headers?: Record<string, string>;
  /** Таймаут однієї спроби, мс. */
  timeoutMs?: number;
  /** Скільки разів повторити після першої невдалої спроби. */
  retries?: number;
  /** Пауза між спробами, мс (множиться на номер спроби). */
  backoffMs?: number;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function postJson(url: string, body: unknown, options: PostOptions = {}): Promise<Result<string>> {
  const { headers = {}, timeoutMs = 10_000, retries = 2, backoffMs = 300 } = options;
  let lastError = "unknown error";

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await response.text();
      if (response.ok) return { ok: true, value: text };
      lastError = `HTTP ${response.status}`;
      if (response.status < 500 && response.status !== 429) break; // 4xx: повтор не допоможе
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    log.warn(`http: attempt ${attempt} to ${url} failed: ${lastError}`);
    if (attempt <= retries && backoffMs > 0) await sleep(backoffMs * attempt);
  }

  return { ok: false, error: `POST ${url} failed: ${lastError}` };
}
