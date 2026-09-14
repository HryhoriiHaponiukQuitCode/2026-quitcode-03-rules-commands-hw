import { describe, expect, it } from "vitest";
import { redact } from "./log.js";

describe("redact", () => {
  it("маскує токен Telegram-бота в URL", () => {
    expect(redact("https://api.telegram.org/bot123456789:AAFakeTokenForTests_abcdefghij/sendMessage")).toBe(
      "https://api.telegram.org/bot<REDACTED>/sendMessage",
    );
  });

  it("маскує Bearer-заголовок і токен у query string", () => {
    expect(redact("Authorization: Bearer abcdef1234567890")).toBe("Authorization: Bearer <REDACTED>");
    expect(redact("https://sheets.example.test/append?token=fake-123&sheet=1")).toBe(
      "https://sheets.example.test/append?token=<REDACTED>&sheet=1",
    );
  });

  it("маскує шлях Slack-вебхука", () => {
    expect(redact("https://hooks.slack.example.test/services/T000/B000/fakeSecret")).toBe(
      "https://hooks.slack.example.test/services/<REDACTED>",
    );
  });

  it("не чіпає звичайний текст", () => {
    expect(redact("sync: 3 pending leads")).toBe("sync: 3 pending leads");
  });
});
