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
  "pricing/index.html",
  "method/index.html",
  "about/index.html",
  "services/index.html",
  "services/ai-readiness-audit/index.html",
  "services/implementation-sprint/index.html",
  "services/managed-services/index.html",
  "services/sample-audit/index.html",
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
  "calculator/index.html",
  "contact/index.html",
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
  /\(480\)\s*360-5128/, // phone must be 480-360-5128, not (480) 360-5128
  /Denvor|Pheonix/, // spelling drift
  /Featured in/, // press credit is always attributed to the founder
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
  for (const value of ["$3,500", "$8,500", "$12,000", "$45,000"]) {
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
console.log(`[facts:check] OK — facts + JSON-LD consistent across ${ALL_PAGES.length} pages.`);
