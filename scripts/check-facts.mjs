#!/usr/bin/env node
// Build-time consistency check for canonical business facts + structured data.
// The static HTML pages can't import src/data/company.mjs, so this script
// verifies they (and llms.txt) carry the canonical facts byte-identically,
// and that every JSON-LD block parses and agrees with the facts file —
// a drifted phone number, price, email, or schema entity fails the deploy.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/config.mjs";
import { COMPANY } from "../src/data/company.mjs";
import { factValues, serviceNotes, countableClauses, contradictionPattern } from "./lib/fact-values.mjs";
import { PERSON_SAMEAS } from "./lib/templates.mjs";

const errors = [];
const fail = (m) => errors.push(m);

function read(file) {
  try {
    return fs.readFileSync(path.join(ROOT, file), "utf8");
  } catch {
    return null;
  }
}

// Every committed static page.
const ALL_PAGES = [
  "index.html",
  "book/index.html",
  "book/thanks/index.html",
  "pricing/index.html",
  "method/index.html",
  "about/index.html",
  "services/index.html",
  "services/sample-audit/index.html",
  "services/builds/index.html",
  "industries/index.html",
  "industries/professional-services/index.html",
  "industries/retail/index.html",
  "industries/healthcare/index.html",
  "industries/construction/index.html",
  "industries/hospitality/index.html",
  "denver/index.html",
  "phoenix/index.html",
  "work/index.html",
  "work/marcus/index.html",
  "work/marcus/results/index.html",
  "guides/index.html",
  "guides/ai-consultant-cost/index.html",
  "guides/ai-readiness-checklist/index.html",
  "guides/ai-consultant-vs-in-house/index.html",
  "guides/how-to-choose-an-ai-consultant/index.html",
  "guides/what-ai-automation-costs-to-run/index.html",
  "guides/ai-agents-vs-automations-vs-integrations/index.html",
  "guides/how-long-ai-implementation-takes/index.html",
  "guides/what-is-an-ai-readiness-audit/index.html",
  "guides/ai-data-cloud-vs-on-prem/index.html",
  "guides/chatgpt-vs-custom-ai/index.html",
  "guides/signs-you-are-not-ready-for-ai/index.html",
  "guides/how-to-scope-an-ai-project/index.html",
  "guides/ai-roi-math-small-business/index.html",
  "guides/ai-for-the-skeptical-owner/index.html",
  "calculator/index.html",
  "security/index.html",
  "contact/index.html",
  "careers/index.html",
  "privacy/index.html",
  "terms/index.html",
  "404.html",
];

// Pages that must carry the contact facts in visible copy (footer).
const CONTACT_PAGES = ALL_PAGES.filter((p) => !["404.html"].includes(p)).concat("llms.txt");

// Pages that must carry the pricing facts.
const PRICING_PAGES = ["index.html", "pricing/index.html", "llms.txt"];

// Known-bad variants that must never appear anywhere.
const FORBIDDEN = [
  /hello@mainandmachine\.com/, // pages show the canonical contact address only (hello@ is the mail FROM identity, functions/ only)
  /\(480\)\s*805-9983/, // phone must be 480-805-9983, not (480) 805-9983
  /Denvor|Pheonix/, // spelling drift
  /Featured in/, // press credit is always attributed to the founder
  /\$12,000–\$45,000/, // retired sprint band (pre-2026-07 repricing) — canonical is $18,000–$60,000
];

for (const page of CONTACT_PAGES) {
  const html = read(page);
  if (!html) {
    fail(`${page}: missing`);
    continue;
  }
  if (!html.includes(COMPANY.email)) fail(`${page}: missing canonical email ${COMPANY.email}`);
  if (!html.includes(COMPANY.phone)) fail(`${page}: missing canonical phone ${COMPANY.phone}`);
  if (!html.includes("Denver") || !html.includes("Phoenix"))
    fail(`${page}: missing Denver/Phoenix location facts`);
}

for (const page of PRICING_PAGES) {
  const html = read(page);
  if (!html) continue;
  for (const value of ["$3,500", "$8,500", "$18,000", "$60,000", "$95,000", "$1,500"]) {
    if (!html.includes(value)) fail(`${page}: missing canonical price ${value}`);
  }
}

for (const page of [...ALL_PAGES, "llms.txt"]) {
  const html = read(page);
  if (!html) continue;
  for (const bad of FORBIDDEN) {
    if (bad.test(html)) fail(`${page}: contains forbidden fact variant ${bad}`);
  }
}

// --- Stamped data-fact spans must match the facts file ----------------------
// render-facts.mjs WRITES these spans; nothing used to CHECK them, so editing
// site-facts.json and forgetting `npm run facts:render` shipped stale numbers
// with a green build. Re-derive every value and compare byte-for-byte.
const FACT_VALUES = factValues(COMPANY);
const SPAN_RE = /<[a-z][^>]*\bdata-fact="([a-z-]+)"[^>]*>([^<]*)</g;
let spansChecked = 0;
for (const page of ALL_PAGES) {
  const html = read(page);
  if (!html) continue;
  for (const [, key, text] of html.matchAll(SPAN_RE)) {
    const expected = FACT_VALUES[key];
    if (expected === undefined) {
      fail(`${page}: unknown data-fact key "${key}" (not in scripts/lib/fact-values.mjs)`);
      continue;
    }
    spansChecked++;
    if (text !== expected)
      fail(
        `${page}: data-fact="${key}" is "${text}" but site-facts.json says "${expected}" — ` +
          `run \`npm run facts:render\``
      );
  }
}

// --- Service `note` fields must survive into the copy -----------------------
// Notes are prose ("Four taken per year", "No lock-in · annual pays for 10
// months, not 12") embedded inside JSON-LD descriptions and list items, so
// they cannot be stamped into a data-fact span. Guard them two ways instead:
//
//   presence      — every COUNTABLE clause of a note ("Four taken per year")
//                   must appear verbatim on some surface, so changing the count
//                   in the JSON without updating the copy fails. Descriptive
//                   clauses are exempt; prose may paraphrase those.
//   contradiction — no surface may state the same phrase with a DIFFERENT
//                   count. This is the drift the 2026-07-31 audit found: the
//                   back-office note read "Four taken per year" while a stale
//                   artifact still said "Two", and nothing failed.
const NOTE_SURFACES = [...ALL_PAGES, "llms.txt", "llms-full.txt"];
const noteCorpus = NOTE_SURFACES.map((p) => ({ page: p, html: read(p) })).filter((x) => x.html);
let notesChecked = 0;

function guardCountablePhrase(phrase, label) {
  notesChecked++;
  if (!noteCorpus.some(({ html }) => html.includes(phrase)))
    fail(
      `site-facts.json: ${label} claims "${phrase}" but no page says it — ` +
        `update the copy to match the facts file (or the facts file to match reality)`
    );
  const contradiction = contradictionPattern(phrase);
  if (!contradiction) return;
  for (const { page, html } of noteCorpus) {
    const hit = contradiction.exec(html);
    if (hit) fail(`${page}: "${hit[0].trim()}" contradicts the canonical ${label} "${phrase}"`);
  }
}

for (const { key, name, note } of serviceNotes(COMPANY)) {
  for (const clause of countableClauses(note))
    guardCountablePhrase(clause, `services["${key}"].note (${name})`);
}

// --- Build-slot count must stay verifiable ---------------------------------
// The ticker publishes a slot count, which is scarcity language — allowed only
// while it is specific AND current (CLAUDE.md: no unverifiable scarcity; the
// choose-a-consultant guide red-flags exactly this pattern in other firms).
// The rendered span carries the date it was counted; this guard fails the
// build once that date goes stale, forcing a recount or removal of the span.
const SLOT_STAMP_MAX_AGE_DAYS = 21;
const slots = COMPANY.buildSlots || {};
const countedOn = slots.countedOn;

// The prose count and the machine count must agree: `remaining: 4` with a
// line reading "Two Q4 build slots remain" is the drift this catches.
const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const expectedWord = NUMBER_WORDS[slots.remaining];
if (expectedWord === undefined) {
  fail(`site-facts.json: buildSlots.remaining (${JSON.stringify(slots.remaining)}) is not a whole number 0–10`);
} else if (!new RegExp(`^${expectedWord}\\b`, "i").test(String(slots.line || ""))) {
  fail(
    `site-facts.json: buildSlots.line ("${slots.line}") does not start with "${expectedWord}" ` +
      `to match buildSlots.remaining (${slots.remaining})`
  );
}
// The slot line is itself a countable claim: it must appear on the pages that
// stamp it, and no surface may advertise a different count.
guardCountablePhrase(String(slots.line || ""), "buildSlots.line");

if (!/^\d{4}-\d{2}-\d{2}$/.test(countedOn || "")) {
  fail(`site-facts.json: buildSlots.countedOn must be a YYYY-MM-DD date (got ${JSON.stringify(countedOn)})`);
} else {
  const ageDays = Math.floor((Date.now() - Date.parse(`${countedOn}T00:00:00Z`)) / 86_400_000);
  if (ageDays > SLOT_STAMP_MAX_AGE_DAYS) {
    fail(
      `site-facts.json: buildSlots.countedOn (${countedOn}) is ${ageDays} days old — ` +
        `max ${SLOT_STAMP_MAX_AGE_DAYS}. Recount the slots and update the date, or drop the ` +
        `data-fact="build-slots" span from the ticker. A stale count is unverifiable scarcity.`
    );
  }
}

// --- JSON-LD: every block must parse, and entity facts must match ----------
const ORG_ID = `${COMPANY.origin}/#org`;
const PERSON_ID = `${COMPANY.origin}/#person-cmyers`;

function walkNodes(node, visit) {
  if (Array.isArray(node)) return node.forEach((n) => walkNodes(n, visit));
  if (node && typeof node === "object") {
    visit(node);
    for (const v of Object.values(node)) walkNodes(v, visit);
  }
}

for (const page of ALL_PAGES) {
  const html = read(page);
  if (!html) continue;
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const [, raw] of blocks) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      fail(`${page}: JSON-LD does not parse (${e.message})`);
      continue;
    }
    walkNodes(parsed, (node) => {
      if (node.email && node.email !== COMPANY.email)
        fail(`${page}: JSON-LD email "${node.email}" != canonical ${COMPANY.email}`);
      if (node.telephone && node.telephone !== COMPANY.phoneE164)
        fail(`${page}: JSON-LD telephone "${node.telephone}" != canonical ${COMPANY.phoneE164}`);
      if (typeof node["@id"] === "string" && node["@id"].startsWith("http") && !node["@id"].startsWith(COMPANY.origin))
        fail(`${page}: JSON-LD @id "${node["@id"]}" not under canonical origin`);
      const t = node["@type"];
      if ((t === "Organization" || t === "ProfessionalService") && node.name === COMPANY.name && node["@id"]) {
        if (node["@id"] !== ORG_ID && !/#local$/.test(node["@id"]))
          fail(`${page}: org node @id "${node["@id"]}" should be ${ORG_ID} (or a city #local node)`);
      }
      if (t === "Person" && node.name === COMPANY.founder.name && node["@id"] && node["@id"] !== PERSON_ID)
        fail(`${page}: person node @id "${node["@id"]}" should be ${PERSON_ID}`);
      // One entity, one claim set. The founder's Person node is the same
      // entity on all ~40 pages, so its sameAs must be byte-identical
      // everywhere — including order, which is part of the emitted JSON.
      // This drifted once already: / and /about/ carried 8 profiles while the
      // other 37 pages carried 6, so search engines saw two different claims
      // about one @id. PERSON_SAMEAS in templates.mjs is the source of truth;
      // hand-editing a page out of sync now fails the build.
      if (t === "Person" && node["@id"] === PERSON_ID) {
        const got = Array.isArray(node.sameAs) ? node.sameAs : [];
        if (JSON.stringify(got) !== JSON.stringify(PERSON_SAMEAS)) {
          const missing = PERSON_SAMEAS.filter((u) => !got.includes(u));
          const extra = got.filter((u) => !PERSON_SAMEAS.includes(u));
          const why = missing.length || extra.length
            ? `${missing.length ? `missing ${missing.join(", ")}` : ""}${missing.length && extra.length ? "; " : ""}${extra.length ? `unexpected ${extra.join(", ")}` : ""}`
            : "same links, different order";
          fail(
            `${page}: Person sameAs has ${got.length} entr(ies), expected the canonical ${PERSON_SAMEAS.length} ` +
              `from PERSON_SAMEAS in scripts/lib/templates.mjs — ${why}`
          );
        }
      }
    });
  }
  // Subpages (anything but the homepage and legal/404) must carry a BreadcrumbList.
  const needsCrumbs = !["index.html", "privacy/index.html", "terms/index.html", "404.html"].includes(page);
  if (needsCrumbs && !/"BreadcrumbList"/.test(html)) fail(`${page}: missing BreadcrumbList JSON-LD`);
}

// --- llms.txt must match its generator -------------------------------------
// build:static runs llms:build immediately before this check, so a mismatch
// here means someone hand-edited llms.txt — regenerate instead.

if (errors.length) {
  console.error(`[facts:check] FAILED with ${errors.length} issue(s):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`[facts:check] OK — facts + JSON-LD consistent across ${ALL_PAGES.length} pages (${spansChecked} data-fact span(s), ${notesChecked} countable claim(s) verified).`);
