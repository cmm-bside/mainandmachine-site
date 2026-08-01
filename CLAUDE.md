# CLAUDE.md

## What this is

The production marketing site for **Main & Machine** (www.mainandmachine.com) — AI
consulting and implementation for small and mid-size businesses.

**Stack: plain static HTML/CSS/JS, no framework.** Pages are hand-written HTML files:
the homepage (`index.html`, six sections), `book/`, `pricing/`, `method/`, `about/`,
`services/` (+ 3 service detail pages), `industries/` (+ 5 industry pages),
`denver/` + `phoenix/` city pages, `work/` (+ `work/sample-audit/`), `calculator/`,
`contact/`, `privacy/`, `terms/`, `404.html`. The one build step is the blog, **The Ampersand**,
prerendered at deploy time from beehiiv:

- **Hosting/deploy:** GitHub → Cloudflare Pages runs `npm run build:static` on every
  push to `main` and serves the repo root (`/`). Env: `BEEHIIV_API_KEY`,
  `BEEHIIV_PUBLICATION_ID`, `RESEND_API_KEY` (set in the Pages project).
- **`npm run build:static`** = `blog:fetch` (pull posts from beehiiv into `blog-data/`)
  → `blog:build` (prerender `/blog/*`, `rss.xml`, `sitemap.xml`) → `llms:build`
  (regenerate `llms.txt` from the facts file — never hand-edit `llms.txt`)
  → `seo:check` → `facts:check` → `llms:check` → `head:check` →
  `placeholders:check` → `links:check` → `book:check`.
  **`blog:build` FAILS on a zero-post index** — an empty fetch used to prerender
  an empty archive and 404 every committed `/blog/<slug>/` link with a green
  build. Local dev without a beehiiv key must say so out loud:
  `ALLOW_EMPTY_BLOG=1 npm run blog:build` (never in CI/deploy; `postinstall`
  sets it because it runs before any fetch). Generated blog artifacts are **gitignored** — never
  hand-edit `blog/`, `blog-data/`, `sitemap.xml`, or `src/data/blog-posts.js`; edit
  `scripts/lib/templates.mjs` and `scripts/build-blog.mjs` instead. New static pages
  must be added to `STATIC_ROUTES` in `scripts/lib/config.mjs` (sitemap) and to
  `ALL_PAGES` in `scripts/check-facts.mjs`.
- **Structured data:** every page carries an `@graph` JSON-LD block whose entities
  connect via the canonical `@id`s `…/#org`, `…/#person-cmyers`, `…/#website`
  (city pages add `…/denver/#local` / `…/phoenix/#local`). Blog pages get theirs from
  `orgJsonLd()` in `scripts/lib/templates.mjs` (reads the facts file); static pages
  hand-embed it, and `facts:check` parses every block and fails the build if an email,
  phone, or `@id` drifts from `src/data/company.mjs`.
- **Styling:** all in `styles.css` (design tokens in the `:root` blocks at the top —
  the "A+ ELEVATION LAYER" block wins). When CSS changes, bump the cache-buster
  (`styles.css?v=N` in the HTML pages **and** `ASSET_VERSION` in
  `scripts/lib/config.mjs`).
- **Booking form backend:** Cloudflare Pages Function at
  `functions/api/book-assessment.js`, email templates in `emails/`, sends via Resend.
  Logic-only test (no network): `npm run test:book`.
- **Components:** there is no component system for the static pages — the topbar, nav,
  and footer are duplicated in `index.html` and `book/index.html`, and generated for
  blog pages by `scripts/lib/templates.mjs`. Keep them in sync when editing one.

## Canonical business facts — NEVER vary these, anywhere

The machine-readable source of truth is **`src/data/site-facts.json`** (re-exported as
`COMPANY` by `src/data/company.mjs` — generated surfaces import the module, never the
JSON directly). Edit a price/timeline/contact fact in the JSON, then run
`npm run facts:render && npm run llms:build` (both run in build:static): render-facts
stamps every `data-fact="…"` span in committed HTML (pricing cards, footers), and
llms:build regenerates llms.txt, llms-full.txt, and the public /facts.json.
Guards: `scripts/check-facts.mjs` fails the build if static pages drift, and
`scripts/check-llms.mjs` fails it if llms.txt links 404 in the build output or carry a
price token that isn't canonical/whitelisted. If a fact appears in more than 2 places
in code, centralize it in the JSON and tag the HTML with `data-fact`.

`data-fact` values are derived in **one** place, `scripts/lib/fact-values.mjs`,
imported by both the writer (`render-facts.mjs`) and the reader
(`check-facts.mjs`). check-facts re-derives every value and compares the stamped
span byte-for-byte, so **editing site-facts.json without re-running
`facts:render` now fails the build.** Service `note` fields can't be stamped
(they're prose inside JSON-LD descriptions), so they get two guards instead:
every *countable* clause ("Four taken per year") must appear verbatim on some
surface, and no surface may state the same phrase with a different number.

- Company: Main & Machine
- One-liner: AI consulting & implementation for small and mid-size business
  (5–100 employees, $1M–$50M revenue)
- Founder & Chairman: Christopher Myers (also CEO of B:Side Capital + Fund;
  professor of entrepreneurship at ASU W.P. Carey; author)
- Services + prices: AI Readiness Audit $3,500–$8,500 (2–4 weeks) ·
  AI Implementation Sprint $18,000–$60,000 fixed quote (4–12 weeks) ·
  Managed Services from $1,500/month, no lock-in (annual = 12 months for
  the price of 10, unused months refunded) ·
  The Full Back Office (MARCUS-class, multi-department) from $95,000,
  four per year
- Guarantee (delivery, never ROI): if a scoped workflow is not live in the
  client's operation within 90 days, we keep building at no charge until it
  is. The retired sprint band $12,000–$45,000 is a FORBIDDEN token
  (check-facts fails on it).
- Rollover: 100% of the audit fee credits toward a sprint signed within
  60 days, up to 25% of the sprint price
- Delivery: ~90 days per workflow, fixed price quoted in writing before work
- Free offer: 30-minute AI Opportunity Assessment, reply within 24 hours
- Locations: Denver, CO and Phoenix, AZ hubs; remote across the US
- Contact: cmyers@mainandmachine.com · 480-805-9983

These facts must be byte-identical in page copy, meta tags, JSON-LD, llms.txt, and the
footer.

## Voice rules

- Plain, contrarian, anti-funnel. Short declarative sentences.
- The word "honest" may appear at most TWICE per page. Show, don't claim.
- "Free. No obligation. No pitch." at most TWICE per page.
- Press credit is ALWAYS attributed to the founder, never the company:
  "Our founder's work has been covered in…"
- No scarcity language unless verifiably specific.
- Never promise ROI numbers; quote ranges.
- Do not touch the best writing on the site: the hero H1
  ("The machine belongs to Main Street."), the "What we promise / What we don't
  promise" lists, and the "Two words. One argument." section.

## Design tokens

All in `styles.css`. Two `:root` blocks define tokens; the **"A+ ELEVATION LAYER"**
block (~line 506) overrides the first one and wins — edit values there.

- Surfaces: `--paper: #f3ede0` (warm cream), `--paper-2: #eae1cf`,
  `--paper-card: #fbf8f0`, `--ink: #14110c` (near-black), `--ink-2: #1d1913`,
  `--blueprint: #d9dee2` (cool steel)
- Accent (the single burnt-orange/rust): `--accent: #bd451f`,
  `--accent-deep: #98330f`, `--accent-ink: #ec6c3d` (for dark backgrounds),
  `--accent-soft` (10% wash)
- Text: `--tx: #1d1812` on paper, `--dtx: #f4efe4` on ink, with `-mute`/`-faint`
  steps; hairlines `--line` / `--dline`
- Type: `--sans: 'Archivo'` (headlines/body), `--mono: 'Space Mono'` (labels/data).
  Mono small-caps label style = `.tick-lbl` / `.kicker` (11px, letter-spaced,
  uppercase)
- Corner-bracket / registration-mark motif: add class `.crop` to a card
  (`.crop::after` draws the marks; `--grain` adds film grain to surfaces)

Reuse these tokens and classes for any new work — never approximate the values.
**Solid accent fill is reserved for actions** (CTA buttons, the slider thumb).
Decorative panels use ink (`.arg--amp`, `.svc__item--feature` style); accent
appears elsewhere only as text/hairline. Never add a non-interactive solid-orange
panel — it dilutes the CTA.

## TODO (manual tasks no prompt can do)

- Photo shoot: 3–5 real workshop/advisor shots, duotoned to the palette — slot into
  `/about/`, `/method/`, and the city pages.
- Google Business Profiles for both hubs: byte-identical name, phone, URL, category
  "Business management consultant"; use the hedcut/brand mark; link the Denver GBP to
  `/denver/` and the Phoenix GBP to `/phoenix/`.
- The city pages' ProfessionalService JSON-LD deliberately omits PostalAddress — no
  verified street addresses exist. Adding verified addresses later will strengthen
  those pages; never fake one.
- Fill the TODO stats in `/work/` (Build 001 "sample week") from real logs, and replace
  the sample-audit placeholder content after the next real audit. Do not invent numbers.
- `sameAs` arrays: founder profiles are DONE (LinkedIn, X, Entrepreneur, ASU
  faculty profile, Amazon author page, bside.org — mirrored in every Person
  JSON-LD emitter + the /about/ verify block). Still TODO when real URLs
  exist: press-coverage URLs, GitHub org, Crunchbase (see `PERSON_SAMEAS` in
  templates.mjs).
- Testimonials: `data/testimonials.json` → rendered by `scripts/build-testimonials.mjs`
  on / and /work/ (full section), /work/marcus/results/ (featured B:Side quote),
  and /book/ (rail one-liner) ONLY for entries with `permission: true`
  (written sign-off on file); zero entries = no section. Same contract as the
  proof shelf.
- The topbar banner carries a verifiable, **dated** slot count from
  `buildSlots` in site-facts.json (stamped via `data-fact="build-slots"` as
  "Four Q4 build slots remain (counted YYYY-MM-DD)"). KEEP IT CURRENT: when a
  slot is sold or the quarter rolls over, edit `remaining`/`line` AND
  `countedOn` in the JSON, then run `npm run facts:render`.
  `scripts/check-facts.mjs` FAILS the build once `countedOn` is more than
  **21 days** old — that is deliberate: a stale count is unverifiable
  scarcity, the exact pattern `/guides/how-to-choose-an-ai-consultant/`
  red-flags in other firms. To stop maintaining it, delete the
  `data-fact="build-slots"` span from the ticker in every page rather than
  letting the date drift.
- After deploy: resubmit sitemap.xml in Search Console and request indexing on the
  new pages.

## Proof shelf rule

Numbers and quotes on the proof surfaces come only from `data/build-log.json`,
rendered by `scripts/build-work.mjs` at build time between BUILD-LOG markers.
Never hand-edit rendered figures. `signed_off: true` requires the client's
written approval on file. The "A sample week" strip renders only when `week_of`
and all three numbers are non-null; "In their words" renders only signed-off
quotes.

`build-work.mjs` stamps **every** page that carries a marker — currently
`index.html`, `/work/`, `/work/marcus/`, `/work/marcus/results/`,
`/industries/professional-services/` and `/security/`. Region names:
`MARCUS-SCORECARD`, `MARCUS-SCORECARD-COMPACT`, `MARCUS-HOME`,
`MARCUS-FIGS-01`…`-07`, `MARCUS-BA`, `MARCUS-BOUNDARY`, `MARCUS-WINDOW`,
`MARCUS-INLINE-<PAGE>` (inline regions inject no whitespace, so they can sit
mid-sentence), plus the legacy `STATS` / `QUOTES`.

The MARCUS block carries `measurement_window`, `window_note`, `signed_off`,
an `approval` object (who approved, when, on what basis), and figures as
`{key, value, unit, desc, source}`. **Every number on
`/work/marcus/results/` renders from that file — none is typed into the HTML.**
Section prose (kicker, headline, body, "How it's sold") is authored copy in the
page; if prose ever restates a figure, the figure must also exist in the data
with the same value. `marcus.signed_off: false` withholds every MARCUS figure
site-wide rather than shipping an unapproved number.

The measurement-window disclosure line is rendered from data too, deliberately:
it is the differentiation, so it can never drift from the figures it qualifies. `placeholders:check` fails any build
whose rendered pages contain TODO/TBD/TKTK/lorem ipsum/XXX/Fixture/fictional/
placeholder/"to be added"/pro-forma/"illustrative targets" in visible text
(text nodes plus `alt`/`title`/`aria-label` — tag markup is stripped, so an
`<input placeholder="…">` is not a hit).

## Build guards (added after the 2026-07-31 audit)

Each of these exists because something shipped wrong once and nothing objected:

- `links:check` (`scripts/check-internal-links.mjs`) — offline; every internal
  href in committed HTML must resolve to a file in the build output, a
  `PROXIED_ROUTES` entry, or a slug present in `blog-data/index.json`. It fails
  loudly on a zero-post index while pages link to posts. Not to be confused with
  `scripts/check-links.mjs`, which crawls the **live** origin over the network
  to audit redirect hops after a deploy and is not part of the build.
- `head:check` — meta descriptions under **40** chars are a hard ERROR (stub
  detection); under 70 stays advisory. `dateModified` earlier than
  `datePublished` in any JSON-LD block is an ERROR.
- `facts:check` — see the facts section above: stamped span verification plus
  countable-claim guards.
- All guards skip `LOCAL_SCRATCH_DIRS` (`scripts/lib/config.mjs`) so a stale
  local copy of the site can't flood the checks with phantom failures — that
  noise is how people learn to ignore a red build.

## SEO content pipeline (cloud agent + /publish-seo)

A scheduled cloud agent researches competitors/SERPs monthly and writes article
drafts to `/Users/christophermyers/Documents/Operations/Main & Machine/` as
`DRAFT-<slug>.md` (lifecycle: `DRAFT-` ready → `STAGED-` on a review branch →
`PUBLISHED-` live). Ampersand-format essays are staged as Beehiiv drafts, never
committed here (the blog is prerendered from beehiiv at deploy).

- `/publish-seo` stages pending drafts on a `seo/<YYYY-MM>` branch: builds pages
  per this file's conventions (head pattern, `@graph` JSON-LD with canonical
  `@id`s, `data-fact` spans, STATIC_ROUTES + ALL_PAGES registration), runs
  `seo:check`/`facts:check`/`head:check`/`placeholders:check`, and opens a PR.
  It never merges. Chris's review of the branch is the voice/claims gate.
- `/publish-seo done` (run after merging) marks staged drafts `PUBLISHED-` so
  the cloud agent never re-drafts them.
- After each merged batch: resubmit sitemap.xml in Google Search Console;
  publish the matching Beehiiv draft; when a new essay publishes, enrich
  `POST_TOPICS` in `scripts/lib/config.mjs`.
- If a draft's facts contradict `src/data/site-facts.json`, the command stops on
  that draft and reports; canonical facts win until Chris says otherwise.
