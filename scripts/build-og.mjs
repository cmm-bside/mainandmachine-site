#!/usr/bin/env node
// Generate 1200x630 Open Graph cards in the site's spec-sheet style.
//
//   npm run og:build            # only pages missing a card
//   npm run og:build -- --force # re-render everything
//
// Cards are DERIVED FROM THE PAGES: kicker + H1 are read out of the HTML, so a
// new page picks up a card automatically once it is registered in
// STATIC_ROUTES. Nothing is hand-authored per page.
//
// Rendering uses the system Chrome through playwright-core (the same approach
// as scripts/screenshot-routes.mjs) — no node-canvas/sharp dependency, and the
// self-hosted brand fonts are the real ones because a real browser loads them.
// Output is committed: a deploy must never depend on a browser being present.
import fs from "node:fs";
import path from "node:path";
import { ROOT, STATIC_ROUTES, COMPANY } from "./lib/config.mjs";

const OUT_DIR = path.join(ROOT, "images", "og");
const FORCE = process.argv.includes("--force");

// Routes that already ship a hand-made card; never overwrite those.
const HAND_MADE = new Set([
  "/", "/about/", "/book/", "/pricing/", "/method/", "/services/", "/blog/",
  "/calculator/", "/denver/", "/phoenix/", "/work/", "/industries/",
  "/industries/professional-services/", "/industries/retail/",
  "/industries/healthcare/", "/industries/construction/",
  "/industries/hospitality/", "/services/sample-audit/",
]);

const slugFor = (route) =>
  route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/\//g, "-");

const price = (key) => COMPANY.services.find((s) => s.key === key).price;

/**
 * Cards whose content is AUTHORED rather than derived from the page. Two
 * distinct reasons a route lands here, and both are permanent:
 *
 *   * /score/ has no HTML in this repo AT ALL. It is a PROXIED_ROUTES entry
 *     served from the Score app (lib/score-proxy.mjs), so readPage() has
 *     nothing to read and the derive path can never produce its card.
 *   * The derived card was WRONG. `subline` falls back to the first 62
 *     characters of the meta description, which on /careers/ is the page's own
 *     H1 restated and then cut mid-word — the shipped careers.png reads
 *     "Help us put serious AI to work for Main Street. Open applicati…"
 *     directly under that same sentence as the headline. And the derived
 *     footer is "Fixed price · quoted in writing" on /careers/ and /contact/,
 *     where nothing is being priced.
 *
 * Prices come from COMPANY, never literals: a number baked into a PNG is
 * invisible to facts:check, so the only safe version is one derived at render
 * time from the same source the pages use.
 */
const EXPLICIT = {
  "/score/": {
    kicker: "Free assessment",
    title: "The AI-Ready Score",
    subline: "14 questions · 7 minutes · $0 · No sales call",
    footer: `${COMPANY.domain}/score`,
  },
  "/careers/": {
    kicker: "Careers",
    title: "Build AI for Main Street",
    subline: "",
    footer: `Denver · Phoenix · Remote · ${COMPANY.domain}`,
  },
  "/contact/": {
    kicker: "Contact",
    title: "Talk to a person.",
    subline: `${COMPANY.email} · ${COMPANY.phone}`,
    footer: `Denver · Phoenix · Remote · ${COMPANY.domain}`,
  },
  "/guides/": {
    kicker: "Guides",
    title: "The Field Guide",
    subline: "The buying questions, answered.",
    footer: `Audits ${price("audit")} · ${COMPANY.domain}`,
  },
};

const decode = (s) =>
  s.replace(/<[^>]+>/g, "")
   .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&mdash;/g, "—")
   .replace(/&rsquo;/g, "’").replace(/&lsquo;/g, "‘")
   .replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”")
   .replace(/&middot;/g, "·").replace(/&ndash;/g, "–").replace(/&hellip;/g, "…")
   .replace(/&nbsp;/g, " ")
   .replace(/\s+/g, " ").trim();

function readPage(route) {
  const file = path.join(ROOT, route === "/" ? "index.html" : route.replace(/^\//, "") + "index.html");
  if (!fs.existsSync(file)) return null;
  const html = fs.readFileSync(file, "utf8");
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html);
  const kicker = /<span class="kicker"[^>]*>([\s\S]*?)<\/span>/.exec(html);
  const desc = /<meta name="description" content="([^"]*)"/.exec(html);
  return {
    title: h1 ? decode(h1[1]) : null,
    kicker: kicker ? decode(kicker[1]) : "Main & Machine",
    desc: desc ? decode(desc[1]) : "",
  };
}

// The card. Tokens are inlined literals on purpose: this renders in an isolated
// page with no stylesheet, and it must not drift if styles.css is refactored.
function cardHtml({ kicker, title, subline, footer }) {
  const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Archivo;src:url("file://${ROOT}/fonts/archivo-latin-var.woff2")format("woff2");font-weight:100 900;font-display:block}
@font-face{font-family:"Space Mono";src:url("file://${ROOT}/fonts/spacemono-latin-400.woff2")format("woff2");font-weight:400;font-display:block}
@font-face{font-family:"Space Mono";src:url("file://${ROOT}/fonts/spacemono-latin-700.woff2")format("woff2");font-weight:700;font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#EFE8D9;font-family:Archivo,sans-serif;position:relative;overflow:hidden}
.pad{position:absolute;inset:70px 100px}
.k{font-family:"Space Mono",monospace;font-weight:700;font-size:22px;letter-spacing:.22em;text-transform:uppercase;color:#B83E22}
h1{font-size:76px;font-weight:900;letter-spacing:-.03em;line-height:1.02;color:#1A1511;margin-top:34px;max-width:16ch}
h1.sm{font-size:60px;max-width:19ch}
h1.xs{font-size:50px;max-width:22ch}
.sub{font-family:"Space Mono",monospace;font-size:26px;color:#5b5347;margin-top:30px;letter-spacing:.01em}
.foot{position:absolute;left:100px;bottom:78px;font-family:"Space Mono",monospace;font-size:21px;color:#6E6353}
.plate{position:absolute;right:100px;top:70px;width:66px;height:66px;background:#1A1511;color:#EFE8D9;
 font-family:"Space Mono",monospace;font-weight:700;font-size:22px;display:flex;align-items:center;justify-content:center}
.plate i{color:#C86953;font-style:normal}
/* registration marks — the .crop motif */
.c{position:absolute;width:44px;height:44px;border:3px solid #B83E22}
.tl{top:36px;left:36px;border-right:0;border-bottom:0}
.tr{top:36px;right:36px;border-left:0;border-bottom:0}
.bl{bottom:36px;left:36px;border-right:0;border-top:0}
.br{bottom:36px;right:36px;border-left:0;border-top:0}
</style>
<div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div>
<div class="plate">M<i>&amp;</i>M</div>
<div class="pad">
  <div class="k">${esc(kicker)}</div>
  <h1 class="${title.length > 58 ? "xs" : title.length > 40 ? "sm" : ""}">${esc(title)}</h1>
  ${subline ? `<div class="sub">${esc(subline)}</div>` : ""}
</div>
<div class="foot">${esc(footer)}</div>`;
}

// --- what to render -------------------------------------------------------
// `--only=/careers/,/score/` re-renders just those routes. Without it, fixing
// one authored card means either --force (which rewrites all ~24 derived cards
// and churns the diff for no visual change) or deleting files by hand.
const ONLY = (() => {
  const arg = process.argv.find((a) => a.startsWith("--only="));
  return arg ? new Set(arg.slice("--only=".length).split(",").filter(Boolean)) : null;
})();

const targets = [];
// EXPLICIT routes are rendered even when they are not in STATIC_ROUTES — /score/
// is proxied, so it appears in PROXIED_ROUTES instead and would otherwise be
// skipped entirely.
for (const route of [...new Set([...STATIC_ROUTES, ...Object.keys(EXPLICIT)])]) {
  if (ONLY && !ONLY.has(route)) continue;
  if (HAND_MADE.has(route) && !EXPLICIT[route]) continue;
  const slug = slugFor(route);
  const out = path.join(OUT_DIR, `${slug}.png`);
  if (!FORCE && !ONLY && fs.existsSync(out)) continue;

  const fixed = EXPLICIT[route];
  if (fixed) { targets.push({ route, out, ...fixed }); continue; }

  const page = readPage(route);
  if (!page || !page.title) { console.warn(`[og:build] skip ${route} — no <h1>`); continue; }

  // Guides carry "The Field Guide / 07"; keep that as the card's kicker.
  const isGuide = route.startsWith("/guides/") && route !== "/guides/";
  const subline = isGuide
    ? "The Field Guide · mainandmachine.com"
    : page.desc.slice(0, 62) + (page.desc.length > 62 ? "…" : "");
  targets.push({
    route, out,
    kicker: page.kicker,
    title: page.title,
    subline: isGuide ? "" : subline,
    footer: isGuide
      ? `${page.kicker} · Audits ${COMPANY.services.find((s) => s.key === "audit").price} · ${COMPANY.domain}`
      : `Fixed price · quoted in writing · ${COMPANY.domain}`,
  });
}

if (!targets.length) {
  console.log("[og:build] nothing to render — every registered route has a card.");
  process.exit(0);
}

const { chromium } = await import("playwright-core");
let browser;
try { browser = await chromium.launch({ channel: "chrome" }); }
catch { browser = await chromium.launch(); }

fs.mkdirSync(OUT_DIR, { recursive: true });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
for (const t of targets) {
  await page.setContent(cardHtml(t), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: t.out, type: "png" });
  console.log(`[og:build] ${path.relative(ROOT, t.out)}  ←  ${t.route}`);
}
await browser.close();
console.log(`[og:build] rendered ${targets.length} card(s).`);
