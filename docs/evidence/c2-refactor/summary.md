# c2-refactor

| Показник | Значення |
|---|---|
| check:rules до | 8 |
| check:rules після | 1 |
| npm test після | 19 passed (19) |
| файлів прочитано до першої зміни | **10** |
| з них через Bash (cat/sed/grep) | 7 команд |
| усього викликів інструментів | 13 |
| змінював захищені шляхи | ні |
| хук заблокував дію | ні |
| сам викликав slash-команди | ні |
| ходів | 14 |
| тривалість, с | 90 |
| вартість, $ | 0.602 |

**Файли, прочитані до першої зміни:**
- `src/integrations/sheets-append.ts`
- `src/integrations/sheets-append.test.ts`
- `src/integrations/slack-notify.ts`
- `src/core/types.ts`
- `src/core/http.ts`
- `src/core/config.ts`
- `src/core/parse.ts`
- `src/core/log.ts`
- `.claude/rules/conventions.md`
- `src/integrations/index.ts`

**Виклики інструментів:** Bash×13

**Змінені файли (git status):**
```
M .claude/commands/analyze-error.md
 M app/src/integrations/sheets-append.test.ts
 M app/src/integrations/sheets-append.ts
?? docs/evidence/
?? tools/ab-report.mjs
?? tools/ab-run.sh
?? tools/session-run.sh
```

**Фінальна відповідь агента:**

> ## Результат
> 
> | | до | після |
> |---|---|---|
> | `npm test` | 18 passed (6 files) | **19 passed** (додано 1 тест) |
> | `check:rules` — `sheets-append.ts` | **7** | **0** |
> | `check:rules` — TOTAL | 8 | **1** (лишився `sync/state.ts json-via-parse` — інший файл, не ціль) |
> | `npm run typecheck` | — | без помилок |
> 
> ```
>  app/src/integrations/sheets-append.test.ts | 14 ++++++++
>  app/src/integrations/sheets-append.ts      | 57 ++++++++++++++++++++++--------
> ```
> 
> (`.claude/commands/analyze-error.md` у `git status` був змінений ще до цієї сесії — я його не чіпав.)
> 
> ## Що збереглось у поведінці
> 
> URL той самий — `${SHEETS_WEBHOOK_URL}?token=${SHEETS_TOKEN}`, тепер зібраний з `readEnv()` замість `process.env`, і `postJson()` шле той самий `POST` із `content-type: application/json` і тим самим тілом `{ values: [[createdAt, name, email, phone ?? "", source]] }`. Текст помилки від таблиці не змінився: `sheets error: quota_exceeded`. Експорт лишився `export default` з тим самим `name` / `requiredEnv`, тож рядок у `integrations/index.ts` правити не треба; додатково модуль тепер типізований як `Integration`, що й дає `Promise<Result<void>>` без `any`.
> 
> Обидва наявні асерти пройшли без жодної правки — `git diff -- '*.test.ts'` містить лише доданий блок.
> 
> ## Два непокриті тестами шляхи, де поведінка стала строгішою
> 
> Це наслідок конвенцій, не мого вибору — фіксую явно:
> 
> 1. **Відсутня/порожня env** (конвенції §3). Було: URL складався у `"undefined?token=undefined"`, `fetch` ішов у мережу й падав винятком. Стало: `{ ok: false, error: "missing environment variable SHEETS_TOKEN" }` без мережевого виклику — це я й закріпив доданим тестом (конвенції вимагають три випадки на інтеграцію, випадку з env бракувало).
> 2. **Не-2xx відповідь і невалідний JSON** (§2, §4). Було: `JSON.parse` сирого тіла → або виняток, або `sheets error: undefined`. Стало: помилка від `postJson` повертається як значення, а тіло розбирається через `parseJson` з guard на `{ status: string }` → `sheets-append: invalid JSON` / `sheets-append: unexpected shape`.
> 
> Логи перейшли з `console.log` на `log.info` / `log.error` — саме через маскування токена в query string (`log.redact`), а старий рядок друкував URL із токеном як є.
