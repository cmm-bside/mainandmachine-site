// scripts/audit.mjs — reusable copy-fix verification harness.
//
//   npm run audit
//
// Greps the served HTML/CSS for the specific issues we're fixing and prints
// per-file counts so we can watch each one go to zero across fix passes.
// Exit code is non-zero while any issue remains (CI-friendly), zero when clean.
//
// Checks:
//   1. Price ranges with spaces around an en-dash:  $X – $Y   (want: 0)
//   2. Straight quotes / apostrophes in *body copy* (tags, <script>, <style>,
//      JSON-LD and comments stripped first, so attribute quotes don't count).
//   3. Careers letter enumeration (the A/B/C/D `.cr-trait__n` list markers).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---- file scope: served HTML + the one stylesheet ------------------------
// Exclude scratch/probe files, deps, generated previews, and reports.
const EXCLUDE_DIRS = new Set([
  "node_modules", ".git", ".github", "scratchpad", "reports", "blog-data",
  "src", "data", "functions", "js", "images",
]);
const EXCLUDE_PATHS = new Set([
  "emails/preview", // generated local email previews
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(ROOT, abs);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      if ([...EXCLUDE_PATHS].some((p) => rel === p || rel.startsWith(p + "/"))) continue;
      walk(abs, out);
    } else if (entry.isFile()) {
      if (/\.(html|css)$/.test(entry.name)) out.push(rel);
    }
  }
  return out;
}

const files = walk(ROOT).sort();
const htmlFiles = files.filter((f) => f.endsWith(".html"));
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

// ---- helpers -------------------------------------------------------------
function countMatches(str, re) {
  const m = str.match(re);
  return m ? m.length : 0;
}

// Strip everything that isn't visible body copy: comments, <script>/<style>
// blocks (covers inline JSON-LD), then all remaining tags (and their
// attribute values, where most straight quotes legitimately live).
function bodyText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ");
}

// ---- check 1: spaced price ranges  ($X – $Y) -----------------------------
const PRICE_RE = /\$[0-9,]+ – \$[0-9,]+/g;
const priceHits = htmlFiles
  .map((f) => ({ f, n: countMatches(read(f), PRICE_RE) }))
  .filter((x) => x.n > 0);
const priceTotal = priceHits.reduce((s, x) => s + x.n, 0);

// ---- check 2: straight quotes/apostrophes in body copy -------------------
const QUOTE_RE = /["']/g;
const quoteHits = htmlFiles
  .map((f) => ({ f, n: countMatches(bodyText(read(f)), QUOTE_RE) }))
  .filter((x) => x.n > 0);
const quoteTotal = quoteHits.reduce((s, x) => s + x.n, 0);

// ---- check 3: Careers A/B/C/D enumeration markers ------------------------
const ENUM_RE = /cr-trait__n[^>]*>\s*[A-D]\s*</g;
const enumHits = htmlFiles
  .map((f) => ({ f, n: countMatches(read(f), ENUM_RE) }))
  .filter((x) => x.n > 0);
const enumTotal = enumHits.reduce((s, x) => s + x.n, 0);

// ---- check 4: rust accent stays a SINGLE css literal ---------------------
// Guards the rust consolidation. The only allowed rust hex in any CSS context
// (styles.css + inline <style> blocks) is the canonical --rust definition;
// everything else must reference var(--rust) or derive from it. Detection is
// by colour (HSL), not a fixed value — so it catches ANY reintroduced rust
// shade and survives a future change to the --rust value itself. Favicon
// data-URIs (<link>) and email templates are intentionally out of scope:
// they can't reference a CSS variable (documented literal exceptions).
function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function isRust(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  // orange-red, saturated, mid-light → rust. Excludes amber (~31°), inks,
  // cream, blueprint, browns (low saturation / out-of-band hue or lightness).
  return h >= 0 && h <= 27 && s >= 0.45 && l >= 0.2 && l <= 0.62;
}
const HEX_RE = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;
const rustHits = [];
function scanCss(file, text) {
  const isStylesheet = file.endsWith(".css");
  let inStyle = isStylesheet;
  text.split("\n").forEach((line, i) => {
    if (!isStylesheet && /<style[\s>]/i.test(line)) inStyle = true;
    if (inStyle) {
      for (const hex of line.match(HEX_RE) || []) {
        if (isRust(hex)) rustHits.push({ f: file, line: i + 1, hex });
      }
    }
    if (!isStylesheet && /<\/style>/i.test(line)) inStyle = false;
  });
}
scanCss("styles.css", read("styles.css"));
for (const f of htmlFiles) {
  const txt = read(f);
  if (txt.includes("<style")) scanCss(f, txt);
}
const rustLiteralCount = rustHits.length;
const rustViolations = Math.max(0, rustLiteralCount - 1); // 1 literal allowed: --rust

// ---- report --------------------------------------------------------------
function section(title, total, hits) {
  const flag = total === 0 ? "OK  " : "FAIL";
  console.log(`\n[${flag}] ${title}: ${total}`);
  for (const { f, n } of hits.sort((a, b) => b.n - a.n)) {
    console.log(`        ${String(n).padStart(4)}  ${f}`);
  }
}

console.log(`audit — scanned ${htmlFiles.length} HTML files + styles.css`);
section("1. Spaced price ranges  ($X – $Y)", priceTotal, priceHits);
section("2. Straight quotes/apostrophes in body copy", quoteTotal, quoteHits);
section("3. Careers A/B/C/D enumeration markers", enumTotal, enumHits);

// check 4 prints the literals it found (not a per-file count), so report it inline.
const rustFlag = rustViolations === 0 ? "OK  " : "FAIL";
console.log(`\n[${rustFlag}] 4. Rust hex literals in CSS (must be ≤1 — the --rust definition): ${rustLiteralCount}`);
for (const { f, line, hex } of rustHits) {
  console.log(`        ${hex}  ${f}:${line}`);
}
if (rustViolations > 0) {
  console.log(`        ^ ${rustViolations} stray rust literal(s) — replace with var(--rust) or a color-mix() derivation`);
}

const grand = priceTotal + quoteTotal + enumTotal + rustViolations;
console.log(`\n${"-".repeat(48)}`);
console.log(`TOTAL issues: ${grand}   (prices ${priceTotal} · quotes ${quoteTotal} · careers-enum ${enumTotal} · rust-strays ${rustViolations})`);
console.log(grand === 0 ? "ALL CLEAR\n" : "issues remain — re-run after each fix to watch counts drop\n");

process.exit(grand === 0 ? 0 : 1);
