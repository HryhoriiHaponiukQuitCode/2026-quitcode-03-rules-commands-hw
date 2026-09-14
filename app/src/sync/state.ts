// Стан синхронізації між запусками: ліди, створені після lastSyncedAt, ще не розіслані.
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { isRecord, isString, parseJson, type Guard } from "../core/parse.js";
import type { Result } from "../core/types.js";

export interface SyncState {
  /** ISO-8601, UTC. */
  lastSyncedAt: string;
}

export const INITIAL_STATE: SyncState = { lastSyncedAt: "1970-01-01T00:00:00.000Z" };

const isSyncState: Guard<SyncState> = (value): value is SyncState =>
  isRecord(value) && isString(value.lastSyncedAt) && !Number.isNaN(Date.parse(value.lastSyncedAt));

/**
 * Файлу немає — це перший запуск. Файл є, але пошкоджений, — це помилка,
 * а не «перший запуск»: тихий фолбек на INITIAL_STATE і спричинив інцидент 10.09.
 */
export function loadState(path: string): Result<SyncState> {
  if (!existsSync(path)) return { ok: true, value: { ...INITIAL_STATE } };
  return parseJson(readFileSync(path, "utf8"), isSyncState, `sync-state ${path}`);
}

/** Атомарний запис: перерваний запис лишає попередній файл, а не обрізаний. */
export function saveState(path: string, state: SyncState): void {
  const tmpPath = `${path}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(state, null, 2));
  renameSync(tmpPath, path);
}
