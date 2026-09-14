import { afterEach, describe, expect, it, vi } from "vitest";
import { postJson } from "./http.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("postJson", () => {
  it("повертає тіло відповіді при 2xx", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(postJson("https://api.example.test/x", { a: 1 })).resolves.toEqual({ ok: true, value: '{"ok":true}' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("повторює запит на 5xx і повертає помилку як значення", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response("<!DOCTYPE html>", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await postJson("https://api.example.test/x", {}, { retries: 2, backoffMs: 0 });

    expect(result).toEqual({ ok: false, error: "POST https://api.example.test/x failed: HTTP 502" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("не повторює запит на 4xx", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response("bad request", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await postJson("https://api.example.test/x", {}, { backoffMs: 0 });

    expect(result.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
