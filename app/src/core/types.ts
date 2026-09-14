// Спільні типи проєкту.
// ЗАХИЩЕНА ЗОНА: src/core/** належить платформній команді — див. materials/architecture-brief.md.

/** Нормалізований лід: те, що лишилось від заявки з сайту після валідації. */
export interface Lead {
  /** Стабільний id із джерела, напр. `ld_0001`. */
  id: string;
  name: string;
  email: string;
  phone?: string;
  source: "website" | "instagram" | "referral";
  budgetUsd?: number;
  /** ISO-8601, UTC. */
  createdAt: string;
}

/** Результат операції, що може не вдатися. Помилки — це значення, а не винятки. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** Контракт інтеграції: одна зовнішня система — один модуль у src/integrations/. */
export interface Integration {
  /** kebab-case, збігається з іменем файлу. */
  name: string;
  /** Імена змінних середовища, без яких інтеграція не працює (лише імена, не значення). */
  requiredEnv: readonly string[];
  send(lead: Lead): Promise<Result<void>>;
}
