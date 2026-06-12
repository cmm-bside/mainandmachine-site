#!/usr/bin/env node
// Build-time consistency check for canonical business facts.
// The static HTML pages can't import src/data/company.mjs, so this script
// verifies they (and llms.txt) carry the canonical facts byte-identically —
// a drifted phone number, price, or email fails the deploy instead of shipping.
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

// Facts every page that mentions them must spell exactly this way.
const CANONICAL = {
  email: COMPANY.email,
  phone: COMPANY.phone,
  "audit price low": "$3,500",
  "audit price high": "$8,500",
  "sprint price low": "$12,000",
  "sprint price high": "$45,000",
};

// Known-bad variants that must never appear (catch silent drift).
const FORBIDDEN = [
  /hello@mainandmachine\.com/, // pages show the canonical contact address only (hello@ is the mail FROM identity, functions/ only)
  /\(480\)\s*360-5128/, // phone must be 480-360-5128, not (480) 360-5128
  /Denvor|Pheonix/, // spelling drift
];

// Pages that must carry contact facts.
const CONTACT_PAGES = ["index.html", "book/index.html", "llms.txt"];

for (const page of CONTACT_PAGES) {
  const html = read(page);
  if (!html) {
    fail(`${page}: missing`);
    continue;
  }
  if (!html.includes(CANONICAL.email)) fail(`${page}: missing canonical email ${CANONICAL.email}`);
  if (!html.includes(CANONICAL.phone)) fail(`${page}: missing canonical phone ${CANONICAL.phone}`);
  if (!html.includes("Denver") || !html.includes("Phoenix"))
    fail(`${page}: missing Denver/Phoenix location facts`);
}

// Pages that must carry pricing facts.
for (const page of ["index.html", "llms.txt"]) {
  const html = read(page);
  if (!html) continue;
  for (const [label, value] of Object.entries(CANONICAL)) {
    if (!label.includes("price")) continue;
    if (!html.includes(value)) fail(`${page}: missing canonical ${label} ${value}`);
  }
}

// Forbidden variants — checked across every committed HTML page + llms.txt.
const SWEEP = ["index.html", "book/index.html", "llms.txt", "privacy/index.html", "terms/index.html", "404.html"];
for (const page of SWEEP) {
  const html = read(page);
  if (!html) continue;
  for (const bad of FORBIDDEN) {
    // hello@ is allowed only as the mail FROM identity inside functions/, not on pages
    if (bad.test(html)) fail(`${page}: contains forbidden fact variant ${bad}`);
  }
}

if (errors.length) {
  console.error(`[facts:check] FAILED with ${errors.length} issue(s):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("[facts:check] OK — canonical business facts are consistent.");
