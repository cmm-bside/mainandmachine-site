#!/usr/bin/env node
// Render every proof-shelf figure from data/build-log.json into the pages that
// display it, between <!-- BUILD-LOG:NAME --> … <!-- /BUILD-LOG:NAME --> markers.
//
// This is the SINGLE path for these numbers — never hand-edit a rendered figure.
// Idempotent: each region is rewritten from data on every run, so a stale number
// cannot survive a build. A marker with no data renders the designed empty
// state; a page with no markers is skipped without failing.
//
// Contract (CLAUDE.md, "Proof shelf rule"):
//   · "A sample week" renders only when week_of and all three numbers are set.
//   · "In their words" renders only quotes with signed_off: true.
//   · MARCUS figures render only when marcus.signed_off is true.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/config.mjs";

const DATA = path.join(ROOT, "data", "build-log.json");
const log = JSON.parse(fs.readFileSync(DATA, "utf8"));
const mk = log.marcus || {};
const marcusReady = mk.signed_off === true;

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const figures = new Map((mk.figures || []).map((f) => [f.key, f]));
const scorecard = mk.scorecard || [];
const byKey = (k) => figures.get(k) || scorecard.find((f) => f.key === k);

// --- shared fragments -------------------------------------------------------
// A figure's number + unit. The unit is a <small> so the tile reads as one
// value; the accessible name stays the plain concatenation.
const num = (f) => `${esc(f.value)}${f.unit ? `<small>${esc(f.unit)}</small>` : ""}`;

const tile = (f) =>
  `          <div class="fig" data-figure="${esc(f.key)}">
            <div class="fig__n tick-num">${num(f)}</div>
            <p class="fig__d">${esc(f.desc)}</p>
          </div>`;

const tileGrid = (list, extraClass = "") =>
  list.length
    ? `        <div class="figs${extraClass ? ` ${extraClass}` : ""}">
${list.map(tile).join("\n")}
        </div>`
    : "";

// Scorecard tiles on ink (the headline four).
const scoreTile = (f) =>
  `          <div class="score" data-figure="${esc(f.key)}">
            <div class="score__n tick-num">${num(f)}</div>
            <p class="score__d">${esc(f.desc)}</p>
          </div>`;

// --- region builders --------------------------------------------------------
const REGIONS = {};

if (marcusReady) {
  // The headline four, full width, on ink.
  REGIONS["MARCUS-SCORECARD"] = `        <div class="scoregrid">
${scorecard.map(scoreTile).join("\n")}
        </div>`;

  // Compact variant for /work/ and the MARCUS narrative page.
  REGIONS["MARCUS-SCORECARD-COMPACT"] = `      <div class="scoregrid scoregrid--compact">
${scorecard
  .map(
    (f) => `        <div class="score" data-figure="${esc(f.key)}">
          <div class="score__n tick-num">${num(f)}</div>
          <p class="score__d">${esc(f.desc)}</p>
        </div>`
  )
  .join("\n")}
      </div>`;

  // Three headline outcomes for the homepage "Example builds" module.
  const highlights = (mk.highlight_keys || []).map(byKey).filter(Boolean);
  REGIONS["MARCUS-HOME"] = `          <div class="bstat">
${highlights
  .map(
    (f) => `            <div class="bstat__i" data-figure="${esc(f.key)}">
              <span class="bstat__n tick-num">${num(f)}</span>
              <span class="tick-lbl">${esc(shortLabel(f.key))}</span>
            </div>`
  )
  .join("\n")}
          </div>`;

  // Per-section tile grids (01–07).
  for (const n of ["01", "02", "03", "04", "05", "06", "07"]) {
    const list = (mk.figures || []).filter((f) => f.section === n);
    REGIONS[`MARCUS-FIGS-${n}`] = tileGrid(list, list.length === 4 ? "figs--4" : "");
  }

  // Before / after bars. Widths are data, not CSS.
  REGIONS["MARCUS-BA"] = `        <div class="ba">
${(mk.before_after || [])
  .map(
    (r) => `          <div class="ba__row" data-figure="${esc(r.key)}">
            <div class="ba__what">${esc(r.what)}</div>
            <div class="ba__bars">
              <div class="ba__bar ba__bar--before" style="width:${Number(r.before_pct)}%"><span>before &middot; ${esc(r.before)}</span></div>
              <div class="ba__bar ba__bar--after" style="width:${Number(r.after_pct)}%"><span>after &middot; ${esc(r.after)}</span></div>
            </div>
          </div>`
  )
  .join("\n")}
        </div>`;

  // Approve / send back / escalate.
  REGIONS["MARCUS-BOUNDARY"] = `        <div class="bound">
${(mk.boundary || [])
  .map(
    (b) => `          <div class="bound__i" data-figure="${esc(b.key)}">
            <span class="tick-lbl">${esc(b.label)}</span>
            <div class="bound__n tick-num">${num(b)}</div>
            <p class="bound__d">${esc(b.desc)}</p>
          </div>`
  )
  .join("\n")}
        </div>`;

  // Measurement-window disclosure — the differentiation, so it is data too.
  REGIONS["MARCUS-WINDOW"] = `        <p class="window-note">Measurement window: the ${esc(mk.measurement_window)}. ${esc(mk.window_note)}</p>`;

  // One-line inline references on the industry and security pages.
  for (const [slug, key] of Object.entries(mk.inline || {})) {
    const f = byKey(key);
    if (!f) continue;
    REGIONS[`MARCUS-INLINE-${slug.toUpperCase()}`] =
      `<b>${esc(f.value)}${esc(f.unit ? " " + f.unit : "")}</b>`;
  }
}

function shortLabel(key) {
  return (
    {
      "hours-returned": "Prep hours returned, 90 days",
      "weekly-adoption": "Weekly use by week six",
      "identifiers-out": "Identifiers sent outside",
      "human-approved": "Actions human-approved",
    }[key] || key
  );
}

// --- the legacy "sample week" + quotes regions ------------------------------
const statsReady =
  log.week_of != null &&
  log.requests_handled != null &&
  log.drafts_overruled != null &&
  log.minutes_saved != null;

REGIONS.STATS = statsReady
  ? `        <span class="tick-lbl" style="display:block;margin-bottom:10px;">Week of ${esc(log.week_of)}</span>
        <div class="case__stats">
          <div class="case__stat"><span class="tick-lbl">Requests handled</span><span class="stat-val">${esc(log.requests_handled)}</span></div>
          <div class="case__stat"><span class="tick-lbl">Drafts overruled</span><span class="stat-val">${esc(log.drafts_overruled)}</span></div>
          <div class="case__stat"><span class="tick-lbl">Minutes saved</span><span class="stat-val">${esc(log.minutes_saved)}</span></div>
        </div>`
  : `        <div class="case__log">
          <span class="tick-lbl">The log is running</span>
          <p>The intake agent started keeping score in June 2026. The first full month of numbers publishes here once we can verify them — the same standard we hold for client claims.</p>
        </div>`;

const signed = (log.quotes || []).filter((q) => q && q.signed_off === true && q.text);
REGIONS.QUOTES = signed.length
  ? `      <div class="case__quote">
        <span class="tick-lbl">In their words</span>
${signed
  .map(
    (q) => `        <blockquote>${esc(q.text)}<cite>&mdash; ${esc(q.name)}${q.role ? `, ${esc(q.role)}` : ""}</cite></blockquote>`
  )
  .join("\n")}
      </div>`
  : "";

// --- the runtime mirror -----------------------------------------------------
// Emails render at request time inside a Worker, which cannot read
// data/build-log.json. Same problem site-facts.json has, so the same answer:
// generate a runtime-agnostic ESM module, exactly as company.mjs is generated
// from the facts JSON. This is what makes the kill switch reach the inbox —
// signed_off:false emits an empty `figures`, and every surface that reads this
// module drops its MARCUS numbers rather than sending an unapproved one.
const PROOF_MODULE = path.join(ROOT, "src", "data", "proof.mjs");
const proof = {
  signedOff: marcusReady,
  client: mk.client || "",
  measurementWindow: mk.measurement_window || "",
  figures: marcusReady
    ? Object.fromEntries(
        [...scorecard, ...(mk.figures || [])].map((f) => [
          f.key,
          { value: f.value, unit: f.unit || "", desc: f.desc || "" },
        ])
      )
    : {},
};
const proofSource = `// GENERATED from data/build-log.json by scripts/build-work.mjs — DO NOT EDIT.
// Edit the JSON, then run: npm run work:build (build:static runs it).
//
// Runtime-agnostic on purpose: imported by the email templates and the
// Cloudflare Pages Functions, which cannot read the JSON at request time.
// When marcus.signed_off is false, \`figures\` is empty — a reader with no
// figure must omit the claim, never fall back to a remembered number.
export const MARCUS = ${JSON.stringify(proof, null, 2)};
`;
const proofChanged =
  !fs.existsSync(PROOF_MODULE) || fs.readFileSync(PROOF_MODULE, "utf8") !== proofSource;
if (proofChanged) fs.writeFileSync(PROOF_MODULE, proofSource);

// --- stamp every page -------------------------------------------------------
const PAGES = [
  "index.html",
  "work/index.html",
  "work/marcus/index.html",
  "work/marcus/results/index.html",
  "industries/professional-services/index.html",
  "security/index.html",
  "services/index.html",
  "book/thanks/index.html",
];

let stamped = 0;
const touched = [];
const missing = new Set(Object.keys(REGIONS));

for (const rel of PAGES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, "utf8");
  let html = before;

  for (const [name, inner] of Object.entries(REGIONS)) {
    const re = new RegExp(
      `(<!-- BUILD-LOG:${name}\\b[^>]*-->)[\\s\\S]*?(<!-- /BUILD-LOG:${name} -->)`,
      "g"
    );
    if (!re.test(html)) continue;
    missing.delete(name);
    // Inline regions sit mid-sentence, so they must not introduce whitespace.
    const isInline = name.startsWith("MARCUS-INLINE-");
    html = html.replace(re, (m, open, close) =>
      isInline ? `${open}${inner}${close}` : `${open}${inner ? `\n${inner}\n` : ""}${close}`
    );
    stamped++;
  }

  if (html !== before) {
    fs.writeFileSync(file, html);
    touched.push(rel);
  }
}

console.log(
  `[work:build] ${stamped} region(s) stamped across ${touched.length} file(s)` +
    ` · src/data/proof.mjs ${proofChanged ? "rewritten" : "unchanged"}` +
    ` · marcus: ${marcusReady ? `${scorecard.length} scorecard + ${(mk.figures || []).length} figures (signed off)` : "not signed off — figures withheld"}` +
    ` · sample week: ${statsReady ? `week of ${log.week_of}` : "empty state (log is running)"}` +
    ` · quotes: ${signed.length} signed-off`
);
if (missing.size)
  console.log(`[work:build] regions with no marker on any page (fine if intentional): ${[...missing].join(", ")}`);
