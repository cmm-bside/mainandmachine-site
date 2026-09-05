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
import { ROOT, SITE_ORIGIN, STATIC_ROUTES, EXCLUDED_POST_SLUGS } from "./lib/config.mjs";
import { COMPANY } from "../src/data/company.mjs";
import { MARCUS as MARCUS_PROOF } from "../src/data/proof.mjs";
import { APPROVED_CLAIMS, claimText, marcusMeasuredSummary } from "../src/data/approved-claims.mjs";
import { applyPostEditorialOverrides } from "./lib/post-seo.mjs";

// Artifact generation date; not an assertion of a new editorial review.
const BUILD_DATE = new Date().toISOString().slice(0, 10);

const [audit, sprint, managed] = COMPANY.services;
// Named-offer layer, optional by design: with namedOffers deleted this
// renders nothing and llms.txt goes back to SKU names only.
const named = (key) => (COMPANY.namedOffers?.[key] ? ` ("${COMPANY.namedOffers[key]}")` : "");

// MARCUS case facts — must match /work/marcus/ copy. Published with the
// client's permission; never vary the numbers.
const MARCUS = {
  agents: 14,
  departments: 7,
  sourceDocs: "~840",
  client: "B:Side Capital",
  sector: "SBA 504 / CDFI lender",
};

const measuredSummary = marcusMeasuredSummary(MARCUS_PROOF);

const out = `# ${COMPANY.name}

> AI consulting and implementation for small and mid-size businesses.
> We connect existing software and automate repetitive office tasks, including
> customer follow-up and moving approved information between systems.
> Hubs in Denver, CO and Phoenix, AZ; remote across the US.
> Founded by ${COMPANY.founder.name}.

## Start with one task

[Get a free ${COMPANY.workflowPlan.name}](${COMPANY.workflowPlan.path}) is the primary starting point.

${COMPANY.workflowPlan.summary}
${COMPANY.workflowPlan.paidAuditDistinction}
Prefer to talk? [Book a free 30-minute assessment](/book/) directly.
${claimText("assessment")}
${claimText("advisor")}

Generated: ${BUILD_DATE}

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

- [${audit.name}](/services/ai-readiness-audit/)${named("audit")}: $3,500–$8,500, 2–4 weeks.
  A workflow map of your operations, ranked opportunities with assumptions
  and costs, and a phased plan you own outright — whether or not you build with us.
- [${sprint.name}](/services/ai-implementation/)${named("sprint")}: $18,000–$60,000 fixed quote,
  4–12 weeks. Working agents, automations, and integrations built inside
  your real operation, with your team trained to run them. About 90 days
  per workflow. Guarantee: if a scoped workflow is not live within 90 days,
  we keep building at no charge until it is.
- [${managed.name}](/services/managed-ai-services/)${named("managed")}: from $1,500/month, no lock-in.
  Monitoring and maintenance on every deployed system; leave any month it
  stops paying. Pay annually and 12 months cost the price of 10.
- The Full Back Office: from $95,000 — a MARCUS-class, multi-department
  build. Four taken per year.
- Audit-to-sprint credit: 100% of the audit fee credits toward a sprint
  signed within 60 days, up to 25% of the sprint price.
- [Pricing](/pricing/) — published scope, timelines, price bands, and terms.
  Compare proposals on the same deliverables and total ownership cost.
- [Build catalog](/services/builds/) — every system we build, priced:
  AI receptionists, intake and billing agents, automations, integrations.
- [Sample audit deliverable](/services/sample-audit/) — ${claimText("sampleAudit")}

## Proof: the MARCUS case

- [MARCUS](/work/marcus/) — a private AI back office built for
  ${MARCUS.client}, an ${MARCUS.sector}: ${MARCUS.agents} AI agents across
  ${MARCUS.departments} departments, built from ${MARCUS.sourceDocs} source documents.
  ${claimText("marcusArchitecture")}
- [MARCUS measured results](/work/marcus/results/) — ${measuredSummary}
  ${claimText("evidenceLimits")}
  ${claimText("timeValue")}
- [Proof](/work/) — published operational evidence and its measurement limits.
  Case figures render from data/build-log.json; client quotes require written
  sign-off. A published case is evidence to inspect, not a result guarantee.

## Security & data handling

- [Security](/security/) — documented MARCUS controls and deployment boundaries.
  ${claimText("marcusArchitecture")}
  ${claimText("privacyFilter")}
  ${claimText("auditLog")}
  Consequential actions require human approval. The documented controls include
  encryption at rest; each new engagement defines its data routes, access,
  retention, approvals, and tests before production use.

## Method

- [The method](/method/) — three phases on every engagement: Discover
  (map and cost the workflows), Build (working systems inside your real
  operation), Evolve (tune, extend, retire as the work changes). A workflow
  lands in about 90 days: weeks 1–2 discover, weeks 3–10 build, weeks
  11–13 handoff.

## Free tools

- [${COMPANY.workflowPlan.name}](${COMPANY.workflowPlan.path}) — ${COMPANY.workflowPlan.summary}
  ${COMPANY.workflowPlan.paidAuditDistinction}
  [See a sample plan](${COMPANY.workflowPlan.samplePath}).
- [The AI-Ready Score](/score/) — free seven-minute self-assessment:
  fourteen questions across three phases (Map, Prove, Expand). You get a
  0–100 score and the one constraint to fix first. No sales call.
- [ROI calculator](/calculator/) — editable opportunity capture, running costs,
  and investment assumptions; shows first-year net and modeled recovery time.
  ${claimText("timeValue")}

## Guides

- [The Field Guide](/guides/) — practical answers to AI buying questions,
  real published prices throughout
- [What an AI consultant costs in 2026](/guides/ai-consultant-cost/) —
  published offers, cost drivers, and how to compare proposals
- [AI readiness checklist](/guides/ai-readiness-checklist/) — 20 points
  an owner can run in an afternoon, no consultant required
- [AI consultant vs. in-house hire](/guides/ai-consultant-vs-in-house/) —
  compare the workload, management, and total cost of each option
- [How to choose an AI consultant](/guides/how-to-choose-an-ai-consultant/) —
  10 questions that separate builders from hype merchants
- [What AI automation costs to run](/guides/what-ai-automation-costs-to-run/) —
  tools, model usage, internal review, and optional paid support, separately
- [Agents vs. automations vs. integrations](/guides/ai-agents-vs-automations-vs-integrations/) —
  which one your problem needs, and why it's often the cheaper one
- [How long AI implementation takes](/guides/how-long-ai-implementation-takes/) —
  ~90 days per workflow, week by week; what "2 weeks" actually buys
- [What an AI readiness audit is](/guides/what-is-an-ai-readiness-audit/) —
  what $3,500–$8,500 buys, what it deliberately doesn't
- [Where AI data actually goes](/guides/ai-data-cloud-vs-on-prem/) —
  cloud vs. on-prem for a small business, matched to what's in the documents
- [ChatGPT vs. custom AI](/guides/chatgpt-vs-custom-ai/) —
  when a subscription solves the work and when a custom workflow is useful
- [Signs you are NOT ready for AI](/guides/signs-you-are-not-ready-for-ai/) —
  and the 90-day plan that costs almost nothing instead
- [How to scope an AI project a vendor can't inflate](/guides/how-to-scope-an-ai-project/) —
  procurement armor: clauses, inflation patterns, a copyable template
- [The real ROI math](/guides/ai-roi-math-small-business/) —
  the calculator's model published in full, worked example included
- [AI for the skeptical owner](/guides/ai-for-the-skeptical-owner/) —
  what the skeptic has right, and a first step requiring no belief

## Industries

- [Who this is for](/industries/) — candidate workflows across five industries:
  [professional services](/industries/professional-services/) ·
  [retail](/industries/retail/) · [healthcare](/industries/healthcare/) ·
  [construction & trades](/industries/construction/) ·
  [hospitality](/industries/hospitality/)

## Key pages

- [Home](/) — what we build and why
- [${COMPANY.workflowPlan.name}](${COMPANY.workflowPlan.path}) — the primary starting point; one workflow, reviewed within ${COMPANY.workflowPlan.reviewWithinHours} hours
- [Free assessment](/book/) — book a 30-minute conversation directly if you prefer
- [Who we are](/about/) — the founder, the AI-native build team, the name
- [Denver](/denver/) · [Phoenix](/phoenix/) — the two hubs, in person
- [Contact](/contact/) — email or call Main & Machine
- [Careers](/careers/) — join the build team
- [The Ampersand](/blog/) — plain-English AI essays, a few times a month
  ([archive](/blog/archive/), [RSS](/blog/rss.xml))
- [Privacy](/privacy/) · [Terms](/terms/)
`;

// ---------------------------------------------------------------------------
// llms-full.txt — full text of the most important pages
// ---------------------------------------------------------------------------
const FULL_PAGES = [
  "/",
  "/plan/",
  "/plan/sample/",
  "/services/",
  "/services/ai-readiness-audit/",
  "/services/ai-implementation/",
  "/services/managed-ai-services/",
  "/pricing/",
  "/method/",
  "/about/",
  "/work/marcus/",
  // Include the reported scorecard with its methodology and the price catalog.
  "/work/marcus/results/",
  "/services/builds/",
  "/security/",
  "/book/",
  // The two city pages, added 2026-08-09. They were the only key commercial
  // surface missing from the full text, and they are the ones that answer
  // "does this firm work in my metro" — the question a local AI search is
  // actually asking. Each is ~70% locally unique copy (Front Range vs Valley
  // geography, Colorado prevailing wage vs Arizona's 20-day notice), so
  // including both adds real coverage rather than a second copy of one.
  "/denver/",
  "/phoenix/",
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
    .replace(/<a\b[^>]*href="([^"<>]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
      const label = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return /^(?:https?:\/\/|\/|#)/i.test(href) && label ? `[${label}](${href})` : label;
    })
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

// --- index of every guide and every essay -----------------------------------
// The 15 sections above are FULL TEXT of the commercial pages. This is the
// other half of the brief: a one-paragraph summary plus a link for every Field
// Guide entry and every published essay, so an AI system can see the whole
// catalogue without us pasting 14 guides and 15 essays into one 400KB file.
//
// Summaries are each page's own meta description — already written, already
// held to 110–155 chars by meta:check, and already the sentence we chose to
// describe that page. Writing a second summary here would be a second thing to
// keep in step.
function summaryIndex() {
  const out = [];

  const guideRoutes = STATIC_ROUTES.filter((r) => r.startsWith("/guides/") && r !== "/guides/");
  const guides = [];
  for (const route of guideRoutes) {
    const abs = path.join(ROOT, `${route.replace(/^\/|\/$/g, "")}/index.html`);
    if (!fs.existsSync(abs)) continue;
    const { title, description } = pageMeta(fs.readFileSync(abs, "utf8"));
    guides.push(`- [${title.replace(/\s*\|.*$/, "")}](${route})\n  ${description}`);
  }
  if (guides.length) {
    out.push(`${RULE}\nINDEX: The Field Guide — all ${guides.length} entries\nURL: ${SITE_ORIGIN}/guides/\n${RULE}\n\n${guides.join("\n")}`);
  }

  // Essays come from the generated post data. On a local build with no beehiiv
  // key that list is empty and this section is omitted entirely rather than
  // shipped as an empty heading — blog:build already fails the deploy on a
  // zero-post index, so an empty list here can only be local dev.
  let posts = [];
  try {
    const mod = fs.readFileSync(path.join(ROOT, "src", "data", "blog-posts.js"), "utf8");
    const m = /export const posts\s*=\s*(\[[\s\S]*?\]);/.exec(mod);
    if (m) posts = JSON.parse(m[1]);
  } catch { /* no data module locally */ }
  const essays = posts
    .filter((p) => p && p.slug && p.title && !EXCLUDED_POST_SLUGS.includes(p.slug))
    .map((p) => {
      applyPostEditorialOverrides(p);
      const when = (p.publishedAt || "").slice(0, 10);
      const blurb = (p.excerpt || p.subtitle || "").replace(/\s+/g, " ").trim();
      return `- [${p.title}](/blog/${p.slug}/)${when ? ` — ${when}` : ""}\n  ${blurb}`;
    });
  if (essays.length) {
    out.push(`${RULE}\nINDEX: The Ampersand — all ${essays.length} essays\nURL: ${SITE_ORIGIN}/blog/\n${RULE}\n\n${essays.join("\n")}`);
  } else {
    console.warn("[llms:build] WARN: no essays indexed in llms-full.txt (no post data — local build without a beehiiv key)");
  }
  return out;
}
const indexSections = summaryIndex();

const fullOut = `# ${COMPANY.name} — llms-full.txt
# The complete visible text of the ${sections.length} most important pages on
# ${SITE_ORIGIN}/ , concatenated with page delimiters.
# The condensed fact sheet lives at ${SITE_ORIGIN}/llms.txt
# Canonical business facts: ${COMPANY.oneLiner}.
# Contact: ${COMPANY.email} · ${COMPANY.phone} · Denver, CO & Phoenix, AZ.

${[...sections, ...indexSections].join("\n\n")}
`;

// /facts.json — the same canonical facts as machine-readable JSON, for
// agents that prefer structured output over the llms.txt fact sheet.
const { _meta, ...facts } = COMPANY;

/**
 * Drop every `_`-prefixed key, at any depth. Those are editor notes for
 * whoever opens site-facts.json ("Date the count was last verified by hand…",
 * the booking.quarter instructions), and they were being published verbatim on
 * a public endpoint that exists to feed agents canonical facts. An instruction
 * to a maintainer is not a fact about the business, and shipping one invites a
 * model to quote it back as though it were.
 */
const stripNotes = (v) =>
	Array.isArray(v) ? v.map(stripNotes)
		: v && typeof v === "object"
			? Object.fromEntries(Object.entries(v).filter(([k]) => !k.startsWith("_")).map(([k, x]) => [k, stripNotes(x)]))
			: v;

const factsOut = {
  _meta: {
    source: "https://www.mainandmachine.com/facts.json",
    description: "Canonical business facts for Main & Machine, generated from the same source of truth as llms.txt. Human-readable fact sheet: /llms.txt · full page text: /llms-full.txt",
    generatedFrom: "src/data/site-facts.json",
    claimsFrom: "src/data/approved-claims.mjs",
    schemaVersion: _meta?.schemaVersion ?? 1,
  },
  ...stripNotes(facts),
  approvedClaims: APPROVED_CLAIMS,
};
fs.writeFileSync(path.join(ROOT, "llms.txt"), out);
fs.writeFileSync(path.join(ROOT, "llms-full.txt"), fullOut);
fs.writeFileSync(path.join(ROOT, "facts.json"), JSON.stringify(factsOut, null, 2) + "\n");
console.log(`[llms:build] llms.txt + llms-full.txt (${sections.length} pages) + facts.json generated from src/data/site-facts.json`);
