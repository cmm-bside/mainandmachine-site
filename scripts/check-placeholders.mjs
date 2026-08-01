#!/usr/bin/env node
// Post-build guard: no placeholder text ever reaches production.
// Scans the *visible* text of every rendered HTML page (comments, <script>,
// and <style> stripped) for stub markers and FAILS the build with the
// offending file + line. Designed empty states pass; stubs don't.
import fs from "node:fs";
import path from "node:path";
import { ROOT, LOCAL_SCRATCH_DIRS } from "./lib/config.mjs";

// Stub markers that must never reach production.
//
// "Fixture" earns its place the hard way: a failed beehiiv fetch once emitted
// "Fixture A." / "Fixture C." blog pages locally and every guard passed,
// because none of them knew the word (2026-07-31 audit). The rest cover the
// other ways unfinished copy gets shipped — sample content left in a card,
// a pro-forma number nobody replaced, an "illustrative" figure read as real.
const PATTERNS = [
  /\bTODO\b/,
  /\bTBD\b/,
  /\bTKTK\b/i,
  /lorem ipsum/i,
  /\bXXX\b/,
  /\bFixture\b/i,
  /\bfictional\b/i,
  /\bplaceholder\b/i,
  /\bto be added\b/i,
  /\bpro-forma\b/i,
  /\billustrative targets\b/i,
];

const pages = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".") || e.name === "emails") continue;
    // Local scratch copies of the site are not deploy output — scanning them
    // produces phantom failures that train people to ignore this guard.
    if (d === ROOT && LOCAL_SCRATCH_DIRS.has(e.name)) continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (e.name.endsWith(".html")) pages.push(f);
  }
})(ROOT);

// Attributes that carry real copy a reader or screen reader receives. Tag
// markup is otherwise stripped: `placeholder="you@company.com"` is an input
// hint, not page text, and matching it would make this guard cry wolf.
const CONTENT_ATTRS = /\b(?:alt|title|aria-label)=("([^"]*)"|'([^']*)')/gi;

const errors = [];
for (const page of pages) {
  const raw = fs.readFileSync(page, "utf8");
  // Blank non-visible regions but keep line structure so line numbers stay true.
  const blank = (m) => m.replace(/[^\n]/g, " ");
  const stripped = raw
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<script\b[\s\S]*?<\/script>/gi, blank)
    .replace(/<style\b[\s\S]*?<\/style>/gi, blank);
  // Text nodes only, plus the content-bearing attribute values pulled back in.
  const visible = stripped.replace(/<[^>]*>/g, (tag) => {
    const kept = [...tag.matchAll(CONTENT_ATTRS)].map((m) => m[2] ?? m[3] ?? "").join(" ");
    return blank(tag).slice(0, Math.max(0, tag.length - kept.length)) + kept;
  });
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
