# CLAUDE.md

## What this is

The production marketing site for **Main & Machine** (www.mainandmachine.com) — AI
consulting and implementation for small and mid-size businesses.

**Stack: plain static HTML/CSS/JS, no framework.** Pages are hand-written HTML files
(`index.html`, `book/index.html`, `privacy/`, `terms/`, `404.html`). The one build step
is the blog, **The Ampersand**, prerendered at deploy time from beehiiv:

- **Hosting/deploy:** GitHub → Cloudflare Pages runs `npm run build:static` on every
  push to `main` and serves the repo root (`/`). Env: `BEEHIIV_API_KEY`,
  `BEEHIIV_PUBLICATION_ID`, `RESEND_API_KEY` (set in the Pages project).
- **`npm run build:static`** = `blog:fetch` (pull posts from beehiiv into `blog-data/`)
  → `blog:build` (prerender `/blog/*`, `rss.xml`, `sitemap.xml`) → `seo:check`
  → `facts:check`. Generated blog artifacts are **gitignored** — never hand-edit
  `blog/`, `blog-data/`, `sitemap.xml`, or `src/data/blog-posts.js`; edit
  `scripts/lib/templates.mjs` and `scripts/build-blog.mjs` instead.
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

The machine-readable source of truth is **`src/data/company.mjs`**. Generated surfaces
(blog templates, build scripts, the Pages Function, emails) must import it; the static
HTML pages are guarded by **`scripts/check-facts.mjs`**, which fails the build if these
facts drift. If a fact appears in more than 2 places in code, centralize it there.

- Company: Main & Machine
- One-liner: AI consulting & implementation for small and mid-size business
  (5–100 employees, $1M–$50M revenue)
- Founder & Chairman: Christopher Myers (also CEO of B:Side Capital + Fund;
  professor of entrepreneurship at ASU W.P. Carey; author)
- Services + prices: AI Readiness Audit $3,500–$8,500 (2–4 weeks) ·
  AI Implementation Sprint $12,000–$45,000 fixed quote (4–12 weeks) ·
  Managed Services, monthly retainer, no lock-in
- Delivery: ~90 days per workflow, fixed price quoted in writing before work
- Free offer: 30-minute AI Opportunity Assessment, reply within 24 hours
- Locations: Denver, CO and Phoenix, AZ hubs; remote across the US
- Contact: cmyers@mainandmachine.com · 480-360-5128

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

## TODO (manual tasks no prompt can do)

- Photo shoot: 3–5 real workshop/advisor shots, duotoned to the palette.
- Google Business Profiles for the Denver and Phoenix hubs (after city pages exist).
- If a verifiably true Q3 build-slot count exists, the topbar banner can say
  "Two Q3 build slots remain" instead of the generic line (see index.html topbar).
