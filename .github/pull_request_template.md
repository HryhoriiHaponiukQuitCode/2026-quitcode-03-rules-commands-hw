<!-- Заголовок PR: WS3: <Ім'я Прізвище> -->

## Учасник

**Ім'я та Прізвище:**

<!-- ⚠️ ОБОВ'ЯЗКОВЕ ПОЛЕ. Впишіть повне ім'я, напр.: Олена Петренко.
     GitHub-логін не завжди дозволяє вас ідентифікувати, а сертифікат
     виписується на реальне ім'я. -->

**Основний інструмент:** <!-- Claude Code чи Cursor, і версія -->

## Що зроблено

- [ ] **Task A:** `architecture`, `conventions`, `do-not-touch` у `.claude/rules/` або `.cursor/rules/`, у кожного — «Як перевірити»
- [ ] **Task B:** оновлений `AGENTS.md`; `CLAUDE.md` з `@AGENTS.md`; перевірка завантаження в `docs/verification.md`
- [ ] **Task C:** команди `analyze-error`, `refactor`, `generate-integration` + три прогони в `docs/verification.md`
- [ ] **Task D:** `docs/ab-validation.md` з обома прогонами: поведінка агента, числа `check:rules` і `npm test` (+ діфи в `docs/ab/`, якщо агент змінював файли)
- [ ] **Task E (bonus):** хук, що блокує зміни в `app/src/core/**`
- [ ] `npm test` зелений; `app/src/core/**`, `app/scripts/**`, `materials/**` не змінені

## Яке правило спрацювало найсильніше

<!-- і як ви це побачили: число, діф, поведінка агента -->

## Що показала A/B-перевірка

<!-- коротко: B (без правил) → A (з правилами), або чесне «різниці немає» і чому -->

---
CodeRabbit зробить рев'ю. Якщо воно не з'явилося за кілька хвилин — додайте коментар `@coderabbitai review`.
Інші команди: `@coderabbitai summary`, `@coderabbitai help`.
