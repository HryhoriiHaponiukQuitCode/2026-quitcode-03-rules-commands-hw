import { describe, expect, it } from "vitest";
import { isNumber, isRecord, isString, parseJson } from "./parse.js";

const isPoint = (value: unknown): value is { x: number } => isRecord(value) && isNumber(value.x);

describe("parseJson", () => {
  it("повертає значення, якщо JSON валідний і guard пройдено", () => {
    expect(parseJson('{"x": 1}', isPoint)).toEqual({ ok: true, value: { x: 1 } });
  });

  it("повертає помилку на невалідний JSON", () => {
    expect(parseJson("{", isPoint, "state")).toEqual({ ok: false, error: "state: invalid JSON" });
  });

  it("повертає помилку, якщо форма даних не та", () => {
    expect(parseJson('{"x": "1"}', isPoint)).toEqual({ ok: false, error: "json: unexpected shape" });
  });
});

describe("guards", () => {
  it("розрізняють типи", () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord({})).toBe(true);
    expect(isString("a")).toBe(true);
    expect(isNumber(Number.NaN)).toBe(false);
  });
});
