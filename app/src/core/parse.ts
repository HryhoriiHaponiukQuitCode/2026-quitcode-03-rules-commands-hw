// Єдине місце, де зовнішній текст стає даними.
// Будь-який JSON (відповіді API, вебхуки, файли стану) — лише через parseJson() з guard:
// невалідний JSON або неочікувана форма — це помилка, а не «значення за замовчуванням».
import type { Result } from "./types.js";

export type Guard<T> = (value: unknown) => value is T;

export function parseJson<T>(text: string, guard: Guard<T>, label = "json"): Result<T> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: `${label}: invalid JSON` };
  }
  if (!guard(raw)) {
    return { ok: false, error: `${label}: unexpected shape` };
  }
  return { ok: true, value: raw };
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isString = (value: unknown): value is string => typeof value === "string";

export const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
