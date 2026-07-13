#!/usr/bin/env node
// Generate /llms.txt and /llms-full.txt from the canonical facts file and the
// committed pages, so neither can drift. Runs in build:static (and by hand:
// npm run llms:build). The committed artifacts should always match this
// script's output — facts:check fails the build when llms.txt doesn't.
//
// - llms.txt      — the fact sheet: who we are, services + exact published
//                   prices, the ICP, the MARCUS case facts, the proof-shelf
//                   rule, and links to every major page (llmstxt.org format).
// - llms-full.txt — the full visible text of the most important pages (see
//                   FULL_PAGES), concatenated with clear page delimiters, for
//                   AI systems that want source copy rather than the summary.
import fs from "node:fs";
import path from "node:path";
import { ROOT, SITE_ORIGIN } from "./lib/config.mjs";
import { COMPANY } from "../src/data/company.mjs";

const [audit, sprint, managed] = COMPANY.services;

// MARCUS case facts — must match /work/marcus/ copy. Published with the
// client's permission; never vary the numbers.
const MARCUS = {
  agents: 14,
  departments: 7,
  sourceDocs: "~840",
  client: "B:Side Capital",
  sector: "SBA 504 / CDFI lender",
};

const out = `# ${COMPANY.name}

> AI consulting and implementation for small and mid-size businesses
> (${COMPANY.audience.headcount} employees, ${COMPANY.audience.revenue} revenue). Fixed-price audits $3,500–$8,500;
> implementation sprints $12,000–$45,000, fixed quote in writing, delivered
> in ~90 days per workflow. Hubs in Denver, CO and Phoenix, AZ; remote across
> the US. Founded by ${COMPANY.founder.name}.
> The free 30-minute assessment is the front door.

Full page text for AI systems: [llms-full.txt](/llms-full.txt) — the complete
visible copy of the most important pages, with page delimiters.

## Company facts

- Company: ${COMPANY.name} — ${COMPANY.oneLiner}
- Who it serves: owner-run and mid-size businesses of ${COMPANY.audience.headcount} employees,
  ${COMPANY.audience.revenue} in revenue — past what the owner can hold in their head,
  short of a Fortune 500 budget
- Founder & Chairman: ${COMPANY.founder.name} — CEO of B:Side Capital + Fund,
  professor of entrepreneurship at ASU's W.P. Carey School of Business,
  and author of several books on small business
- Verify the founder independently: [ASU faculty profile](https://search.asu.edu/profile/559969) ·
  [B:Side Capital](https://www.bside.org) ·
  [LinkedIn](https://www.linkedin.com/in/cmyers85/) ·
  [Amazon author page](https://www.amazon.com/stores/author/B01LBGCKWM/about)
- Hubs: Denver, CO and Phoenix, AZ · remote across the US
- Delivery: ${COMPANY.delivery}
- Free offer: ${COMPANY.freeOffer}
- Contact: ${COMPANY.email} · ${COMPANY.phone}
- Operating principle: every system we build can be explained, questioned,
  and overruled by an accountable human.

## Services & published prices

Every price is published; the exact number is quoted fixed, in writing,
before work begins.

- [${audit.name}](/services/#audit): $3,500–$8,500, 2–4 weeks.
  A workflow map of your real operations, the handful of places AI actually
  pays, and a phased plan you own outright — whether or not you build with us.
- [${sprint.name}](/services/#sprint): $12,000–$45,000 fixed quote,
  4–12 weeks. Working agents, automations, and integrations built inside
  your real operation, with your team trained to run them. About 90 days
  per workflow.
- [${managed.name}](/services/#managed): monthly retainer, no lock-in.
  Monitoring and maintenance on every deployed system; leave any month it
  stops paying.
- [Pricing](/pricing/) — the full price list, on the page. Our largest
  engagement ($45,000) is less than a Big Four kickoff meeting ($500,000+
  minimums).
- [Sample audit deliverable](/services/sample-audit/) — the artifact you buy,
  shown before you buy it.

## Proof: the MARCUS case

- [MARCUS](/work/marcus/) — a private AI back office built for
  ${MARCUS.client}, an ${MARCUS.sector}: ${MARCUS.agents} AI agents across
  ${MARCUS.departments} departments, built from ${MARCUS.sourceDocs} source documents, running
  entirely on-prem — no borrower file leaves the building in normal
  operation. PII is stripped by Microsoft Presidio before any model reads
  a document; every action writes to a tamper-evident audit log; nothing
  sends, files, posts, or pays until a person approves it. Published with
  the client's permission.
- [Proof](/work/) — builds shown plainly, with a standing rule: numbers and
  client quotes on that page render only from a build log, and quotes appear
  only with the client's written sign-off on file. Missing numbers stay
  blank rather than invented.

## Security & data handling

- [Security](/security/) — where client data goes, and where it never goes.
  Five controls, in the order data meets them: (1) local models on the
  client's own hardware — for regulated work, no client file leaves the
  building in normal operation; (2) PII stripped by Microsoft Presidio
  before any model reads a document — the model sees the work, not the
  identity; (3) everything stored is encrypted at rest; (4) every action
  writes to an append-only, tamper-evident audit log — compliance can prove
  nothing was altered; (5) a human signs off on every consequential action —
  nothing sends, files, posts, or pays until a person approves it. The
  architecture is the one MARCUS runs in production at a regulated SBA
  lender, not a policy aspiration.

## Method

- [The method](/method/) — three phases on every engagement: Discover
  (map and cost the workflows), Build (working systems inside your real
  operation), Evolve (tune, extend, retire as the work changes). A workflow
  lands in about 90 days: weeks 1–2 discover, weeks 3–10 build, weeks
  11–13 handoff.

## Free tools

- [The AI-Ready Score](/score) — free seven-minute self-assessment:
  fourteen questions across three phases (Map, Prove, Expand). You get a
  0–100 score and the one constraint to fix first. No sales call.
- [ROI calculator](/calculator/) — rough year-one ranges by industry and
  team size. Ranges, not promises.

## Guides

- [The Field Guide](/guides/) — practical answers to AI buying questions,
  real published prices throughout
- [What an AI consultant costs in 2026](/guides/ai-consultant-cost/) —
  the market's ranges (hourly, boutique, Big Four) and where ours sit
- [AI readiness checklist](/guides/ai-readiness-checklist/) — 20 points
  an owner can run in an afternoon, no consultant required
- [AI consultant vs. in-house hire](/guides/ai-consultant-vs-in-house/) —
  the hiring math, with break-even headcounts
- [How to choose an AI consultant](/guides/how-to-choose-an-ai-consultant/) —
  10 questions that separate builders from hype merchants
- [What AI automation costs to run](/guides/what-ai-automation-costs-to-run/) —
  the monthly reality after the build: tokens, tools, maintenance ($50–$500/mo)
- [Agents vs. automations vs. integrations](/guides/ai-agents-vs-automations-vs-integrations/) —
  which one your problem needs, and why it's often the cheaper one
- [How long AI implementation takes](/guides/how-long-ai-implementation-takes/) —
  ~90 days per workflow, week by week; what "2 weeks" actually buys
- [What an AI readiness audit is](/guides/what-is-an-ai-readiness-audit/) —
  what $3,500–$8,500 buys, what it deliberately doesn't
- [Where AI data actually goes](/guides/ai-data-cloud-vs-on-prem/) —
  cloud vs. on-prem for a small business, matched to what's in the documents
- [ChatGPT vs. custom AI](/guides/chatgpt-vs-custom-ai/) —
  when a $25 subscription wins and where it stalls
- [Signs you are NOT ready for AI](/guides/signs-you-are-not-ready-for-ai/) —
  and the 90-day plan that costs almost nothing instead
- [How to scope an AI project a vendor can't inflate](/guides/how-to-scope-an-ai-project/) —
  procurement armor: clauses, inflation patterns, a copyable template
- [The real ROI math](/guides/ai-roi-math-small-business/) —
  the calculator's model published in full, worked example included
- [AI for the skeptical owner](/guides/ai-for-the-skeptical-owner/) —
  what the skeptic has right, and a first step requiring no belief

## Industries

- [Who this is for](/industries/) — five industries with the clearest wins:
  [professional services](/industries/professional-services/) ·
  [retail](/industries/retail/) · [healthcare](/industries/healthcare/) ·
  [construction & trades](/industries/construction/) ·
  [hospitality](/industries/hospitality/)

## Key pages

- [Home](/) — what we build and why
- [Free assessment](/book/) — 30 minutes, reply within 24 hours
- [Who we are](/about/) — the founder, the AI-native build team, the name
- [Denver](/denver/) · [Phoenix](/phoenix/) — the two hubs, in person
- [Contact](/contact/) — email or call; both land with the founder
- [Careers](/careers/) — join the build team
- [The Ampersand](/blog/) — weekly plain-English AI essays
  ([archive](/blog/archive/), [RSS](/blog/rss.xml))
- [Privacy](/privacy/) · [Terms](/terms/)
`;

// ---------------------------------------------------------------------------
// llms-full.txt — full text of the most important pages
// ---------------------------------------------------------------------------
const FULL_PAGES = [
  "/",
  "/services/",
  "/pricing/",
  "/method/",
  "/about/",
  "/work/marcus/",
  "/security/",
  "/book/",
  "/guides/ai-consultant-cost/",
  "/guides/ai-readiness-checklist/",
  "/guides/how-to-choose-an-ai-consultant/",
];

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", hellip: "…", rarr: "→", larr: "←",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  middot: "·", copy: "©",
};

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

// Reduce a page's <main> to readable plain text: drop script/style/SVG and
// aria-hidden duplicates, keep headings as "## " lines, flatten the rest.
function extractText(html) {
  let m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  let body = m ? m[1] : html.replace(/^[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "");
  body = body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|svg|form|noscript)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(span|div)([^>]*aria-hidden="true"[^>]*)>[^<]*<\/\1>/gi, "");
  // Headings → markdown-ish markers so structure survives the flattening
  // (inner markup and line breaks are collapsed so the marker stays attached).
  const heading = (level) => (_, inner) =>
    `\n\n${"#".repeat(level)} ${inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}\n\n`;
  body = body
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, heading(1))
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, heading(2))
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, heading(3))
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, heading(4))
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|li|ul|ol|div|section|article|figure|figcaption|blockquote|dl|table|tr)>/gi, "\n")
    .replace(/<(dt|th)[^>]*>/gi, "\n")
    .replace(/<(dd|td)[^>]*>/gi, ": ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  body = decodeEntities(body)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return body;
}

function pageMeta(html) {
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [, ""])[1].trim();
  const desc = (html.match(/<meta name="description" content="([^"]*)"/i) || [, ""])[1].trim();
  return { title: decodeEntities(title), description: decodeEntities(desc) };
}

const RULE = "=".repeat(72);
const sections = [];
for (const route of FULL_PAGES) {
  const rel = route === "/" ? "index.html" : `${route.replace(/^\/|\/$/g, "")}/index.html`;
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.warn(`[llms:build] WARN: ${rel} missing — skipped in llms-full.txt`);
    continue;
  }
  const html = fs.readFileSync(abs, "utf8");
  const { title, description } = pageMeta(html);
  sections.push(
    `${RULE}\nPAGE: ${title}\nURL: ${SITE_ORIGIN}${route}\n${description ? `SUMMARY: ${description}\n` : ""}${RULE}\n\n${extractText(html)}`
  );
}

const fullOut = `# ${COMPANY.name} — llms-full.txt
# The complete visible text of the ${sections.length} most important pages on
# ${SITE_ORIGIN}/ , concatenated with page delimiters.
# The condensed fact sheet lives at ${SITE_ORIGIN}/llms.txt
# Canonical business facts: ${COMPANY.oneLiner}.
# Contact: ${COMPANY.email} · ${COMPANY.phone} · Denver, CO & Phoenix, AZ.

${sections.join("\n\n")}
`;

fs.writeFileSync(path.join(ROOT, "llms.txt"), out);
fs.writeFileSync(path.join(ROOT, "llms-full.txt"), fullOut);
console.log(`[llms:build] llms.txt + llms-full.txt (${sections.length} pages) generated from src/data/company.mjs`);
