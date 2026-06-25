# Technical SEO / GEO Improvement Pass — Changes

Static site for mainandmachine.com. All work is the on-site technical layer that
supports the off-site (domain authority, directories) and content-strategy fixes.
Existing strengths (fast TTFB, meta tags, canonicals, OG/Twitter, RSS, valid
sitemap/robots, rich JSON-LD, apex→www 301) were preserved — no regressions.

Changes are grouped by priority and shipped as reviewable commits. Generated
blog artifacts (`blog/`, `blog-data/`, `images/blog/`, `sitemap.xml`,
`src/data/blog-posts.js`) remain gitignored and are rebuilt each deploy.

---

## PRIORITY 1 — Crawlability & indexing hygiene

- [x] **Self-host blog images (no more beehiiv S3 hotlinks).** `fetch-blog-posts.mjs`
      now downloads every hero + inline post image into `/images/blog/<slug>/`
      (content-hashed, deduped) and rewrites `<img src>`, `heroImage.assetUrl`,
      the BlogPosting JSON-LD `image`, and `og:image` to the local path.
      `width`/`height` are stamped via `image-size` (hero + inline + cards) for
      zero layout shift; empty inline `alt` gets a title-based fallback. Local
      paths are absolutized to `https://www…` for og/JSON-LD. Downloads degrade
      gracefully (keep remote URL + warn) so one dead asset can't fail a deploy.
      *Activates at deploy* (requires `BEEHIIV_API_KEY`); logic verified offline
      against a local image server.
- [x] **Sitemap `<lastmod>` for every static route.** New `npm run seo:dates`
      (`build-page-dates.mjs`) records each route's last-commit date from git into
      the committed `src/data/page-dates.json`; the sitemap builder reads it, so
      `<lastmod>` is accurate without depending on build-time git (Cloudflare
      shallow-clones). `/blog` + `/blog/archive` track the newest post date. All
      25 static routes now carry `lastmod`; no redirected/noindex/utility URL is
      listed; all URLs use the canonical `https://www` host.
- [x] **Heading hierarchy fixed.** The only `<h5>` on the site were the four
      footer column labels (causing a h1→h2→h3→**h5** skip on every page). Promoted
      to `<h2>` sitewide + blog template + `.foot__col` CSS — visual style
      unchanged. Audit confirms every page has exactly one `<h1>` and a
      self-referencing canonical.
- [x] **robots.txt / noindex verified.** robots disallows only `/api/`; `noindex`
      appears only on 404/privacy/terms (all appropriate). No change needed.

## PRIORITY 2 — Internal linking (blog was an island)

- [x] **Contextual service link per essay.** New `POST_TOPICS` map (config) gives
      each essay its single most-relevant service/industry page; every post now
      renders a "Where this shows up" link to it (generic `/services/` fallback
      for unmapped/future posts).
- [x] **Related posts by topic.** "Keep reading" now scores other posts by shared
      topic tags (falling back to recency) instead of pure recency.
- [x] **End-of-post CTA** links both `/book/` and `/pricing/` (was `/book/` only).
- [x] **Service/industry → proof + pricing.** Wove the one real, permissioned
      proof point (MARCUS — 14 agents for B:Side Capital, `/work/marcus/`) into all
      three service detail pages and all five industry pages, and strengthened the
      thin `/services/sample-audit/` page with audit/pricing/proof links. Result:
      strong topical clustering, no orphan pages (verified by link crawl).

## PRIORITY 3 — GEO / AI-search citability

- [x] **FAQPage on 11 pages.** Added buyer-query FAQs (cost, timeline, what's
      included, remote vs on-site, industries, real example) to the 5 service and
      6 industry/overview pages lacking them, matching the denver/phoenix pattern:
      FAQPage JSON-LD **+** a visible `<details>` block (existing `.faq` markup, no
      new CSS). Content in `scripts/lib/faq-data.mjs`, injected idempotently by
      `npm run faq:inject`. Answers are plain text so visible copy and structured
      data are byte-identical. 48 Q&A total.
- [x] **"What it is" opener — verified, no change.** Every key landing page already
      opens with a plain-English definition in the first ~40 words (home, services,
      pricing, industries, 3 service pages, about, method, industry pages). Not
      rewritten — already compliant, and per voice rules the strong copy is left
      intact.
- [x] **Extractable comparison table** on `/pricing/` and `/services/`: a semantic
      `<table>` (caption + `scope` headers) comparing the three services by price,
      timeline, and deliverables — the format AI engines cite most reliably. Brand
      `.cmp` styles added.
- [x] **All JSON-LD validated.** `facts:check` parses every `ld+json` block on 26
      pages and confirms email/phone/`@id`/prices match `src/data/company.mjs`; the
      Person/Organization graph is consistent; every new FAQPage parses. Prices in
      Offer/PriceSpecification match the live `/pricing/` page.

## PRIORITY 4 — Metadata & social polish

- [x] **Unique titles/descriptions/OG verified.** 21 pages already carry a unique,
      query-aware title + description + per-page `/images/og/*.png`. Blog posts now
      get a self-hosted, absolute `og:image` (was a beehiiv S3 URL) via P1.
- [~] **Utility/legal OG.** `/contact/`, `/privacy/`, `/terms/`, `/404.html` use
      the brand-default `og-image.png` (not the home image) — acceptable for these
      pages. A bespoke `/images/og/contact.png` is a nice-to-have (needs a design
      asset; **see Decisions**).

## PRIORITY 5 — Accessibility

- [x] **Images:** 0 missing `alt` across all static pages (blog images also get
      `alt` via P1).
- [x] **Links:** 0 empty or vague ("read more"/bare-arrow-only) anchors — the site
      already pairs every arrow with descriptive text; nav controls expose
      `aria-expanded`/`aria-label`.
- [x] **Focus order:** logical (DOM-ordered); interactive controls are real
      `<button>`/`<a>` with ARIA state.
- [ ] **Accent contrast — needs your decision (see below).** `--accent #c14a24`
      on cream is **4.29:1**, just under WCAG AA (4.5) for *normal-size* text
      (3.92:1 on `--paper-2`). It **passes** for large text/headings and UI
      (≥3:1), and `--accent-deep` (5.73:1) and `--accent-ink` on ink (5.28:1)
      pass. Not auto-fixed because it's a brand-color change (ground rule: don't
      alter the visual design).

---

## Validation results

| Check | Result |
|---|---|
| `sitemap.xml` | well-formed XML; 25/25 static routes have `lastmod`; canonical host; no redirected/utility URLs |
| `blog/rss.xml` | well-formed XML |
| `robots.txt` | disallows only `/api/`; sitemap referenced |
| JSON-LD (`facts:check`) | OK — parses + facts consistent across 26 pages |
| `seo:check` | OK |
| `placeholders:check` | OK |
| Broken internal links | 0 (static); 58 `/blog/*` links are deploy-generated and all resolve to known post slugs |
| Hotlinked external `<img>` | 0 in committed pages (blog images self-host at deploy) |

---

## Decisions / items that need you

1. **Accent text contrast (AA).** Recommended safe fix: add an `--accent-text:
   #a23c1b` token (5.73:1 on cream) and use it for *normal-size* accent text on
   paper (`.prose a`, `.kicker`, `.svc__cta`, `.essay__seealso a`, `.cmp` links,
   feed links) while leaving `--accent` for buttons/fills/headings. Visually a
   hair darker; meets AA. Say the word and I'll apply it.
2. **`/images/og/contact.png`** (and optionally privacy/terms) — want a bespoke OG
   card, or leave the brand default? Generating it needs a design asset, like the
   other `/images/og/*` cards.
3. **Blog image storage** — currently **deploy-time download, gitignored** (your
   default; re-downloads each build). If you'd rather commit them (survives beehiiv
   S3 changes, heavier repo), I can switch.

## Maintenance notes (no prompt can automate)

- Run **`npm run seo:dates`** after editing static pages (refreshes sitemap
  `lastmod` from git). Currently all dates are `2026-06-24` because this session's
  sitewide commits touched every page; they'll diverge as pages change.
- Run **`npm run faq:inject`** after editing `scripts/lib/faq-data.mjs` (idempotent;
  rewrites the FAQ blocks in place).
- After deploy: **resubmit `sitemap.xml` in Search Console** and request indexing
  on the updated pages (per CLAUDE.md TODO).
- Self-hosted blog images only materialize on a deploy with `BEEHIIV_API_KEY` set.
