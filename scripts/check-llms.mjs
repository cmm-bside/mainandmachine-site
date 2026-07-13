#!/usr/bin/env node
// GEO-file integrity check — fails the build when:
//   1. llms.txt links to an internal path that does not exist in the build
//      output (a 404 for any agent that follows it), or
//   2. llms.txt states a fact that disagrees with src/data/site-facts.json —
//      both directions: every canonical fact must be PRESENT, and every
//      price-like token in the file must be either a canonical fact or an
//      explicitly whitelisted market-context figure. A stale price (facts
//      edited, llms.txt not regenerated) fails on both counts.
// Runs in build:static after llms:build (so generated /blog/* exists).
import fs from "node:fs";
import path from "node:path";
import { ROOT, PROXIED_ROUTES } from "./lib/config.mjs";
import { COMPANY } from "../src/data/company.mjs";

const errors = [];
const fail = (m) => errors.push(m);
const llms = fs.readFileSync(path.join(ROOT, "llms.txt"), "utf8");

// --- 1. every internal link resolves in the build output --------------------
const links = [...llms.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1]);
for (const link of new Set(links)) {
  const clean = link.split("#")[0].split("?")[0];
  if (PROXIED_ROUTES.includes(clean)) continue; // no local file by design
  const candidate = clean.endsWith("/")
    ? path.join(ROOT, clean.slice(1), "index.html")
    : path.join(ROOT, clean.slice(1));
  if (!fs.existsSync(candidate))
    fail(`llms.txt links to ${link} but ${path.relative(ROOT, candidate)} does not exist (would 404)`);
}

// --- 2a. canonical facts must be present ------------------------------------
const [audit, sprint] = COMPANY.services;
const MUST_CONTAIN = [
  COMPANY.email,
  COMPANY.phone,
  audit.price,
  sprint.price,
  COMPANY.audience.headcount,
  COMPANY.audience.revenue,
];
for (const s of MUST_CONTAIN) {
  if (!llms.includes(s)) fail(`llms.txt is missing canonical fact "${s}" from site-facts.json`);
}

// --- 2b. every price-like token must be canonical or whitelisted ------------
// Whitelist: canonical facts + deliberate market-context figures used for
// comparison. Anything else is presumed stale/drifted and fails.
const MARKET_CONTEXT = [
  "$45,000",   // "largest engagement" framing (sprint priceHigh)
  "$500,000+", // Big Four kickoff comparison
  "$3,500",    // audit floor used standalone
  "$1M",       // audience revenue band halves ($1M–$50M renders as tokens)
  "$50M",
  "$50–$500",  // published running-cost band
  "$12,000",   // sprint floor standalone (implementation model)
  "$25",       // ChatGPT-seat market comparison (guides)
];
const allowed = new Set([
  audit.price, sprint.price, COMPANY.audience.revenue,
  ...audit.price.split("–"), ...sprint.price.split("–"),
  ...COMPANY.audience.revenue.split("–"),
  ...MARKET_CONTEXT,
]);
// \d{1,3}(,\d{3})* — never swallow a sentence comma into the number
const NUM = "\\d{1,3}(?:,\\d{3})*(?:[KM]|\\+)?";
const tokens = llms.match(new RegExp(`\\$${NUM}(?:–\\$?${NUM})?(?:/month|/mo)?`, "g")) || [];
for (const t of new Set(tokens)) {
  const bare = t.replace(/\/month|\/mo/, "");
  if (!allowed.has(bare)) fail(`llms.txt contains price-like token "${t}" that is neither a canonical fact nor whitelisted market context — stale or drifted?`);
}

// --- 3. /facts.json must agree with the source ------------------------------
const factsPath = path.join(ROOT, "facts.json");
if (!fs.existsSync(factsPath)) fail("facts.json missing — run llms:build");
else {
  const pub = JSON.parse(fs.readFileSync(factsPath, "utf8"));
  if (pub.services?.[0]?.price !== audit.price || pub.email !== COMPANY.email || pub.phone !== COMPANY.phone)
    fail("facts.json disagrees with site-facts.json — run llms:build");
}

if (errors.length) {
  console.error(`[llms:check] FAILED with ${errors.length} issue(s):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`[llms:check] OK — ${new Set(links).size} links resolve, all facts agree with site-facts.json.`);
