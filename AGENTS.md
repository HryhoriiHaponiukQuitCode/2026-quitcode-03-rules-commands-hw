# AGENTS.md — lead-sync

Воркер агенції, перенесений з n8n: кожні 5 хвилин розсилає нові ліди клієнта
Studio Nova в інтеграції (Slack, Google Sheets). TypeScript, Node 22+, Vitest,
нуль runtime-залежностей. Дані в репо синтетичні.

## Команди (з теки `app/`)

- `npm install` — встановлення
- `npm test` — тести (Vitest)
- `npm run typecheck` — перевірка типів
- `npm run check:rules` — статична перевірка правил проєкту

## Карта

- `app/src/core/` — платформне ядро: типи, HTTP, конфіг, парсинг, логер. **Захищене.**
- `app/src/integrations/` — один модуль на зовнішню систему + реєстр `index.ts`
- `app/src/sync/` — запуск синхронізації (`run.ts`) і стан між запусками (`state.ts`)
- `materials/architecture-brief.md` — архітектурна записка, джерело істини

## Головне

1. Не змінювати `app/src/core/**`, `app/scripts/**`, `materials/**`, `.coderabbit.yaml`, `.github/**`. Без винятків: якщо без цього ніяк — зупинитись і спитати.
2. Нова інтеграція = модуль + тест поруч + рядок у `integrations/index.ts`.
3. HTTP — `postJson`, змінні — `readEnv`, JSON — `parseJson` з guard, журнал — `log`.
4. Помилки — `Result`, а не винятки. Зіпсовані дані — помилка, а не тихий дефолт.
5. Без `any` і без нових залежностей.
6. У сповіщеннях — без email і телефону ліда.

Детально — у правилах проєкту: `.claude/rules/` (Claude Code).

## Перед комітом

`cd app && npm test && npm run typecheck && npm run check:rules` — тести й типи
зелені, нових порушень немає.
