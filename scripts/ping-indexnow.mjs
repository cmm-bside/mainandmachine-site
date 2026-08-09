#!/usr/bin/env node
// Ping IndexNow with the URLs this deploy changed.
//
//   node scripts/ping-indexnow.mjs                 # URLs changed in the last commit
//   node scripts/ping-indexnow.mjs --all           # every indexable URL (use sparingly)
//   node scripts/ping-indexnow.mjs --dry-run
//
// WHY: IndexNow is how Bing learns about a change in minutes instead of days,
// and Bing's index is what ChatGPT search reads. Google ignores IndexNow — the
// sitemap remains the mechanism there.
//
// SUBMIT ONLY WHAT CHANGED. The protocol permits bulk submission and treats
// abuse as spam; re-submitting 60 unchanged URLs on every deploy is exactly the
// pattern that gets a key throttled. Default is the diff of the last commit.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { SITE_ORIGIN, STATIC_ROUTES, PROXIED_ROUTES } from "./lib/config.mjs";

const ROOT = process.cwd();
const DRY = process.argv.includes("--dry-run");
const ALL = process.argv.includes("--all");
const HOST = SITE_ORIGIN.replace(/^https?:\/\//, "");

const keyFile = fs.readdirSync(ROOT).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!keyFile) {
  console.error("[indexnow] no key file at the site root (expected <32-hex>.txt). Nothing submitted.");
  process.exit(1);
}
const key = keyFile.replace(/\.txt$/, "");
if (fs.readFileSync(path.join(ROOT, keyFile), "utf8").trim() !== key) {
  console.error(`[indexnow] ${keyFile} must contain exactly its own key. Nothing submitted.`);
  process.exit(1);
}

const fileToRoute = (f) => {
  if (f === "index.html") return "/";
  const m = /^(.*)\/index\.html$/.exec(f);
  return m ? `/${m[1]}/` : null;
};

let routes;
if (ALL) {
  routes = [...STATIC_ROUTES, ...PROXIED_ROUTES];
} else {
  let changed = [];
  try {
    changed = execFileSync("git", ["diff", "--name-only", "HEAD~1", "HEAD"], { cwd: ROOT, encoding: "utf8" })
      .split("\n").filter(Boolean);
  } catch {
    console.warn("[indexnow] no git history to diff (shallow clone?) — nothing submitted. Use --all deliberately.");
    process.exit(0);
  }
  routes = [...new Set(changed.filter((f) => f.endsWith(".html")).map(fileToRoute).filter(Boolean))]
    .filter((r) => STATIC_ROUTES.includes(r));
}

if (!routes.length) { console.log("[indexnow] no changed indexable URLs — nothing to submit."); process.exit(0); }

const body = { host: HOST, key, keyLocation: `${SITE_ORIGIN}/${keyFile}`, urlList: routes.map((r) => `${SITE_ORIGIN}${r}`) };
console.log(`[indexnow] ${routes.length} URL(s):`);
for (const r of routes) console.log("  " + r);
if (DRY) { console.log("[indexnow] --dry-run, not submitting."); process.exit(0); }

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(body),
});
// 200 = accepted, 202 = accepted pending key validation. Both are success.
if (res.status === 200 || res.status === 202) console.log(`[indexnow] submitted (HTTP ${res.status}).`);
else { console.error(`[indexnow] FAILED — HTTP ${res.status} ${await res.text()}`); process.exit(1); }
