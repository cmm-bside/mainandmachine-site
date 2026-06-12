#!/usr/bin/env node
// Render /work's proof-shelf figures from data/build-log.json.
//
// The "A sample week" strip renders ONLY when week_of and all three numbers
// are non-null; otherwise the committed designed empty state stays in place.
// "In their words" renders ONLY for quotes with signed_off: true.
// This is the single path for numbers onto /work — never hand-edit them.
// Idempotent: regions are rewritten between BUILD-LOG markers on every run.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/config.mjs";

const PAGE = path.join(ROOT, "work", "index.html");
const DATA = path.join(ROOT, "data", "build-log.json");

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const log = JSON.parse(fs.readFileSync(DATA, "utf8"));
let html = fs.readFileSync(PAGE, "utf8");

function replaceRegion(name, inner) {
  const re = new RegExp(`(<!-- BUILD-LOG:${name}\\b[\\s\\S]*?-->)[\\s\\S]*?(<!-- /BUILD-LOG:${name} -->)`);
  if (!re.test(html)) {
    console.error(`[work:build] BUILD-LOG:${name} markers missing in work/index.html`);
    process.exit(1);
  }
  html = html.replace(re, `$1\n${inner}\n        $2`);
}

// --- stats ------------------------------------------------------------------
const statsReady =
  log.week_of != null &&
  log.requests_handled != null &&
  log.drafts_overruled != null &&
  log.minutes_saved != null;

const EMPTY_STATE = `        <div class="case__log">
          <span class="tick-lbl">The log is running</span>
          <p>The intake agent started keeping score in June 2026. The first full month of numbers publishes here once we can verify them — the same standard we hold for client claims.</p>
        </div>`;

const STATS = `        <span class="tick-lbl" style="display:block;margin-bottom:10px;">Week of ${esc(log.week_of)}</span>
        <div class="case__stats">
          <div class="case__stat"><span class="tick-lbl">Requests handled</span><span class="stat-val">${esc(log.requests_handled)}</span></div>
          <div class="case__stat"><span class="tick-lbl">Drafts overruled</span><span class="stat-val">${esc(log.drafts_overruled)}</span></div>
          <div class="case__stat"><span class="tick-lbl">Minutes saved</span><span class="stat-val">${esc(log.minutes_saved)}</span></div>
        </div>`;

replaceRegion("STATS", statsReady ? STATS : EMPTY_STATE);

// --- quotes -----------------------------------------------------------------
const signed = (log.quotes || []).filter((q) => q && q.signed_off === true && q.text);
const QUOTES = signed.length
  ? `      <div class="case__quote">
        <span class="tick-lbl">In their words</span>
${signed
  .map(
    (q) => `        <blockquote>${esc(q.text)}<cite>— ${esc(q.name)}${q.role ? `, ${esc(q.role)}` : ""}</cite></blockquote>`
  )
  .join("\n")}
      </div>`
  : "";

replaceRegion("QUOTES", QUOTES);

fs.writeFileSync(PAGE, html);
console.log(
  `[work:build] stats: ${statsReady ? `week of ${log.week_of}` : "empty state (log is running)"} · quotes: ${signed.length} signed-off`
);
