// Один запуск синхронізації. Планувальник викликає його кожні 5 хвилин.
import { log } from "../core/log.js";
import type { Integration, Lead } from "../core/types.js";
import { loadState, saveState } from "./state.js";

export interface SyncReport {
  pending: number;
  delivered: number;
  failed: number;
  /** Заповнено, якщо запуск зупинено до розсилки (напр. пошкоджений файл стану). */
  error?: string;
}

export async function runSync(
  leads: readonly Lead[],
  integrations: readonly Integration[],
  statePath: string,
): Promise<SyncReport> {
  const state = loadState(statePath);
  if (!state.ok) {
    // Пошкоджений стан — не «перший запуск». Нічого не розсилаємо й файл не перезаписуємо:
    // його має відновити людина. Розіслати всю історію повторно — дорожче за пропущений тик.
    log.error(`sync: run stopped, state is unreadable: ${state.error}`);
    return { pending: 0, delivered: 0, failed: 0, error: state.error };
  }

  const pending = leads
    .filter((lead) => lead.createdAt > state.value.lastSyncedAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let delivered = 0;
  let failed = 0;

  for (const lead of pending) {
    for (const integration of integrations) {
      const result = await integration.send(lead);
      if (result.ok) delivered++;
      else failed++;
    }
    // Чекпоінт після кожного ліда: обірваний запуск продовжиться звідси, а не з початку.
    saveState(statePath, { lastSyncedAt: lead.createdAt });
  }

  log.info(`sync: ${pending.length} pending leads, ${delivered} delivered, ${failed} failed`);
  return { pending: pending.length, delivered, failed };
}
