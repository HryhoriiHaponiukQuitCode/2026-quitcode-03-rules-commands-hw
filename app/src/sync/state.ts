// Стан синхронізації між запусками: ліди, створені після lastSyncedAt, ще не розіслані.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export interface SyncState {
  /** ISO-8601, UTC. */
  lastSyncedAt: string;
}

const INITIAL_STATE: SyncState = { lastSyncedAt: "1970-01-01T00:00:00.000Z" };

export function loadState(path: string): SyncState {
  if (!existsSync(path)) return { ...INITIAL_STATE };
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { ...INITIAL_STATE };
  }
}

export function saveState(path: string, state: SyncState): void {
  writeFileSync(path, JSON.stringify(state, null, 2));
}
