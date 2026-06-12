#!/usr/bin/env node
// Post-build guard: no placeholder text ever reaches production.
// Scans the *visible* text of every rendered HTML page (comments, <script>,
// and <style> stripped) for stub markers and FAILS the build with the
// offending file + line. Designed empty states pass; stubs don't.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/config.mjs";

const PATTERNS = [/\bTODO\b/, /\bTBD\b/, /\bTKTK\b/i, /lorem ipsum/i, /\bXXX\b/];

const pages = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".") || e.name === "emails") continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (e.name.endsWith(".html")) pages.push(f);
  }
})(ROOT);

const errors = [];
for (const page of pages) {
  const raw = fs.readFileSync(page, "utf8");
  // Strip non-visible regions but keep line structure so line numbers stay true.
  const blank = (m) => m.replace(/[^\n]/g, " ");
  const visible = raw
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<script\b[\s\S]*?<\/script>/gi, blank)
    .replace(/<style\b[\s\S]*?<\/style>/gi, blank);
  visible.split("\n").forEach((line, i) => {
    for (const p of PATTERNS) {
      if (p.test(line)) {
        errors.push(`${path.relative(ROOT, page)}:${i + 1} — ${p} — ${line.trim().slice(0, 90)}`);
      }
    }
  });
}

if (errors.length) {
  console.error(`[placeholders:check] FAILED — placeholder text in rendered output:`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`[placeholders:check] OK — no placeholder text in ${pages.length} rendered pages.`);
