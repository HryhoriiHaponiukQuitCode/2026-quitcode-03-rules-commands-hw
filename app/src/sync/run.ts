// Один запуск синхронізації. Планувальник викликає його кожні 5 хвилин.
import { log } from "../core/log.js";
import type { Integration, Lead } from "../core/types.js";
import { loadState, saveState } from "./state.js";

export interface SyncReport {
  pending: number;
  delivered: number;
  failed: number;
}

const EMPTY: SyncReport = { pending: 0, delivered: 0, failed: 0 };

export async function runSync(
  leads: readonly Lead[],
  integrations: readonly Integration[],
  statePath: string,
): Promise<SyncReport> {
  const state = loadState(statePath);
  if (!state.ok) {
    // Не знаємо, що вже розіслано, — не розсилаємо нічого. Почати «з нуля»
    // означало б зробити рівно те, на що скаржився клієнт 10.09.
    log.error(`sync: стан не прочитано (${state.error}); розсилку зупинено, потрібне втручання людини`);
    return { ...EMPTY };
  }

  // Порядок гарантує, що чекпойнт нижче зростає монотонно.
  const pending = leads
    .filter((lead) => lead.createdAt > state.value.lastSyncedAt)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (pending.length === 0) {
    const saved = saveState(statePath, state.value); // створює файл при першому запуску
    if (!saved.ok) log.warn(`sync: ${saved.error}`);
    log.info("sync: 0 pending leads, 0 delivered, 0 failed");
    return { ...EMPTY };
  }

  let delivered = 0;
  let failed = 0;
  let lastSyncedAt = state.value.lastSyncedAt;

  for (const lead of pending) {
    for (const integration of integrations) {
      const result = await integration.send(lead);
      if (result.ok) delivered++;
      else failed++;
    }

    // Чекпойнт після КОЖНОГО ліда. Раніше стан зберігався один раз у кінці,
    // і запуск, убитий планувальником за таймаутом (SIGKILL на 4m30s), не
    // лишав по собі жодного прогресу — наступний починав з того самого місця.
    lastSyncedAt = lead.createdAt;
    const saved = saveState(statePath, { lastSyncedAt });
    if (!saved.ok) {
      log.error(`sync: ${saved.error}; зупиняюсь після ліда ${lead.id}, щоб не розсилати повторно`);
      return { pending: pending.length, delivered, failed };
    }
  }

  log.info(`sync: ${pending.length} pending leads, ${delivered} delivered, ${failed} failed`);
  return { pending: pending.length, delivered, failed };
}
