# b1-context-import

| Показник | Значення |
|---|---|
| check:rules до | — |
| check:rules після | — |
| npm test після | — |
| файлів прочитано до першої зміни | **0** |
| з них через Bash (cat/sed/grep) | 0 команд |
| усього викликів інструментів | 0 |
| змінював захищені шляхи | ні |
| хук заблокував дію | ні |
| сам викликав slash-команди | ні |
| ходів | 1 |
| тривалість, с | 10 |
| вартість, $ | 0.142 |

**Файли, прочитані до першої зміни:**
- (жодного)

**Виклики інструментів:** —

**Змінені файли (git status):**
```
(змін немає)
```

**Фінальна відповідь агента:**

> **1. Команди перевірки проєкту:**
> ```bash
> cd app && npm install
> cd app && npm test           # Vitest
> cd app && npm run typecheck  # tsc --noEmit
> cd app && npm run check:rules # конвенції
> node tools/check-rule-claims.mjs        # правила ↔ код
> node .claude/hooks/test-protect-core.mjs # тести хука захисту ядра
> ```
> 
> **2. Захищені теки/шляхи (не редагуються, не створюються, не видаляються):**
> - `app/src/core/**`
> - `app/scripts/**`
> - `materials/**`
> - `.coderabbit.yaml`
> - `.github/**`
> 
> **3. Правило, що діє в кожній сесії:** `.claude/rules/do-not-touch.md` — воно без frontmatter, тому підвантажується щоразу (на відміну від `architecture.md` і `conventions.md`, які підтягуються лише коли в роботі файли `app/src/**/*.ts`).
