#!/usr/bin/env node
// Stamp canonical facts into committed HTML — the write half of the fact
// system. Any element carrying data-fact="<key>" gets its text content
// replaced from src/data/site-facts.json, so a price change edits ONE file
// and this script (run in build:static and by hand: npm run facts:render)
// propagates it. Idempotent. Unknown keys fail loudly — no silent typos.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/config.mjs";

// Read the source of truth directly (not via company.mjs — this script
// GENERATES company.mjs, so it must not depend on it).
const FACTS_PATH = path.join(ROOT, "src", "data", "site-facts.json");
const COMPANY = JSON.parse(fs.readFileSync(FACTS_PATH, "utf8"));

// --- 0. regenerate src/data/company.mjs from the JSON -----------------------
// A committed plain-object module (no JSON import attribute) so it works on
// every Node version, in the Pages Functions esbuild bundle, and in Workers.
const MODULE = `// GENERATED from src/data/site-facts.json by scripts/render-facts.mjs —
// DO NOT EDIT. Edit the JSON, then run: npm run facts:render
// (build:static runs it automatically; check-llms.mjs fails the build if
// this file and the JSON ever disagree).
//
// Runtime-agnostic on purpose: imported by build scripts, Cloudflare Pages
// Functions, and email templates.
export const COMPANY = ${JSON.stringify(COMPANY, null, 2)};
`;
const modulePath = path.join(ROOT, "src", "data", "company.mjs");
if (fs.readFileSync(modulePath, "utf8") !== MODULE) {
  fs.writeFileSync(modulePath, MODULE);
  console.log("[facts:render] src/data/company.mjs regenerated from site-facts.json");
}

const svc = (key) => COMPANY.services.find((s) => s.key === key);
const usd = (n) => "$" + n.toLocaleString("en-US");

// The vocabulary: every data-fact key a page may carry.
export const FACT_VALUES = {
  "price-audit": svc("audit").price,
  "price-sprint": svc("sprint").price,
  "timeline-audit": svc("audit").timeline,
  "timeline-sprint": svc("sprint").timeline,
  "audit-floor": usd(svc("audit").priceLow) + "+",
  "phone": COMPANY.phone,
  "email": COMPANY.email,
};

function* htmlFiles(dir, prefix = "") {
  const SKIP = new Set(["node_modules", "blog", "blog-data", "audit", "scratchpad", ".git", "src", "scripts", "functions", "emails", "images", "js", "fonts", "reports"]);
  for (const name of fs.readdirSync(dir)) {
    if (prefix === "" && SKIP.has(name)) continue;
    const fp = path.join(dir, name);
    if (fs.statSync(fp).isDirectory()) yield* htmlFiles(fp, prefix + "/" + name);
    else if (name.endsWith(".html")) yield fp;
  }
}

let stamped = 0, files = 0;
const unknown = new Set();
for (const file of htmlFiles(ROOT)) {
  let html = fs.readFileSync(file, "utf8");
  let touched = false;
  html = html.replace(/(<[a-z][^>]*\bdata-fact="([a-z-]+)"[^>]*>)([^<]*)(<)/g, (m, open, key, text, close) => {
    const val = FACT_VALUES[key];
    if (val === undefined) { unknown.add(`${path.relative(ROOT, file)}: ${key}`); return m; }
    stamped++;
    if (text !== val) touched = true;
    return open + val + close;
  });
  if (touched) { fs.writeFileSync(file, html); files++; }
}

if (unknown.size) {
  console.error(`[facts:render] FAILED — unknown data-fact key(s):`);
  for (const u of unknown) console.error("  - " + u);
  process.exit(1);
}
console.log(`[facts:render] ${stamped} fact span(s) verified across pages · ${files} file(s) updated`);
