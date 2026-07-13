#!/usr/bin/env node
// Render "What clients say" on / and /work/ from data/testimonials.json.
//
// The proof-shelf rule, enforced in code: a quote renders ONLY with
// permission: true (the client's written sign-off on file). Zero
// permissioned quotes → NOTHING renders — no placeholder, no empty shell;
// the section does not exist. This is the single path for these quotes —
// never hand-edit the rendered regions.
// Idempotent: regions are rewritten between TESTIMONIALS markers every run.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/config.mjs";

const DATA = path.join(ROOT, "data", "testimonials.json");
const PAGES = [path.join(ROOT, "index.html"), path.join(ROOT, "work", "index.html")];

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const data = JSON.parse(fs.readFileSync(DATA, "utf8"));
const signed = (data.testimonials || []).filter(
  (t) => t && t.permission === true && t.quote && t.name,
);

const SECTION = signed.length
  ? `<section class="section paper-2" data-screen-label="What clients say">
  <div class="wrap">
    <div class="head-block">
      <div>
        <span class="kicker">What clients say</span>
        <h2 class="h2 mt-s">In their words.</h2>
      </div>
      <p class="lead">Every quote here has the client’s written sign-off on file — the same rule the rest of this site holds for numbers. Nothing on this shelf is invented, softened, or anonymous.</p>
    </div>
    <div class="testi">
${signed
  .map(
    (t) => `      <blockquote>${esc(t.quote)}<cite>${esc(t.name)}${t.role ? ` — ${esc(t.role)}` : ""}${t.company ? `, ${esc(t.company)}` : ""}</cite></blockquote>`,
  )
  .join("\n")}
    </div>
  </div>
</section>`
  : "";

for (const page of PAGES) {
  let html = fs.readFileSync(page, "utf8");
  const re = /(<!-- TESTIMONIALS: rendered by scripts\/build-testimonials\.mjs — do not hand-edit -->)[\s\S]*?(<!-- \/TESTIMONIALS -->)/;
  if (!re.test(html)) {
    console.error(`[testimonials:build] ${path.relative(ROOT, page)}: markers missing`);
    process.exitCode = 1;
    continue;
  }
  html = html.replace(re, `$1${SECTION ? `\n${SECTION}\n` : "\n"}$2`);
  fs.writeFileSync(page, html);
}

console.log(
  `[testimonials:build] ${signed.length} signed-off quote(s) → ${signed.length ? "section rendered" : "section absent (no permissioned quotes — correct empty state)"} on / and /work/`,
);
