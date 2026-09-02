# Site audit — www.mainandmachine.com

Generated 2026-08-08 from the repo at `main` (`ee29d65`). **Read-only audit — no
site behavior was changed.** Live HTTP checks in this document were made against
production with `curl` on the same date.

---

## 1. Stack

| | |
|---|---|
| **Framework / SSG** | **None.** Hand-written static HTML/CSS/JS. No Astro, Next, Eleventy, Hugo, or Jekyll config exists anywhere in the repo. |
| **Templating** | Two systems, by surface. **Static pages: none** — every `<head>`, nav, and footer is hand-written per file and duplicated across ~42 HTML files. **Blog pages only:** plain ES-module template literals in `scripts/lib/templates.mjs` + `scripts/build-blog.mjs`. |
| **Build step** | `npm run build:static` (package.json). One real generator (the blog) plus a facts-stamping pass and 13 guard scripts. Node ESM (`"type": "module"`). |
| **Runtime deps** | `image-size`, `sanitize-html`. Dev: `playwright-core` (used only by the out-of-build QA scripts). |
| **Deploy target** | **Cloudflare Pages**, building from GitHub on push to `main`, publish directory = repo root (`/`). |
| **Edge compute** | Cloudflare Pages Functions in `functions/` (booking API, analytics proxies, Score reverse proxy). |
| **Env vars (set in the Pages project)** | `BEEHIIV_API_KEY`, `BEEHIIV_PUBLICATION_ID`, `RESEND_API_KEY`, `SCORE_ORIGIN`. |
| **No config files for** | `astro.config.*`, `next.config.*`, `.eleventy.js`, `hugo.*`, `netlify.toml`, `vercel.json`, `wrangler.toml` — none present. Cloudflare config is `_headers` + `_redirects` + the Pages dashboard. |

### Build pipeline (`npm run build:static`, in order)

`blog:fetch` → `blog:build` → `facts:render` → `llms:build` → `work:build` →
`testimonials:build` → then the guards: `seo:check`, `facts:check`, `llms:check`,
`head:check`, `tokens:check`, `css:check`, `placeholders:check`, `links:check`,
`book:check`, `cta:check`, `meta:check`, `quarter:check`, `security:check`.

Not in the build (all need Playwright or network): `jsonld:check`, `mono:check`,
`qa:matrix`, `sweep:mobile`, `shots:mobile`, `audit:mobile`, `test:funnel`,
`test:hero`, `smoke:test`, `check-links.mjs`.

### Generated (gitignored) — never hand-edit

`src/data/blog-posts.js`, `blog-data/`, `blog/index.html`, `blog/rss.xml`,
`blog/*/`, `images/blog/`, **`sitemap.xml`**.

Generated but **committed**: `llms.txt`, `llms-full.txt`, `facts.json`,
`images/og/*.png`, `src/data/proof.mjs`, `src/data/page-dates.json`, and the
`data-fact` spans inside committed HTML.

---

## 2. File map — where everything is defined

### 2.1 `<title>` and meta descriptions

| Surface | Where |
|---|---|
| **All 42 static pages** | Hand-written literally in each `index.html` / `404.html`. There is no central table. |
| **Blog** (`/blog/`, `/blog/archive/`, `/blog/<slug>/`) | `scripts/lib/templates.mjs` → `head({title, description, canonical, ogImage, ogType, jsonLd, extraHead})` at line 57, called from `scripts/build-blog.mjs` (`renderHome` L266, `renderArchive` L344, `renderPost` L474). Defaults: `BLOG_DESCRIPTION` / `BLOG_DESCRIPTION_META` in `scripts/lib/config.mjs`. |
| **`/score/`** (proxied, no HTML in this repo) | `lib/score-proxy.mjs` → `SCORE_TITLE` (L31), `SCORE_DESCRIPTION` (L32), injected into the upstream response via HTMLRewriter. |
| **Guards** | `scripts/check-head.mjs` (description < 40 chars = error; `<title>` > 60 chars = error, measured decoded). `scripts/check-meta.mjs` (title ≤ 60, description 110–155, one `<h1>`, canonical present, `og:image` must resolve to a real file). |

### 2.2 Canonical URLs, Open Graph, Twitter

| Surface | Where |
|---|---|
| Static pages | Hand-written `<link rel="canonical">` + full `og:*` / `twitter:*` block in each file's `<head>`. |
| Blog | `scripts/lib/templates.mjs` `head()` L82–101 — emits canonical, `og:type/site_name/title/description/url/image/image:type/width/height/alt`, `twitter:card=summary_large_image` + title/description/image/alt. |
| `/score/` | `lib/score-proxy.mjs` `SEO_HEAD_HTML` (L171–182). Strips any `og:*` / canonical the upstream app emits, then appends ours. |
| **OG card images** | `images/og/*.png` (44 cards, 1200×630), **rendered by `scripts/build-og.mjs` and committed**. Most are *derived* from the page (kicker + H1 read out of the HTML); four are authored in that file's `EXPLICIT` map (`/score/`, `/careers/`, `/contact/`, `/guides/`). Re-render one: `node scripts/build-og.mjs --only=/careers/`. |
| Site-wide default | `og-image.png` (root), referenced as `DEFAULT_OG_IMAGE` in `scripts/lib/config.mjs`. |

### 2.3 robots.txt, sitemap.xml, RSS, llms.txt

| File | Origin | Notes |
|---|---|---|
| `robots.txt` | **Hand-maintained, committed.** | Disallows `/score/report/`, `/s/`, `/api/`, `/design/`. Explicit `Allow` blocks for GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended. Declares `Sitemap: https://www.mainandmachine.com/sitemap.xml`. |
| `sitemap.xml` | **Generated, gitignored.** `scripts/build-blog.mjs` → `renderSitemap()` (L690). | Sources: `STATIC_ROUTES` + `PROXIED_ROUTES` + `PROXIED_LASTMOD` (all in `scripts/lib/config.mjs`), `/blog/`, `/blog/archive/`, and every fetched post. `<lastmod>` from `src/data/page-dates.json` (generated from git history by `npm run seo:dates`). `changefreq`/`priority` from `seoMeta()` (L668). |
| `/blog/rss.xml` | **Generated, gitignored.** `scripts/build-blog.mjs` → `renderRss()` (L636). | RSS 2.0. Linked from every page's `<head>` via `<link rel="alternate">`. |
| `llms.txt`, `llms-full.txt`, `facts.json` | **Generated, committed.** `scripts/build-llms.mjs` (writes all three at L334–336). | Source of truth is `src/data/site-facts.json`. `_`-prefixed maintainer keys are stripped before publishing `/facts.json`. Guarded by `scripts/check-llms.mjs`. |
| `.well-known/security.txt` | Hand-maintained, committed. Guarded by `scripts/check-security-txt.mjs`. |

**Note on the local `sitemap.xml`:** the working-copy sitemap currently lists **43
URLs with zero blog posts**, because `blog-data/index.json` here has `posts: 0` (no
beehiiv key locally). Production's sitemap has the same 43 plus **15 post URLs**.
The committed working copy is not authoritative — the deploy regenerates it.

### 2.4 JSON-LD structured data

Searched the whole repo for `ld+json`, `schema.org`, `jsonld`.

| Surface | Where it's built |
|---|---|
| **Static pages (40 of 42)** | **Hand-embedded** `<script type="application/ld+json">` in each file, one `@graph` block (guides/industries/services and a few others carry a second block for FAQ). |
| **Blog** | `scripts/lib/templates.mjs` → `orgJsonLd({searchAction})` (L164) supplies `ProfessionalService` + `WebSite` + `Person`; `scripts/build-blog.mjs` adds `Blog` (L269), `BlogPosting` (L277, L481), `CollectionPage` (L347), `BreadcrumbList` (`breadcrumbLd()` L728). |
| **`/score/`** | `lib/score-proxy.mjs` → `SCORE_GRAPH` (L37) + `SCORE_FAQ` (L107), injected at the edge. |
| **FAQPage blocks** | `scripts/inject-faq.mjs` writes them from `scripts/lib/faq-data.mjs` between `<!-- FAQ-JSONLD:auto -->` markers (idempotent; `npm run faq:inject`). |
| **Canonical `@id`s** | `…/#org`, `…/#person-cmyers`, `…/#website`; city pages add `…/denver/#local`, `…/phoenix/#local`. |
| **Validators** | `scripts/check-jsonld.mjs` — validates all blocks against the real schema.org vocabulary (not in `build:static`; downloads ~1.5 MB and caches under `node_modules/.cache/`). `scripts/check-facts.mjs` parses every block and fails on email/phone/`@id`/`sameAs` drift. |

Types found, per page — see §5.

**Updated 2026-08-09 — the structured-data pass.** `/privacy/` and `/terms/` now
carry a `WebPage` + `WebSite` + `ProfessionalService` + `Person` +
`BreadcrumbList` graph built by `simplePageGraph()` in `scripts/lib/jsonld.mjs`.
`404.html` still has none, which is correct for a noindex error page. The
shared `#org` / `#website` / `#person-cmyers` / city `#local` nodes are now
STAMPED from the facts file by `scripts/render-jsonld.mjs` rather than
hand-maintained on 39 pages, and three guards hold the layer in place:

| command | in `build:static` | what it proves |
|---|---|---|
| `jsonld:presence` | yes | every indexable page has a parseable graph carrying the three shared entities; no dangling `@id`; no `@id` with two `@type`s; every FAQ question appears in the page's visible text |
| `jsonld:drift` | yes | every shared node still matches `site-facts.json` |
| `jsonld:check` | no (needs network) | full schema.org vocabulary validation |

### 2.5 Redirects

| Rule | Where | Verified |
|---|---|---|
| **apex → www** | **NOT in this repo.** Configured in the Cloudflare dashboard (README.md L83–89: "Cloudflare offers a one-click redirect from apex → www"). | ✅ `https://mainandmachine.com/` → **301** → `https://www.mainandmachine.com/`; `http://` → **301** → same. |
| `/work/sample-audit/` → `/services/sample-audit/` | `_redirects` L4 | 301 |
| `/services/ai-readiness-audit/` → `/services/#audit` | `_redirects` L7 | 301 |
| `/services/implementation-sprint/` → `/services/#sprint` | `_redirects` L8 | 301 |
| `/services/managed-services/` → `/services/#managed` | `_redirects` L9 | 301 |
| `/report/*` → `/score/report/:splat` | `_redirects` L20 | 301 |
| `/score/*`, `/s/*` | **Not redirects** — reverse-proxied same-origin by `functions/score/[[path]].js` and `functions/s/[[path]].js` (logic in `lib/score-proxy.mjs`, origin from `SCORE_ORIGIN`). `_redirects` carries an explicit warning never to add a redirect here, which would pre-empt the Functions. |

Security/caching headers: `_headers` (enforced CSP, HSTS with un-submitted
`preload`, `frame-ancestors 'self'`; CSP detached for `/score`).

### 2.6 The 404 page

`404.html` (repo root).

- **HTTP status: confirmed 404.** `curl` against
  `https://www.mainandmachine.com/this-page-does-not-exist-audit-check` returns
  **`404`** — Cloudflare Pages serves the root `404.html` with the correct status
  for unmatched routes.
- **Navigation: yes.** Full site nav + footer; 20 internal links including `/`,
  `/services/` (+ the three anchors), `/pricing/`, `/method/`, `/about/`,
  `/work/`, `/blog/`, `/contact/`, `/security/`, `/score/`, `/privacy/`, `/terms/`.
- **CTA: yes.** Two primary buttons (`btn--primary`, one `btn--lg`) plus three
  secondary — the primaries point at `/book/`.
- `<meta name="robots" content="noindex">`, no canonical, no `og:image` — both
  deliberate and named in `EXEMPT` in `scripts/check-meta.mjs`.
- No utility bar and a cut-down footer, by design (with `/privacy/` and `/terms/`
  — named in `CHROME_MINIMAL` in `scripts/qa-matrix.mjs`).

### 2.7 Global constants

| Constant | Canonical home |
|---|---|
| **All business facts** (prices, timelines, phone, email, cities, guarantee, rollover, booking quarter) | **`src/data/site-facts.json`** — the machine-readable source of truth. |
| ESM re-export | `src/data/company.mjs` (`COMPANY`) — generated surfaces import this, never the JSON. |
| Derived display values | `scripts/lib/fact-values.mjs` — one place; imported by both the writer (`render-facts.mjs`) and the reader (`check-facts.mjs`). |
| Site identity, routes, cache-buster | `scripts/lib/config.mjs` (`SITE_ORIGIN`, `STATIC_ROUTES`, `PROXIED_ROUTES`, `NOINDEX_ROUTES`, `ASSET_VERSION = "133"`). |
| Proof figures | `data/build-log.json` → `scripts/build-work.mjs` → `src/data/proof.mjs` (for Functions/emails, which can't read the JSON). |
| Testimonials | `data/testimonials.json` → `scripts/build-testimonials.mjs` (renders only `permission: true` entries). |
| FAQ copy | `scripts/lib/faq-data.mjs`. |

**How a fact reaches a page:** edit `site-facts.json` → `npm run facts:render`
stamps every `<span data-fact="…">` in committed HTML → `npm run llms:build`
regenerates `llms.txt` / `llms-full.txt` / `facts.json`. `check-facts.mjs`
re-derives every value and compares the stamped span byte-for-byte, so editing
the JSON without re-running `facts:render` **fails the build**.

---

## 3. URL inventory

**43 indexable HTML routes + 15 blog posts = 58 public pages**, plus a proxied app,
generated files, API endpoints, and 6 redirects.

### 3.1 Static pages (41 committed HTML files, all in `STATIC_ROUTES` + sitemap)

| # | URL | File |
|---|---|---|
| 1 | `/` | `index.html` |
| 2 | `/book/` | `book/index.html` |
| 3 | `/pricing/` | `pricing/index.html` |
| 4 | `/method/` | `method/index.html` |
| 5 | `/about/` | `about/index.html` |
| 6 | `/services/` | `services/index.html` |
| 7 | `/services/sample-audit/` | `services/sample-audit/index.html` |
| 8 | `/services/builds/` | `services/builds/index.html` |
| 9 | `/industries/` | `industries/index.html` |
| 10 | `/industries/professional-services/` | `industries/professional-services/index.html` |
| 11 | `/industries/retail/` | `industries/retail/index.html` |
| 12 | `/industries/healthcare/` | `industries/healthcare/index.html` |
| 13 | `/industries/construction/` | `industries/construction/index.html` |
| 14 | `/industries/hospitality/` | `industries/hospitality/index.html` |
| 15 | `/denver/` | `denver/index.html` |
| 16 | `/phoenix/` | `phoenix/index.html` |
| 17 | `/work/` | `work/index.html` |
| 18 | `/work/marcus/` | `work/marcus/index.html` |
| 19 | `/work/marcus/results/` | `work/marcus/results/index.html` |
| 20 | `/guides/` | `guides/index.html` |
| 21 | `/guides/ai-consultant-cost/` | `guides/ai-consultant-cost/index.html` |
| 22 | `/guides/ai-readiness-checklist/` | `guides/ai-readiness-checklist/index.html` |
| 23 | `/guides/ai-consultant-vs-in-house/` | `guides/ai-consultant-vs-in-house/index.html` |
| 24 | `/guides/how-to-choose-an-ai-consultant/` | `guides/how-to-choose-an-ai-consultant/index.html` |
| 25 | `/guides/what-ai-automation-costs-to-run/` | `guides/what-ai-automation-costs-to-run/index.html` |
| 26 | `/guides/ai-agents-vs-automations-vs-integrations/` | `guides/ai-agents-vs-automations-vs-integrations/index.html` |
| 27 | `/guides/how-long-ai-implementation-takes/` | `guides/how-long-ai-implementation-takes/index.html` |
| 28 | `/guides/what-is-an-ai-readiness-audit/` | `guides/what-is-an-ai-readiness-audit/index.html` |
| 29 | `/guides/ai-data-cloud-vs-on-prem/` | `guides/ai-data-cloud-vs-on-prem/index.html` |
| 30 | `/guides/chatgpt-vs-custom-ai/` | `guides/chatgpt-vs-custom-ai/index.html` |
| 31 | `/guides/signs-you-are-not-ready-for-ai/` | `guides/signs-you-are-not-ready-for-ai/index.html` |
| 32 | `/guides/how-to-scope-an-ai-project/` | `guides/how-to-scope-an-ai-project/index.html` |
| 33 | `/guides/ai-roi-math-small-business/` | `guides/ai-roi-math-small-business/index.html` |
| 34 | `/guides/ai-for-the-skeptical-owner/` | `guides/ai-for-the-skeptical-owner/index.html` |
| 35 | `/calculator/` | `calculator/index.html` |
| 36 | `/security/` | `security/index.html` |
| 37 | `/contact/` | `contact/index.html` |
| 38 | `/careers/` | `careers/index.html` |
| 39 | `/privacy/` | `privacy/index.html` |
| 40 | `/terms/` | `terms/index.html` |

### 3.2 Generated blog (gitignored; rebuilt from beehiiv every deploy)

| URL | Source |
|---|---|
| `/blog/` | `renderHome()` |
| `/blog/archive/` | `renderArchive()` — one page, not per-month |
| `/blog/<slug>/` × 15 | `renderPost()` |

Live post slugs (from the production sitemap, newest first):
`seventy-years-of-overnight-success`, `what-the-machine-cannot-do`,
`where-your-data-goes`, `open-models-closed-models`,
`teaching-the-machine-your-business`, `what-an-agent-actually-is`,
`how-to-talk-to-the-machine`, `why-the-machine-makes-things-up`,
`sorting-the-vocabulary`, `the-buildings-behind-the-intelligence`,
`why-everything-happened-at-once`, `the-currency-of-the-machine`,
`how-the-machine-learns`, `the-prediction-engine`, `how-to-smell-the-hype`.

Excluded from the build: `EXCLUDED_POST_SLUGS = ["test"]`.

### 3.3 Proxied (no HTML in this repo)

| URL | Handler |
|---|---|
| `/score/` (+ `/score/*`, incl. `/score/report/<token>`, `/score/_next/*`) | `functions/score/[[path]].js` → `lib/score-proxy.mjs` |
| `/s/*` — printed book-QR short links | `functions/s/[[path]].js`. **Permanent contract — never remove.** |
| `/_next/*` | `functions/_next/[[path]].js` — compat shim for pre-basePath cached HTML. Safe to delete eventually. |

`/score/` is sitemapped (priority 0.8). `/score/report/` and `/s/` are
`Disallow`ed in robots.txt.

### 3.4 Not sitemapped

| URL | Why |
|---|---|
| `/book/thanks/` | `NOINDEX_ROUTES` — post-conversion page, carries `robots: noindex, follow`. Guarded both directions by `check-seo.mjs`. |
| `/404.html` | Error page, `noindex`. |
| `/design/home-reference.html` | Internal visual spec. Deployed (Pages serves the repo root) but `Disallow`ed in robots.txt and unlinked. |

### 3.5 Non-HTML routes

`/robots.txt` · `/sitemap.xml` · `/llms.txt` · `/llms-full.txt` · `/facts.json` ·
`/blog/rss.xml` · `/.well-known/security.txt` · `/styles.css` · `/js/*.js` ·
`/fonts/*.woff2` · `/images/**` · `/og-image.png` · `/favicon.ico` ·
`/icon-512.png` · `/apple-touch-icon.png` · `/blog-data/index.json`

**API / Functions:** `/api/book-assessment` (POST, Resend) · `/api/event` (POST,
Plausible proxy) · `/js/pa` (GET, Plausible script proxy).

**Live status check (2026-08-08):** `/robots.txt`, `/sitemap.xml`, `/llms.txt`,
`/facts.json`, `/blog/rss.xml`, `/score/`, `/.well-known/security.txt` — all
**200**. Unknown path — **404**. Apex — **301 → www**.

---

## 4. Files containing hardcoded prices, phones, or contact details

**The important distinction:** `facts:render` stamps a small number of
`<span data-fact="…">` spans per page. Everything else — prose, meta
descriptions, JSON-LD `offers`, `<title>`s — carries the number as a **plain
literal in the HTML**. So "the site has a facts system" and "prices are
hardcoded in 41 HTML files" are both true. The guards catch drift by
*re-deriving and comparing*, not by templating.

### 4.1 Canonical sources (edit here)

| File | Role |
|---|---|
| `src/data/site-facts.json` | **Source of truth.** All prices, timelines, phone, email, cities, quarter. |
| `src/data/company.mjs` | ESM re-export (`COMPANY`). |
| `scripts/lib/fact-values.mjs` | Derives every `data-fact` value. |

### 4.2 Non-HTML files carrying the literals

| File | Tokens | Nature |
|---|---|---|
| `llms.txt`, `llms-full.txt`, `facts.json` | all prices, phone, email | **Generated** by `build-llms.mjs` — do not hand-edit |
| `scripts/build-llms.mjs` | `$3,500` `$8,500` `$18,000` `$60,000` `$1,500` `$95,000`, Denver/Phoenix | generator templates |
| `scripts/check-facts.mjs` | all of the above + `$12,000` / `$45,000` (**forbidden retired band**) + phone | guard assertions |
| `scripts/check-llms.mjs` | price whitelist | guard |
| `scripts/lib/faq-data.mjs` | `$3,500` `$8,500` `$18,000` `$60,000` `$1,500`, Denver/Phoenix | FAQ copy source |
| `scripts/lib/templates.mjs` | Denver/Phoenix | blog chrome |
| `scripts/build-og.mjs` | Denver/Phoenix | OG card copy (prices are read from `COMPANY` at render time, never baked as literals) |
| `lib/score-proxy.mjs` | `$3,500` `$60,000`, Denver/Phoenix | injected `/score/` description + JSON-LD |
| `functions/api/book-assessment.js` | `cmyers@mainandmachine.com` | booking backend |
| `emails/assessment-autoresponder.js` | Denver/Phoenix | email template |
| `.well-known/security.txt` | `cmyers@mainandmachine.com` | contact |
| `og-image.svg` | Denver/Phoenix | social card source |
| `styles.css` | Denver/Phoenix | CSS content strings |
| `design/home-reference.html` | all prices, email | internal mock, not a page |
| `CLAUDE.md` | all of the above | documentation |

### 4.3 HTML pages — literal counts

`facts` = number of `data-fact` spans on the page. Price/phone counts are **total
occurrences of the literal in the file** (prose + meta + JSON-LD combined).

| page | data-fact spans | 928-363-6639 | $3,500 | $8,500 | $18,000 | $60,000 | $1,500 | $95,000 | $45,000 | email |
|---|---|---|---|---|---|---|---|---|---|---|
| `index.html` | 11 | 3 | 5 | 2 | 3 | 3 | 2 | 1 | – | 4 |
| `pricing/index.html` | **19** | 2 | 9 | 7 | 8 | 10 | 8 | 6 | **1** | 3 |
| `services/index.html` | 9 | 2 | 12 | 7 | 7 | 12 | 9 | 1 | – | 3 |
| `services/builds/index.html` | 10 | 2 | 4 | 2 | 2 | 3 | 2 | 1 | – | 3 |
| `services/sample-audit/index.html` | 4 | 2 | 8 | 6 | – | 1 | – | – | – | 3 |
| `denver/index.html` | 7 | 3 | 8 | 3 | 3 | 4 | 4 | – | – | 4 |
| `phoenix/index.html` | 7 | 3 | 8 | 3 | 3 | 4 | 4 | – | – | 4 |
| `book/index.html` | 5 | 2 | 2 | – | – | 1 | – | – | – | 3 |
| `book/thanks/index.html` | 3 | 2 | 2 | – | – | 1 | – | – | – | 8 |
| `calculator/index.html` | 4 | 2 | 2 | – | 5 | 4 | – | – | – | 3 |
| `method/index.html` | 3 | 2 | 2 | – | – | 1 | 1 | – | – | 3 |
| `about/index.html` | 2 | 2 | 2 | – | – | 1 | 1 | – | – | 3 |
| `work/index.html` | 4 | 2 | 2 | – | – | 1 | – | – | – | 3 |
| `work/marcus/index.html` | 4 | 2 | 2 | – | – | 1 | – | 1 | – | 3 |
| `work/marcus/results/index.html` | 4 | 2 | 2 | – | – | 1 | – | – | – | 3 |
| `industries/index.html` | 2 | 2 | 8 | 2 | 2 | 3 | 3 | – | – | 3 |
| `industries/professional-services/` | 2 | 2 | 8 | 3 | 6 | 5 | 1 | – | – | 3 |
| `industries/healthcare/` | 2 | 2 | 8 | 3 | 3 | 4 | 1 | – | – | 3 |
| `industries/construction/` | 2 | 2 | 5 | 3 | 6 | 4 | 1 | – | – | 3 |
| `industries/retail/` | 2 | 2 | 5 | 3 | 3 | 4 | 1 | – | – | 3 |
| `industries/hospitality/` | 2 | 2 | 5 | 3 | 3 | 4 | 1 | – | – | 3 |
| `guides/index.html` | 2 | 2 | 6 | 3 | 2 | 4 | – | – | – | 3 |
| `guides/ai-consultant-cost/` | 4 | 2 | 12 | 5 | 5 | 11 | 1 | – | – | 3 |
| `guides/what-is-an-ai-readiness-audit/` | 2 | 2 | 13 | 11 | 1 | 2 | – | – | – | 3 |
| `guides/ai-roi-math-small-business/` | 3 | 2 | 5 | 3 | **15** | 8 | – | – | – | 3 |
| `guides/chatgpt-vs-custom-ai/` | 3 | 2 | 3 | 1 | 9 | 10 | – | – | – | 3 |
| `guides/how-to-scope-an-ai-project/` | 2 | 2 | 5 | 3 | 3 | 6 | – | 1 | – | 3 |
| `guides/signs-you-are-not-ready-for-ai/` | 3 | 2 | 7 | 4 | 2 | 3 | – | – | – | 3 |
| `guides/what-ai-automation-costs-to-run/` | 2 | 2 | 4 | 2 | 3 | 4 | 2 | – | – | 3 |
| `guides/ai-agents-vs-automations-vs-integrations/` | 2 | 2 | 3 | 1 | 3 | 4 | – | – | – | 3 |
| `guides/ai-readiness-checklist/` | 2 | 2 | 3 | 1 | 2 | 2 | – | – | – | 3 |
| `guides/how-to-choose-an-ai-consultant/` | 2 | 2 | 3 | 1 | 1 | 2 | 2 | – | – | 3 |
| `guides/ai-consultant-vs-in-house/` | 2 | 2 | 3 | 1 | 1 | 2 | – | – | – | 3 |
| `guides/ai-for-the-skeptical-owner/` | 2 | 2 | 3 | 1 | 1 | 2 | – | – | – | 3 |
| `guides/how-long-ai-implementation-takes/` | 2 | 2 | 3 | 1 | 1 | 2 | – | – | – | 3 |
| `guides/ai-data-cloud-vs-on-prem/` | 2 | 2 | 2 | – | – | 1 | – | – | – | 3 |
| `contact/index.html` | 4 | **7** | 2 | – | – | 1 | – | – | – | 9 |
| `security/index.html` | 4 | 2 | 2 | – | – | 1 | – | – | – | 3 |
| `careers/index.html` | 2 | 2 | 2 | – | – | 1 | – | – | – | 6 |
| `privacy/index.html` | **0** | 2 | – | – | – | – | – | – | – | 10 |
| `terms/index.html` | **0** | 2 | – | – | – | – | – | – | – | 4 |
| `404.html` | **0** | – | – | – | – | – | – | – | – | 2 |

Observations, stated as findings only (nothing was changed):

- **`$45,000` appears once, in `pricing/index.html`.** The retired sprint band
  `$12,000–$45,000` is a FORBIDDEN token in `check-facts.mjs`; a bare `$45,000`
  outside that exact string is not caught by that rule. Worth eyeballing the
  context before assuming it's fine. `$12,000` appears only in `CLAUDE.md` and
  the guard itself.
- `480-360-5128` — **zero occurrences anywhere in the repo.** Not a live number.
- The canonical phone appears on all 42 HTML files (2–7× each, footer + JSON-LD
  `telephone`); the canonical email on all 42 (2–10×).
- `/privacy/` and `/terms/` carry **no `data-fact` spans and no JSON-LD**.

---

## 5. Existing JSON-LD, per page

`titleLen` / `descLen` are decoded character counts (`&amp;` counts as 1) against
the `meta:check` budgets: title ≤ 60, description 110–155.

| page | title | desc | canon | OG | tw:card | robots | ld blocks | @types |
|---|---|---|---|---|---|---|---|---|
| `index.html` | 49 | 147 | ✓ | ✓ | large | – | 2 | ProfessionalService, WebSite, Person, EducationalOrganization, FAQPage |
| `book/` | 52 | 136 | ✓ | ✓ | large | – | 1 | ProfessionalService, WebSite, Person, BreadcrumbList, FAQPage |
| `book/thanks/` | 33 | 151 | ✓ | ✓ | large | **noindex, follow** | 1 | ProfessionalService, WebSite, Person, BreadcrumbList |
| `pricing/` | 58 | **119** | ✓ | ✓ | large | – | 1 | ProfessionalService, **Service ×4**, WebSite, Person, BreadcrumbList, FAQPage |
| `method/` | 59 | 141 | ✓ | ✓ | large | – | 1 | ProfessionalService, WebSite, Person, **HowTo**, BreadcrumbList |
| `about/` | 51 | 141 | ✓ | ✓ | large | – | 1 | ProfessionalService, WebSite, Person, EducationalOrganization, BreadcrumbList |
| `services/` | 54 | 149 | ✓ | ✓ | large | – | 2 | ProfessionalService, Service ×3, WebSite, Person, BreadcrumbList, FAQPage |
| `services/sample-audit/` | 56 | 148 | ✓ | ✓ | large | – | 2 | ProfessionalService, WebSite, Person, BreadcrumbList, FAQPage |
| `services/builds/` | 53 | 149 | ✓ | ✓ | large | – | 1 | ProfessionalService, **Service ×13**, WebSite, Person, BreadcrumbList |
| `industries/` | 58 | 144 | ✓ | ✓ | large | – | 2 | ProfessionalService, WebSite, Person, BreadcrumbList, FAQPage |
| `industries/professional-services/` | 57 | 145 | ✓ | ✓ | large | – | 2 | ProfessionalService, WebSite, Person, BreadcrumbList, FAQPage |
| `industries/retail/` | 43 | 145 | ✓ | ✓ | large | – | 2 | (same) |
| `industries/healthcare/` | 44 | 147 | ✓ | ✓ | large | – | 2 | (same) |
| `industries/construction/` | 45 | 150 | ✓ | ✓ | large | – | 2 | (same) |
| `industries/hospitality/` | 49 | 148 | ✓ | ✓ | large | – | 2 | (same) |
| `denver/` | 50 | 151 | ✓ | ✓ | large | – | 1 | **ProfessionalService ×2** (org + `#local`), Person, WebSite, BreadcrumbList, FAQPage |
| `phoenix/` | 50 | 151 | ✓ | ✓ | large | – | 1 | (same shape) |
| `work/` | 57 | 155 | ✓ | ✓ | large | – | 1 | ProfessionalService, WebSite, Person, CollectionPage, BreadcrumbList |
| `work/marcus/` | 51 | 154 | ✓ | ✓ | large | – | 1 | ProfessionalService, WebSite, Person, **Article**, BreadcrumbList |
| `work/marcus/results/` | 56 | 155 | ✓ | ✓ | large | – | 1 | (same) |
| `guides/` | 52 | 152 | ✓ | ✓ | large | – | 2 | ProfessionalService, WebSite, Person, CollectionPage, BreadcrumbList, FAQPage |
| all 14 `guides/<slug>/` | 47–60 | 142–155 | ✓ | ✓ | large | – | 2 | ProfessionalService, WebSite, Person, **Article**, BreadcrumbList, FAQPage |
| `calculator/` | 53 | 144 | ✓ | ✓ | large | – | 1 | ProfessionalService, WebSite, Person, BreadcrumbList |
| `security/` | 41 | 155 | ✓ | ✓ | large | – | 1 | ProfessionalService, WebSite, Person, **WebPage**, BreadcrumbList, FAQPage |
| `contact/` | 59 | 134 | ✓ | ✓ | large | – | 1 | ProfessionalService, WebSite, Person, **ContactPage**, BreadcrumbList |
| `careers/` | 50 | 130 | ✓ | ✓ | large | – | 1 | ProfessionalService, WebSite, Person, BreadcrumbList |
| `privacy/` | 31 | 116 | ✓ | ✓ | large | – | **0** | **none** |
| `terms/` | 33 | 143 | ✓ | ✓ | large | – | **0** | **none** |
| `404.html` | 31 | 116 | – | – | – | **noindex** | 0 | none (exempt) |
| `/score/` (proxied) | `SCORE_TITLE` | `SCORE_DESCRIPTION` | ✓ (injected) | ✓ (injected) | large | – | 2 | `SCORE_GRAPH` + `SCORE_FAQ` |
| `/blog/` | generated | generated | ✓ | ✓ | large | – | ≥1 | Blog, BlogPosting[], + org graph, SearchAction |
| `/blog/archive/` | generated | generated | ✓ | ✓ | large | – | ≥1 | CollectionPage, org graph |
| `/blog/<slug>/` | generated | generated | ✓ | ✓ | large | – | ≥1 | BlogPosting, BreadcrumbList, org graph |

Notes:

- **Every static page's `og:image` resolves to a bespoke card** in `images/og/`
  (44 cards for 43 routes; `ai-readiness-audit.png`, `implementation-sprint.png`
  and `managed-services.png` correspond to the three consolidated/redirected
  service URLs). Enforced by `meta:check`.
- `pricing/`'s description is **119 chars** — inside the 110–155 budget but the
  shortest on the site.
- Longest titles: `/guides/how-to-scope-an-ai-project/` at **60** (exactly at the
  cap) and `/method/`, `/contact/`, `/guides/ai-agents-…` at 59.
- The `WebSite` node carries a `SearchAction` only where `orgJsonLd({searchAction:
  true})` is called (blog surfaces). `query-input` is allowlisted in
  `check-jsonld.mjs` as a Google extension.

---

## 6. Things worth a second look

Recorded as observations from this audit; **nothing was changed.**

1. **`$45,000` in `pricing/index.html`** — the only occurrence outside the
   forbidden-token guard and `CLAUDE.md`. The guard only fires on the exact
   string `$12,000–$45,000`.
2. **`/privacy/` and `/terms/` have no JSON-LD.** Every other indexable page
   carries the `@graph`. A minimal `WebPage` + `BreadcrumbList` would make the
   entity graph complete.
3. **apex → www lives only in the Cloudflare dashboard**, not in the repo. It
   works (verified 301), but it isn't reproducible from source and isn't
   covered by any check.
4. **The committed working-copy `sitemap.xml` has zero blog posts** because the
   local `blog-data/index.json` is empty. It's gitignored and regenerated at
   deploy, so this is expected — but don't read the local file as the truth.
5. **`functions/_next/[[path]].js`** is marked "safe to delete after a few weeks
   in production" (pre-basePath compat, dated 2026-07).
6. **`design/home-reference.html` is deployed.** Robots-disallowed and unlinked,
   but publicly fetchable.
7. **`jsonld:check`, `mono:check`, and `qa:matrix` are not in `build:static`** —
   by design (network / Playwright), so JSON-LD vocabulary errors and mono-rule
   violations can reach production without a red build.

---

## 7. Quick reference — command map

| Task | Command |
|---|---|
| Full deploy build | `npm run build:static` |
| Blog only, no beehiiv key | `ALLOW_EMPTY_BLOG=1 npm run blog:build` |
| Re-stamp facts after editing `site-facts.json` | `npm run facts:render && npm run llms:build` |
| Re-render one OG card | `node scripts/build-og.mjs --only=/careers/` |
| Regenerate sitemap `<lastmod>` from git | `npm run seo:dates` |
| Re-inject FAQ blocks | `npm run faq:inject` |
| Validate JSON-LD against schema.org | `npm run jsonld:check` |
| Design-system matrix (needs Playwright) | `npm run qa:matrix` |
| Local preview | `npm run preview` (`http://localhost:8000`) |
