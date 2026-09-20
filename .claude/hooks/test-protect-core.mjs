#!/usr/bin/env node
// Тести хука protect-core.mjs: спроби обходу + перевірка, що потрібне НЕ зламано.
//
// Урок WS2: правило існує не тоді, коли записане, а тоді, коли перевірене
// спробою порушення. Кожен кейс нижче — реальний шлях до тих самих байтів.
//
//   node .claude/hooks/test-protect-core.mjs
//   exit 0 — усі кейси пройшли, exit 1 — є провал.
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decide } from "./protect-core.mjs";

const HOOK = fileURLToPath(new URL("./protect-core.mjs", import.meta.url));
const ROOT = resolve(dirname(HOOK), "..", "..");

const edit = (file_path, tool = "Edit") => ({ tool_name: tool, tool_input: { file_path }, cwd: ROOT });
const bash = (command) => ({ tool_name: "Bash", tool_input: { command }, cwd: ROOT });

/** [опис, вхід, очікування: true = заблокувати] */
const CASES = [
  // --- прямий запис інструментами ---
  ["Edit у ядро", edit("app/src/core/log.ts"), true],
  ["Write у ядро", edit("app/src/core/new-helper.ts", "Write"), true],
  ["NotebookEdit у ядро", edit("app/src/core/x.ipynb", "NotebookEdit"), true],
  ["абсолютний шлях у ядро", edit(`${ROOT}/app/src/core/http.ts`), true],
  ["шлях із ./", edit("./app/src/core/types.ts"), true],
  ["обхід через ..", edit("app/src/integrations/../core/log.ts"), true],
  ["подвійний обхід", edit("app/src/core/../core/../core/parse.ts"), true],
  ["лок-файл перевірки", edit("app/scripts/core.lock.json"), true],
  ["сам скрипт перевірки", edit("app/scripts/check-rules.mjs"), true],
  ["вхідні дані домашки", edit("materials/error-log.txt"), true],
  ["шаблон PR", edit(".github/pull_request_template.md"), true],
  ["конфіг рев'ю", edit(".coderabbit.yaml"), true],
  ["MultiEdit зі списком edits", {
    tool_name: "MultiEdit",
    tool_input: { edits: [{ file_path: "app/src/sync/run.ts" }, { file_path: "app/src/core/log.ts" }] },
    cwd: ROOT,
  }, true],

  // --- обхід через Bash ---
  ["sed -i", bash("sed -i '' '1i\\\n// hi' app/src/core/log.ts"), true],
  ["перенаправлення >", bash("echo '// hi' > app/src/core/log.ts"), true],
  ["дописування >>", bash("echo '// hi' >> app/src/core/types.ts"), true],
  ["tee", bash("echo x | tee app/src/core/log.ts"), true],
  ["cp поверх ядра", bash("cp /tmp/log.ts app/src/core/log.ts"), true],
  ["mv поверх ядра", bash("mv /tmp/log.ts app/src/core/log.ts"), true],
  ["rm у ядрі", bash("rm app/src/core/parse.ts"), true],
  ["node -e fs.writeFileSync", bash("node -e \"require('fs').writeFileSync('app/src/core/log.ts','x')\""), true],
  ["python write_text", bash("python3 -c \"from pathlib import Path; Path('app/src/core/log.ts').write_text('x')\""), true],
  ["git checkout -- ядро", bash("git checkout upstream/main -- app/src/core"), true],
  ["git apply патча в ядро", bash("git apply /tmp/core.patch && touch app/src/core/x.ts"), true],
  ["переписати core.lock.json", bash("cd app && node scripts/check-rules.mjs --write-lock"), true],
  ["patch у materials", bash("patch materials/error-log.txt < /tmp/p.diff"), true],
  ["абсолютний шлях у Bash", bash(`echo x > ${ROOT}/app/src/core/log.ts`), true],

  // --- те, що НЕ можна ламати (хибні спрацювання) ---
  ["Edit у integrations", edit("app/src/integrations/sheets-append.ts"), false],
  ["Write нової інтеграції", edit("app/src/integrations/telegram-notify.ts", "Write"), false],
  ["Edit у sync", edit("app/src/sync/state.ts"), false],
  ["Edit правила", edit(".claude/rules/conventions.md"), false],
  ["читання лога інциденту", bash("cat materials/error-log.txt"), false],
  ["grep по materials", bash("grep -n ENOSPC materials/error-log.txt"), false],
  ["читання ядра", bash("cat app/src/core/http.ts"), false],
  ["check:rules читає ядро", bash("cd app && npm run check:rules"), false],
  ["npm test", bash("cd app && npm test"), false],
  ["запис поза захищеними шляхами", bash("echo x > docs/verification.md"), false],
  ["схожа назва, інший шлях", edit("docs/materials-notes.md"), false],
  ["core у назві файлу, не в шляху", edit("app/src/integrations/core-crm.ts"), false],
  ["файл поза репозиторієм", edit("/tmp/scratch/core/log.ts"), false],
];

let failed = 0;
for (const [name, input, expected] of CASES) {
  const got = decide(input, ROOT).block;
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? "  ok  " : "FAIL  "}${expected ? "блок" : "пропуск"}  ${name}`);
}

// --- перевірка реального контракту: код виходу і stderr справжнього процесу ---
console.log("\nконтракт процесу (stdin JSON → exit code):");
const wire = [
  ["блокує з кодом 2", edit("app/src/core/log.ts"), 2],
  ["пропускає з кодом 0", edit("app/src/integrations/slack-notify.ts"), 0],
  ["зламаний JSON не валить сесію", null, 0],
];
for (const [name, input, expectedCode] of wire) {
  const run = spawnSync(process.execPath, [HOOK], {
    input: input === null ? "{not json" : JSON.stringify(input),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT },
  });
  const ok = run.status === expectedCode && (expectedCode !== 2 || run.stderr.includes("ЗАБЛОКОВАНО"));
  if (!ok) failed++;
  console.log(`${ok ? "  ok  " : "FAIL  "}exit ${run.status} (очікували ${expectedCode})  ${name}`);
}

console.log(`\n${CASES.length + wire.length} кейсів, провалів: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
