#!/usr/bin/env node
// check:rules — static check of the project rules from materials/architecture-brief.md.
//
//   npm run check:rules              report, always exits 0
//   npm run check:rules -- --strict  exits 1 if there is any violation (CI, hooks)
//
// Task D (A/B validation): run it after each arm and compare the numbers.
// This file is part of the assignment — do not edit it.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(appDir, "src");
const coreDir = join(srcDir, "core");
const lockPath = join(appDir, "scripts", "core.lock.json");
const args = new Set(process.argv.slice(2));

const toPosix = (path) => path.split(sep).join("/");
const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

function walk(dir, keep) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, keep));
    else if (keep(entry.name)) files.push(full);
  }
  return files.sort();
}

function coreHashes() {
  const hashes = {};
  for (const file of walk(coreDir, () => true)) hashes[toPosix(relative(appDir, file))] = sha256(read(file));
  return hashes;
}

if (args.has("--write-lock")) {
  writeFileSync(lockPath, JSON.stringify(coreHashes(), null, 2) + "\n");
  console.log(`core lock written: ${toPosix(relative(appDir, lockPath))}`);
  process.exit(0);
}

const LINE_RULES = [
  {
    id: "http-via-core",
    pattern: /\bfetch\s*\(/,
    owner: "src/core/http.ts",
    hint: "HTTP only through postJson() from src/core/http.ts",
  },
  {
    id: "env-via-config",
    pattern: /\bprocess\.env\b/,
    owner: "src/core/config.ts",
    hint: "environment only through readEnv() from src/core/config.ts",
  },
  {
    id: "json-via-parse",
    pattern: /\bJSON\.parse\s*\(/,
    owner: "src/core/parse.ts",
    hint: "JSON only through parseJson(text, guard) from src/core/parse.ts",
  },
  {
    id: "log-via-logger",
    pattern: /\bconsole\.(?:log|info|warn|error|debug)\s*\(/,
    owner: "src/core/log.ts",
    hint: "logging only through log from src/core/log.ts (it redacts secrets)",
  },
  {
    id: "no-any",
    pattern: /:\s*any\b|\bas\s+any\b|<any>/,
    owner: null,
    hint: "no `any`: use `unknown` plus a guard",
  },
  {
    id: "no-new-deps",
    pattern: /\bfrom\s+["'](?![./]|node:)[^"']+["']|^\s*import\s+["'](?![./]|node:)|\b(?:import|require)\s*\(\s*["'](?![./]|node:)/,
    owner: null,
    hint: "no third-party packages: the app has zero runtime dependencies",
  },
];

const RULE_IDS = [...LINE_RULES.map((rule) => rule.id), "core-untouched"];
const HINTS = {
  ...Object.fromEntries(LINE_RULES.map((rule) => [rule.id, rule.hint])),
  "core-untouched": "src/core/** is protected: no edits, additions or deletions",
};

// Comments are blanked out (not removed) so that line numbers stay correct.
function blankComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/^([ \t]*)\/\/.*$/gm, (line, indent) => indent + " ".repeat(line.length - indent.length));
}

const violations = [];
const sources = walk(srcDir, (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"));

for (const file of sources) {
  const rel = toPosix(relative(appDir, file));
  blankComments(read(file))
    .split("\n")
    .forEach((line, index) => {
      for (const rule of LINE_RULES) {
        if (rule.owner !== rel && rule.pattern.test(line)) {
          violations.push({ rule: rule.id, file: rel, where: `line ${index + 1}` });
        }
      }
    });
}

const pkg = JSON.parse(read(join(appDir, "package.json")));
for (const name of Object.keys(pkg.dependencies ?? {})) {
  violations.push({ rule: "no-new-deps", file: "package.json", where: `dependency "${name}"` });
}

if (!existsSync(lockPath)) {
  violations.push({ rule: "core-untouched", file: "scripts/core.lock.json", where: "lock file missing" });
} else {
  const locked = JSON.parse(read(lockPath));
  const current = coreHashes();
  for (const [file, hash] of Object.entries(locked)) {
    if (!(file in current)) violations.push({ rule: "core-untouched", file, where: "deleted" });
    else if (current[file] !== hash) violations.push({ rule: "core-untouched", file, where: "modified" });
  }
  for (const file of Object.keys(current)) {
    if (!(file in locked)) violations.push({ rule: "core-untouched", file, where: "added" });
  }
}

console.log(`check:rules — ${sources.length} source files, ${RULE_IDS.length} rules\n`);

if (violations.length > 0) {
  const width = Math.max(...violations.map((v) => v.file.length));
  for (const v of violations) console.log(`  ${v.file.padEnd(width)}  ${v.rule.padEnd(15)}  ${v.where}`);
  console.log("");
}

console.log("by rule:");
for (const id of RULE_IDS) {
  const count = violations.filter((v) => v.rule === id).length;
  console.log(`  ${id.padEnd(15)} ${String(count).padStart(3)}${count > 0 ? `   ${HINTS[id]}` : ""}`);
}

const byFile = new Map();
for (const v of violations) byFile.set(v.file, (byFile.get(v.file) ?? 0) + 1);
if (byFile.size > 0) {
  const width = Math.max(...[...byFile.keys()].map((file) => file.length));
  console.log("\nby file:");
  for (const [file, count] of byFile) console.log(`  ${file.padEnd(width)}  ${String(count).padStart(3)}`);
}

console.log(`\nTOTAL: ${violations.length} violation(s)`);
if (args.has("--strict") && violations.length > 0) process.exit(1);
