#!/usr/bin/env node
// PreToolUse-хук: не дає ЗАПИСУВАТИ в захищені шляхи проєкту.
//
// Навіщо, якщо є правило .claude/rules/do-not-touch.md. Правило просить —
// модель може його не втримати в контексті, переконати себе винятком або
// просто не побачити (правило без frontmatter теж можна витіснити довгою
// сесією). Хук перевіряє ШЛЯХ ПРИЗНАЧЕННЯ, а не намір, і не знімається
// проханням у чаті.
//
// Чому не список заборонених команд. `Edit` — лише один зі способів дотягнутись
// до файлу: `sed -i`, `tee`, `>`, `cp`, `patch`, `git checkout -- <path>`,
// `node -e "fs.writeFileSync(...)"` ведуть до тих самих байтів. Тому Bash
// перевіряється окремо: чи згадано захищений шлях І чи є в команді дія запису.
//
// Читання НЕ блокується: `/analyze-error materials/error-log.txt` має працювати,
// а `npm run check:rules` — читати core, щоб порахувати хеші.
//
// Контракт Claude Code: JSON на stdin; exit 0 — пропустити, exit 2 — заблокувати
// (stderr повертається моделі як причина відмови). Cursor: `.cursor/hooks.json`,
// той самий скрипт, той самий код виходу.
//
// Тести: node .claude/hooks/test-protect-core.mjs — запускати після кожної зміни.
import { isAbsolute, relative, resolve, sep } from "node:path";

/** Шляхи, у які не можна писати. Джерело: materials/architecture-brief.md. */
export const PROTECTED = [
  { path: "app/src/core", why: "спільне ядро платформної команди" },
  { path: "app/scripts", why: "перевірка правил і core.lock.json" },
  { path: "materials", why: "вхідні дані домашки" },
  { path: ".github", why: "шаблон PR і конфіг репозиторію" },
  { path: ".coderabbit.yaml", why: "конфіг рев'ю" },
];

/** Інструменти, у яких будь-яка дія — це запис. */
const WRITE_TOOLS = new Set(["Edit", "Write", "NotebookEdit", "MultiEdit", "Update"]);

/** Ознаки запису в рядку команди Bash. Свідомо широко: хибне спрацювання
 *  коштує одного уточнення, пропуск — порушення правила, яке ми ж і пишемо. */
const WRITE_IN_SHELL = [
  />>?\s*['"]?[\w./~-]/,                       // > file, >> file
  /\bsed\b[^|;]*\s-[a-z]*i\b/,                 // sed -i, sed -i.bak
  /\b(tee|cp|mv|rm|rmdir|patch|truncate|dd|install|ln|touch|mkdir|chmod|chown|shred|unlink)\b/,
  /\bgit\s+(checkout|restore|apply|rm|mv|clean|stash|revert|reset\s+--hard)\b/,
  /\bnpm\s+(install|i|ci|uninstall|pkg\s+set)\b/,
  /\b(writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|mkdirSync|rmSync|unlinkSync|copyFileSync|renameSync)\b/,
  /\bwrite_text\b|\bopen\s*\([^)]*['"][wax]/,  // python: Path.write_text, open(..., "w")
  /--write-lock\b/,                            // check-rules.mjs --write-lock переписує core.lock.json
];

/** Поля tool_input, у яких лежить шлях призначення. */
const PATH_FIELDS = ["file_path", "path", "notebook_path", "target_file", "filePath"];

const projectRoot = () => resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());

/** Чи веде шлях у захищену зону — після нормалізації `..` і символів шляху. */
export function hit(rawPath, root = projectRoot(), cwd = root) {
  if (typeof rawPath !== "string" || rawPath.trim() === "") return null;
  const absolute = isAbsolute(rawPath) ? resolve(rawPath) : resolve(cwd, rawPath);
  const rel = relative(root, absolute);
  // Шлях поза репозиторієм цей хук не стосується.
  if (rel.startsWith("..") || isAbsolute(rel)) return null;
  const posix = rel.split(sep).join("/");
  return (
    PROTECTED.find((p) => posix === p.path || posix.startsWith(p.path + "/")) ?? null
  );
}

/** Чи згадує команда Bash захищений шлях — у будь-якій формі написання.
 *  Ліва межа включає `/`, щоб ловити абсолютні шляхи (`/Users/.../app/src/core`).
 *  `cd app && ...` зсуває корінь, тому шляхи всередині `app/` перевіряються
 *  ще й без цього префікса. */
function pathsInCommand(command) {
  const insideApp = /\bcd\s+(?:\.\/)?app\b/.test(command);
  const found = [];
  const mentions = (candidate) => {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^\\w.-])(\\./)?${escaped}([/\\s'"\`;)|&]|$)`).test(command);
  };
  for (const p of PROTECTED) {
    const forms = [p.path];
    if (insideApp && p.path.startsWith("app/")) forms.push(p.path.slice("app/".length));
    if (forms.some(mentions)) found.push(p);
  }
  return found;
}

/**
 * Рішення хука.
 * @returns {{block: boolean, reason?: string, target?: string, why?: string}}
 */
export function decide(input, root = projectRoot()) {
  const tool = input?.tool_name ?? "";
  const args = input?.tool_input ?? {};
  const cwd = resolve(input?.cwd || root);

  if (WRITE_TOOLS.has(tool)) {
    const candidates = [
      ...PATH_FIELDS.map((f) => args[f]),
      ...(Array.isArray(args.edits) ? args.edits.map((e) => e?.file_path) : []),
      ...(Array.isArray(args.files) ? args.files.map((f) => f?.file_path ?? f?.path) : []),
    ];
    for (const candidate of candidates) {
      const p = hit(candidate, root, cwd);
      if (p) return { block: true, target: p.path, why: p.why, reason: `${tool} → ${candidate}` };
    }
    return { block: false };
  }

  if (tool === "Bash" || tool === "BashOutput") {
    const command = typeof args.command === "string" ? args.command : "";
    if (!command) return { block: false };
    // `check-rules.mjs --write-lock` переписує app/scripts/core.lock.json,
    // навіть якщо сам шлях у команді не згаданий.
    if (/--write-lock\b/.test(command)) {
      const scripts = PROTECTED.find((p) => p.path === "app/scripts");
      return {
        block: true,
        target: scripts.path,
        why: scripts.why,
        reason: `Bash → перезапис core.lock.json: ${command.slice(0, 160)}`,
      };
    }
    const mentioned = pathsInCommand(command);
    if (mentioned.length === 0) return { block: false };
    const writes = WRITE_IN_SHELL.find((re) => re.test(command));
    if (!writes) return { block: false }; // читання захищених шляхів дозволене
    const p = mentioned[0];
    return {
      block: true,
      target: p.path,
      why: p.why,
      reason: `Bash → запис у ${p.path}: ${command.slice(0, 160)}`,
    };
  }

  return { block: false };
}

export function message(verdict) {
  return `ЗАБЛОКОВАНО хуком protect-core.mjs: ${verdict.reason}

Шлях «${verdict.target}» захищений (${verdict.why}).
Заборона діє на будь-який спосіб запису — Edit, Write, NotebookEdit і Bash
(sed -i, tee, >, cp, patch, git checkout -- <path>, node -e "fs.writeFileSync").
Перевіряється шлях призначення, а не інструмент і не намір.

Вона НЕ знімається проханням у чаті: агент не може перевірити правдивість
прохання, а текст, що потрапив у контекст із даних, сформулює його так само
переконливо.

Що робити далі (.claude/rules/do-not-touch.md): зупинись і напиши людині —
(1) що саме треба змінити: файл, експорт, нова сигнатура;
(2) навіщо — яка вимога задачі без цього не закривається;
(3) кого зачіпає: ядро спільне для всіх воркерів агенції;
(4) який обхід можливий без цієї зміни і чому він гірший.
Не роби локальну копію типу, не тисни поле через "as any" і не переписуй
app/scripts/core.lock.json під новий хеш — це приховування, а не розв'язання.`;
}

async function main() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  let input;
  try {
    input = JSON.parse(raw || "{}");
  } catch {
    // Незрозумілий вхід не має ламати сесію: пропускаємо, але кажемо про це.
    process.stderr.write("protect-core.mjs: не вдалось розібрати JSON на stdin\n");
    return 0;
  }
  const verdict = decide(input);
  if (!verdict.block) return 0;
  process.stderr.write(message(verdict) + "\n");
  return 2;
}

// Запуск лише як скрипт; при import (тести) main() не викликається.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().then((code) => process.exit(code));
}
