// Copy audit — parses the static source pages and scores the prose against the
// copy-overhaul pass thresholds. Run: node scripts/copy-audit.mjs
// Exit 1 on any failure so it can gate a build if ever wired into build:static.
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const PAGES = [
  "index.html",
  "book/index.html",
  "pricing/index.html",
  "method/index.html",
  "about/index.html",
  "services/index.html",
  "services/ai-readiness-audit/index.html",
  "services/implementation-sprint/index.html",
  "services/managed-services/index.html",
  "industries/index.html",
  "industries/professional-services/index.html",
  "industries/retail/index.html",
  "industries/healthcare/index.html",
  "industries/construction/index.html",
  "industries/hospitality/index.html",
  "denver/index.html",
  "phoenix/index.html",
  "work/index.html",
  "work/sample-audit/index.html",
  "calculator/index.html",
  "privacy/index.html",
  "terms/index.html",
  "404.html",
];

// The conversion path gets the stricter readability bar.
const CONVERSION_PATH = new Set([
  "index.html",
  "services/index.html",
  "pricing/index.html",
  "book/index.html",
]);

const SIGNATURE_PHRASES = [
  "the tools you already pay for",
  "where AI actually pays",
  "a project without a deadline is a project that dies",
  "the advisor who scopes it is the one who builds it",
  "no lock-in: leave whenever it stops paying",
  "we learn the business before we touch the technology",
  "inside your real operation, not a sandbox",
];

// Spelled-out numbers that should be numerals. "one"/"two"/"three" etc. are
// allowed in ordinary prose; these are the spec-sheet-sized offenders.
const SPELLED_RE =
  /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)(-\w+)?\b|\b\w+([- ])?percent\b/gi;
// Proper nouns / titles that legitimately contain a spelled number.
const SPELLED_ALLOW = [/Seventy Years of Overnight Success/];

const LITERAL_PATH_RE = /<\/?(pricing|method|work|services|book|about|blog)\/>?/g;

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—");
}

// Visible text only: drop head, scripts, styles, comments, then tags.
function visibleText(html) {
  let body = html.replace(/^[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "");
  body = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  return body;
}

// Block-level text chunks (paragraph-ish units) from visible markup.
function blocks(html) {
  const out = [];
  const re = /<(p|li|h1|h2|h3|h4|h5|figcaption|cite|span class="build__win"[^>]*|summary)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  // simpler: capture p/li/h1-h5 contents
  const re2 = /<(p|li|h1|h2|h3|h4|h5)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re2.exec(html))) {
    const t = decodeEntities(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (t) out.push({ tag: m[1].toLowerCase(), text: t });
  }
  return out;
}

const words = (t) => t.split(/\s+/).filter((w) => /[A-Za-z0-9$]/.test(w));
const wc = (t) => words(t).length;

function sentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 1;
  if (w.length <= 3) return 1;
  const stripped = w.replace(/(?:[^laeiouy]|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const m = stripped.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

function fkGrade(text) {
  const sents = sentences(text);
  const ws = words(text);
  if (!sents.length || !ws.length) return 0;
  const syl = ws.reduce((a, w) => a + syllables(w), 0);
  return 0.39 * (ws.length / sents.length) + 11.8 * (syl / ws.length) - 15.59;
}

// Hero/intro block: the first .lead paragraph on the page.
function heroLead(html) {
  const m = html.match(/<p class="lead[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  if (!m) return null;
  return decodeEntities(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

let failures = 0;
const fail = (page, msg) => {
  failures++;
  console.log(`  FAIL  ${msg}`);
};
const rows = [];

for (const page of PAGES) {
  const html = readFileSync(resolve(ROOT, page), "utf8");
  const vis = visibleText(html);
  const blks = blocks(vis);
  const fullText = blks.map((b) => b.text).join(" ");
  const pageFailsBefore = failures;
  console.log(`\n== ${page}`);

  // 1. hero/intro word count + longest paragraph
  const lead = heroLead(vis);
  const leadWc = lead ? wc(lead) : 0;
  const heroLimit = page === "index.html" ? 28 : 50;
  // Essays-and-legal pages keep their intros but still get reported.
  const isProse = ["privacy/index.html", "terms/index.html"].includes(page);
  if (lead && !isProse && leadWc > heroLimit)
    fail(page, `hero/intro lead is ${leadWc} words (limit ${heroLimit}): "${lead.slice(0, 70)}…"`);

  let longest = { text: "", n: 0 };
  for (const b of blks.filter((b) => b.tag === "p")) {
    const n = wc(b.text);
    if (n > longest.n) longest = { text: b.text, n };
  }
  if (longest.n > 75)
    fail(page, `paragraph of ${longest.n} words (>75): "${longest.text.slice(0, 70)}…"`);

  // 2. duplicate sentences (≥8 words) on the same page
  const seen = new Map();
  for (const b of blks)
    for (const s of sentences(b.text)) {
      if (wc(s) < 8) continue;
      const key = s.toLowerCase().replace(/[^a-z0-9 ]/g, "");
      seen.set(key, (seen.get(key) || 0) + 1);
      if (seen.get(key) === 2) fail(page, `duplicate sentence: "${s.slice(0, 70)}…"`);
    }

  // 3. signature phrases >1 per page (visible text)
  for (const ph of SIGNATURE_PHRASES) {
    const n = fullText.toLowerCase().split(ph.toLowerCase()).length - 1;
    if (n > 1) fail(page, `signature phrase ×${n}: "${ph}"`);
  }

  // 4. spelled-out large numbers
  for (const b of blks) {
    let m;
    SPELLED_RE.lastIndex = 0;
    while ((m = SPELLED_RE.exec(b.text))) {
      const ctx = b.text.slice(Math.max(0, m.index - 30), m.index + 40);
      if (SPELLED_ALLOW.some((re) => re.test(b.text))) continue;
      fail(page, `spelled-out number "${m[0]}" in: "…${ctx}…"`);
    }
  }

  // 5. literal path strings in rendered text
  for (const b of blks) {
    const raw = b.text;
    if (LITERAL_PATH_RE.test(raw) || /(^|\s)\/(pricing|method|services|book|about|work)\/(\s|[.,]|$)/.test(raw)) {
      fail(page, `literal path string in: "${raw.slice(0, 70)}…"`);
    }
    LITERAL_PATH_RE.lastIndex = 0;
  }

  // 6. negative promises on /book/
  if (page === "book/index.html") {
    const negRe = /\bno\b\s+(?!one\b|matter\b|wrong\b|model\b|phase\b)([a-z-]+)/gi;
    const hits = [];
    let m;
    while ((m = negRe.exec(fullText))) hits.push(m[0]);
    if (hits.length > 4) fail(page, `${hits.length} "no X" constructions (>4): ${hits.join(" · ")}`);
    else console.log(`  info  "no X" constructions: ${hits.length} (${hits.join(" · ") || "none"})`);
  }

  // 7. Flesch-Kincaid grade of body copy (p blocks only)
  const bodyText = blks.filter((b) => b.tag === "p").map((b) => b.text).join(" ");
  const grade = fkGrade(bodyText);
  const gradeLimit = CONVERSION_PATH.has(page) ? 9 : 11;
  if (!isProse && grade > gradeLimit)
    fail(page, `FK grade ${grade.toFixed(1)} (limit ${gradeLimit})`);

  rows.push({ page, words: wc(fullText), lead: leadWc, longest: longest.n, fk: grade.toFixed(1) });
  if (failures === pageFailsBefore) console.log("  pass");
}

console.log("\n== Scorecard");
console.log("page".padEnd(46) + "words".padStart(6) + "lead".padStart(6) + "maxP".padStart(6) + "FK".padStart(6));
for (const r of rows)
  console.log(r.page.padEnd(46) + String(r.words).padStart(6) + String(r.lead).padStart(6) + String(r.longest).padStart(6) + String(r.fk).padStart(6));

if (failures) {
  console.error(`\ncopy-audit: ${failures} failure(s)`);
  process.exit(1);
}
console.log("\ncopy-audit: all green");
