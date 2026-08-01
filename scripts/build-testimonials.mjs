#!/usr/bin/env node
// Render client quotes from data/testimonials.json — the ONE source.
//
// The proof-shelf rule, enforced in code: a quote renders ONLY with
// permission: true (the client's written sign-off on file). Zero
// permissioned quotes -> NOTHING renders anywhere — no placeholder, no
// empty shell. Removing permission: true removes the quote from every
// surface on the next rebuild. Never hand-edit the rendered regions.
//
// Surfaces (all driven by markers, all rewritten on every run):
//   FULL     /  and  /work/            — "In their words." section, all signed quotes
//   FEATURED /work/marcus/results/     — one B:Side-attributed quote only (featured:
//                                        true wins, else first B:Side quote). A quote
//                                        from any other client NEVER renders on the
//                                        MARCUS page — wrong attribution is worse
//                                        than no quote.
//   RAIL     /book/                    — one-line version in the booking rail
//                                        (uses `short` if present, else the full quote
//                                        — never machine-truncated)
//
// Optional fields per entry: featured (boolean), short (string, a client-approved
// shorter cut of the same quote — part of the same written sign-off).
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/config.mjs";

const DATA = path.join(ROOT, "data", "testimonials.json");
const FULL_PAGES = [path.join(ROOT, "index.html"), path.join(ROOT, "work", "index.html")];
const RESULTS_PAGE = path.join(ROOT, "work", "marcus", "results", "index.html");
const BOOK_PAGE = path.join(ROOT, "book", "index.html");

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
const cite = (t) =>
  `${esc(t.name)}${t.role ? ` — ${esc(t.role)}` : ""}${t.company ? `, ${esc(t.company)}` : ""}`;

// ---- FULL section (/ and /work/) ----
const FULL_SECTION = signed.length
  ? `<section class="section paper-2">
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
  .map((t) => `      <blockquote>${esc(t.quote)}<cite>${cite(t)}</cite></blockquote>`)
  .join("\n")}
    </div>
  </div>
</section>`
  : "";

// ---- FEATURED quote (results page): B:Side-attributed only ----
const bside = signed.filter((t) => /b[:\s-]?side/i.test(t.company || ""));
const feat = bside.find((t) => t.featured === true) || bside[0] || null;
const FEATURED_SECTION = feat
  ? `<section class="section paper-2">
  <div class="wrap">
    <div class="head-block">
      <div>
        <span class="kicker">In their words</span>
        <h2 class="h2 mt-s">The client, on the record.</h2>
      </div>
      <p class="lead">Written sign-off on file — the same rule as every number above.</p>
    </div>
    <div class="testi">
      <blockquote>${esc(feat.quote)}<cite>${cite(feat)}</cite></blockquote>
    </div>
  </div>
</section>`
  : "";

// ---- RAIL panel (/book/) ----
const railQuote = feat || signed[0] || null;
const RAIL_PANEL = railQuote
  ? `<div class="panel">
          <h2 class="panel__t">From a client</h2>
          <p>“${esc(railQuote.short || railQuote.quote)}”</p>
          <p style="margin-top:12px;"><b>— ${cite(railQuote)}</b></p>
        </div>`
  : "";

let failures = 0;
function stamp(file, re, content, label) {
  let html = fs.readFileSync(file, "utf8");
  if (!re.test(html)) {
    console.error(`[testimonials:build] ${path.relative(ROOT, file)}: ${label} markers missing`);
    failures += 1;
    return;
  }
  html = html.replace(re, (_, open, close) => `${open}${content ? `\n${content}\n` : "\n"}${close}`);
  fs.writeFileSync(file, html);
}

const RE_FULL =
  /(<!-- TESTIMONIALS: rendered by scripts\/build-testimonials\.mjs — do not hand-edit -->)[\s\S]*?(<!-- \/TESTIMONIALS -->)/;
const RE_RAIL =
  /(<!-- TESTIMONIALS:RAIL — rendered by scripts\/build-testimonials\.mjs — do not hand-edit -->)[\s\S]*?(<!-- \/TESTIMONIALS:RAIL -->)/;

for (const page of FULL_PAGES) stamp(page, RE_FULL, FULL_SECTION, "FULL");
stamp(RESULTS_PAGE, RE_FULL, FEATURED_SECTION, "FEATURED");
stamp(BOOK_PAGE, RE_RAIL, RAIL_PANEL, "RAIL");
if (failures) process.exitCode = 1;

console.log(
  `[testimonials:build] ${signed.length} signed-off quote(s) — full: ${FULL_SECTION ? "rendered" : "absent"} (/, /work/) · featured: ${FEATURED_SECTION ? "rendered" : "absent"} (results) · rail: ${RAIL_PANEL ? "rendered" : "absent"} (/book/)${signed.length ? "" : " — correct empty state"}`,
);
