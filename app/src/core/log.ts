// Єдиний логер проєкту. Перед записом маскує все, що схоже на секрет:
// токени ботів, API-ключі, Bearer-заголовки, шляхи Slack-вебхуків, токени в query string.
type Level = "info" | "warn" | "error";

const SECRET_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/bot\d{6,}:[A-Za-z0-9_-]{20,}/g, "bot<REDACTED>"],
  [/\b(?:sk|pk)-[A-Za-z0-9-]{10,}/g, "<REDACTED>"],
  [/\bxox[abp]-[A-Za-z0-9-]{10,}/g, "<REDACTED>"],
  [/(Bearer\s+)[A-Za-z0-9._~+/=-]{10,}/gi, "$1<REDACTED>"],
  [/(\/services\/)[A-Za-z0-9/_-]+/g, "$1<REDACTED>"],
  [/([?&](?:token|key|api_key|access_token)=)[^&\s]+/gi, "$1<REDACTED>"],
];

export function redact(text: string): string {
  return SECRET_PATTERNS.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text);
}

function write(level: Level, message: string): void {
  const line = `${new Date().toISOString()} ${level.toUpperCase()} ${redact(message)}`;
  if (level === "error") console.error(line);
  else console.log(line);
}

export const log = {
  info: (message: string): void => write("info", message),
  warn: (message: string): void => write("warn", message),
  error: (message: string): void => write("error", message),
};
