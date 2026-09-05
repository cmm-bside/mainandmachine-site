#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { SITE_ORIGIN } from "./lib/config.mjs";
import { readArchive } from "./lib/blog-archive.mjs";

const expected = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const posts = readArchive();
const once = process.argv.includes("--once");
let lastError;
async function get(route) {
  const response = await fetch(`${SITE_ORIGIN}${route}${route.includes("?") ? "&" : "?"}verify=${Date.now()}`, { headers: { "User-Agent": "Mozilla/5.0 MainAndMachine" }, signal: AbortSignal.timeout(20000), cache: "no-store" });
  if (!response.ok) throw new Error(`${route} returned ${response.status}`);
  return response;
}
for (let attempt = 0; attempt < (once ? 1 : 80); attempt++) {
  try {
    const index = await (await get("/blog-data/index.json")).json();
    const revision = index.meta?.revision;
    if (!/^[a-f0-9]{40}$/.test(revision || "")) throw new Error("Production is still serving the previous blog build.");
    if (revision !== expected) {
      execFileSync("git", ["fetch", "--quiet", "origin", "main"], { stdio: "pipe" });
      execFileSync("git", ["merge-base", "--is-ancestor", expected, revision], { stdio: "pipe" });
    }
    const slugs = new Set(index.posts.map(p => p.slug));
    for (const post of posts) {
      if (!slugs.has(post.slug)) throw new Error(`Production is missing ${post.slug}`);
      const body = await (await get(`/blog-data/${post.slug}.json`)).json();
      if (!body.bodyHtml?.trim()) throw new Error(`Production body is empty: ${post.slug}`);
      if (revision === expected && body.bodyHtml !== post.bodyHtml) throw new Error(`Production body differs: ${post.slug}`);
      const page = await (await get(post.url)).text();
      if (!page.includes(`rel="canonical" href="${SITE_ORIGIN}${post.url}"`)) throw new Error(`Canonical URL mismatch: ${post.slug}`);
      if (/data-beehiiv-subscribe|Source edition:/.test(page)) throw new Error(`Retired blog controls remain: ${post.slug}`);
    }
    console.log(`Verified ${posts.length} articles in production at ${revision}.`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.log(`Waiting for the native Pages deployment: ${error.message}`);
    if (!once) await setTimeout(20000);
  }
}
throw lastError;
