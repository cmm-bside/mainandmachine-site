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

All in `styles.css`. The **"A+ ELEVATION LAYER"** block holds the CANONICAL
TOKENS and wins over the base `:root` — edit values there. The base `:root`
now carries only tokens the canonical block does not define (`--blueprint`,
the ink mute steps, `--sans`/`--mono`, `--maxw`, `--gutter`); it no longer
keeps a second, drifting copy of the palette.

**Nine canonical colours — the only brand hex literals in the codebase:**

| token | value | role |
|---|---|---|
| `--paper` | `#F0EBE1` | page surface (warm cream) |
| `--paper-tan` | `#E4DBC8` | deeper cream band |
| `--ink` | `#1B1611` | ink surfaces AND body text |
| `--ink-muted` | `#6E6455` | muted text on paper |
| `--panel` | `#221C15` | raised panel on ink |
| `--panel-ink` | `#D8D2C6` | text on ink |
| `--accent` | `#C6401E` | the single rust |
| `--rule` | `#D6CCBA` | hairline on paper |
| `--rule-dark` | `#3A3227` | hairline on ink |

Everything else aliases or derives from these (`--cream`, `--paper-card`,
`--rust`, `--tx`, `--line` … all resolve here), so changing a value changes
the whole site. Five non-brand literals remain by design: `--blueprint` /
`--blueprint-2` (cool steel — a separate hue), `--dtx-mute` / `--mono-on-dark`
/ `--dtx-faint` (mute steps on ink), plus `--go-deep` (form-success green).

- **Never use raw `--accent` for small text.** It is 4.26:1 on `--paper` and
  3.68:1 on `--paper-tan` — both AA fails. `--accent-text` is the darkened
  derivation (5.40:1 / 4.67:1); 88% is the exact AA threshold, so it sits at
  86% for margin. `--accent-ink` is the lightened one for dark backgrounds.
- **Spacing — two scales share the namespace.** `--s-1:8 --s-2:16 --s-3:24
  --s-4:40 --s-5:64 --s-6:96` is the step scale; `--s-8 … --s-128` is the
  older px-named scale (318 usages) where the number IS the pixel value.
  `--s-04` is 4px — it exists because the step scale claimed `--s-4` for 40px.
- Sections: `--section-y` (160px) is canonical; `--section-pad` /
  `--section-pad-tight` alias it. Responsive overrides are declared AFTER the
  canonical block on purpose — a media query adds no specificity, so an
  earlier `:root` would lose to the later plain one and silently never apply.
  Ladder: 160px → 120px (≤1024) → 96px (≤768, where `--s-4` also drops to 24px).
- Type: `--t-label:11 --t-sm:14 --t-base:17 --t-lg:22 --t-xl:32 --t-2xl:48`
  and `--t-hero: clamp(52px,7vw,84px)`. The `--fs-*` names alias onto these.
  `--fs-78` stays a plain 84px length because it is used INSIDE `clamp()`
  (`.h-hero`, `.failstat__big`, `.math__big`) — aliasing it to the fluid
  `--t-hero` would nest clamp in clamp. `--fs-25` / `--fs-39` are intermediate
  steps the 7-step scale does not name.
- `--sans: 'Archivo'` (headlines/body), `--mono: 'Space Mono'` (labels/data).
  Mono small-caps label style = `.tick-lbl` / `.kicker`, letter-spaced, uppercase.
- Corner-bracket / registration-mark motif: add class `.crop` to a card — see
  the brand-decoration section below. `--grain` adds film grain to surfaces.

### Brand decoration (systematized 2026-08-02)

**Crop marks — ONE definition, four uses.** `.crop` draws two 14px corner
pieces, 2px `var(--accent)`, **top-right and bottom-left**, via `::before` /
`::after`. Pseudo-elements on purpose: outside the accessibility tree (no
`aria-hidden` attribute needed), unreachable by pointer, absolutely positioned
so they cause no layout shift.

Applied to exactly four components — the hero spec card (`.statrail`), the
highlighted pricing row (`.svc__item--feature`), the `/book/` "promise" card
(`.panel--ink`) and the founder photo frame (`.bio__portrait`). It had spread
to **23 components / 73 elements**, which made it wallpaper rather than a mark.
**Do not add a fifth without removing one.**

Removed as duplicate/partial-border experiments:
- `.hm-crop` — a second four-corner system (13px / 1.5px / four corners / rust)
  on the hero. Its spans and CSS are gone; no JS referenced them.
- `.bound__i`'s 3px ink top edge + asymmetric radius, now the standard hairline.

**Dark-band texture.** Large dark bands whose content leaves one half empty get
a layer on *that side only*. Two treatments, never both on one section:

- `.deco-grid` — 1px cream grid on a 56px pitch at 4.5%, masked to the right
  half. `--left` and `--edges` modifiers for the other cases.
- `.deco-amp` — one oversized outlined ampersand at 4%, bottom-right, with a
  diagonal mask so it materialises only in the empty corner and never tracks
  behind a copy column.

**Max one ampersand per page** — it is a signature, not a texture. Currently
`/` (problem section) and `/work/marcus/` (MARCUS band). The grid is the
default; `.section.ink.final` takes it by selector on all 41 pages.

Verified: **zero layout shift** (disabling every decoration changes not one
element's geometry across 1042 elements on three pages), no horizontal
overflow, and all seven dark sections that had a ≥260px empty half at 1440px
are covered. Below 900px the layers are switched off — there is no empty half
to fill once the columns stack.

Auditing this: an "empty half" is a tall vertical RUN with no content on one
side, not a low overall content-to-width ratio. Measuring the union of all
content boxes reports 0 sections, because the full-width section header spans
everything.

### Top utility bar (reworked 2026-08-01)

The thin bar above the nav is **static** — the auto-scrolling marquee, its
duplicated aria-hidden track, the 42s keyframes, the hover/focus pause and the
edge-fade overlays are all gone. Two groups only: left is
"Booking &lt;Q&gt; delivery · every engagement starts with the free assessment"
(one link, the bar's only accent), right is "Denver · Phoenix · Remote".
36px tall, `--paper` on a `--rule` hairline, mono at a literal **12px** (NOT
`--t-label`/11px — the bar is pinned to 12px), `0.04em`, ink at 75%.
At ≤768px only the first clause shows.

- The root class stays `.ticker`: `js/analytics.js` labels link clicks by
  `a.closest(".ticker")`, so renaming it would silently untag this bar's traffic.
- The quarter is the `.js-book-quarter` span, auto-advanced by `js/nav.js` to
  the NEXT quarter (delivery framing), so it can never read stale. `book:check`
  asserts that span exists on `/book/` — it deliberately asserts the hook, not
  the wording.
- The markup is duplicated: hand-written in the 39 static pages and generated by
  `topbar()` in `scripts/lib/templates.mjs` for blog pages. Change both.
- `/privacy/`, `/terms/` and `/404.html` carry no utility bar, by existing design.

### Text wrapping (2026-08-01)

`h1, h2, h3, .h1, .h2 { text-wrap: balance }` and `p, li, dd { text-wrap: pretty }`
at the foot of `styles.css`. `balance` evens short blocks; `pretty` only fixes
the last line, which is what running copy wants.

`balance` is a hint browsers cap at a few lines, so headings that still stranded
a one- or two-word final line carry a **`&nbsp;` run pinning their last three
words together** — 84 heading instances. Rendered text is unchanged; only the
break point moves. Do not "clean up" those entities.

Measuring this: count words on the last line by wrapping each word in a span
and grouping by `rect.top`. Two traps —

- **Pin one CONTIGUOUS run.** Joining "pay in" and "professional services?" as
  two separate pairs leaves a breakable space between them and nothing moves.
  The spaces must be located in the FLATTENED text so a space sitting next to a
  tag boundary (`…pay in <span>professional…`) is eligible.
- **Skip structurally-lined headings.** The hero H1's lines are authored
  `<span class="hm-line">` blocks, not wrapping; `&nbsp;` there is inert, and
  that heading is CLAUDE.md-protected anyway.

Widening the pin to four words made things worse overall (132 → 136 orphans) —
three is the setting.

**Irreducible residue: 132 of 686 multi-line heading renders**, and 117 of those
are headings under six words. A four-word heading can only break 2+2 or 1+3; the
"three words on the last line" rule would force a one-word FIRST line, which is
worse. Don't chase those.

### Buttons — two variants (2026-08-01)

**BUTTONS** block near the top of `styles.css`. One box for both variants:
52px tall, `padding-inline: 28px`, `border-radius: 0`, mono 13px/600 uppercase
at `0.06em`, no shadow, 150ms transitions.

| | PRIMARY | SECONDARY |
|---|---|---|
| background | `var(--accent)` | transparent |
| text | `var(--paper)` | `var(--ink)` (cream on dark) |
| border | none | 1px `var(--ink)` (cream on dark) |
| arrow | yes, 10px gap, +2px on hover | never |
| hover | `#A93517` (~8% darker) | fills ink, text paper (inverted on dark) |

- **`--paper` on `--accent` is 4.26:1 — an AA fail**, on 129 primary buttons
  across 41 pages. The contrast pass had set this to `#fff` (5.06:1); the
  button spec overrides it explicitly. One token reverts it. Everything else on
  the site is AA-clean, so this is the only known text-contrast failure.
- `.btn--lg` is a **no-op modifier** kept so 38 pages don't need editing — the
  22px/30px padding split was a third variant wearing a modifier's name.
- `.btn--ghost` is **retired**. A borderless text button is a pseudo-button;
  per the link system, actions became real buttons and navigation became STYLE
  B action links (`/services/`'s "See a sample audit deliverable" et al).
- **Every PRIMARY carries the arrow** — 47 were missing one. SECONDARY never
  does: the spans were stripped from 24 buttons, and `.btn--secondary .arr
  { display: none }` is the belt-and-braces.
- **One primary per viewport-height of content.** Enforced and verified at
  1000px: 27 non-conversion CTAs were demoted to SECONDARY ("Read the price
  list" ×24, "Print / save as PDF", "Read the measured results", "Ask a
  security question"). The nav CTA and the footer newsletter are **chrome**,
  not content, and are excluded — otherwise the pre-footer CTA and Subscribe
  (242px apart on 30 pages) would force demoting one of them, and the brief
  pins Subscribe as PRIMARY.
- Focus is the same ring on both variants and both surfaces: `2px solid
  var(--accent)`, 2px offset. That skips the site's cream-on-dark focus
  override, which is safe because `--accent` is 3.55:1 on `--ink` — clear of
  the 3:1 WCAG 1.4.11 floor. (The override predates the palette change, when
  rust was 3.23:1.)
- Buttons sit **outside the card type tiers** by design, so 13px inside a card
  is expected — see the card typography note.

### Link system — two treatments (2026-08-01)

**LINK SYSTEM** block at the foot of `styles.css`. Every content link is one of
two styles. **The invariant: underline + accent never co-occur at rest** — that
combination is what STYLE A's hover means.

| | STYLE A (in-text) | STYLE B (standalone action) |
|---|---|---|
| font | inherited | mono 12px, 600, uppercase, `0.06em` |
| colour | `inherit` (cream on dark) | `--accent-text` |
| underline | solid 1px, offset 3px | none |
| hover | `var(--accent)`, same underline | arrow translates 2px |
| visited | same as default (explicit) | same as default |

- **STYLE B is selected by the arrow, not a class:** `a:not(.btn):has(.arr)`.
  That works only because the markup was normalized first — 51 bare `→`/`&rarr;`
  characters were wrapped in the standard `<span class="arr">&#8594;</span>`,
  and all arrow spans use one entity. Add an arrow and the link becomes STYLE B
  automatically; there is no class to remember.
- The arrow is `inline-block`, `margin-left: 0.5ch`, `transition: transform
  150ms ease`, `translateX(2px)` on hover. Only the arrow moves — verified at
  arrow +2.00px / text +0.00px.
- `.hero__cta-alt` ("Get your AI-Ready Score") is a standalone action link and
  takes STYLE B despite having no arrow; the arrow rules simply don't apply.
- 11 inline `style="…text-decoration…"` attributes were stripped from `<a>`
  tags. An inline style outranks the system and silently reintroduces a variant.
- **Not content links, and excluded on purpose** (report them as separate
  categories, not as extra link styles): `.btn` **buttons** (150), site
  **chrome** — nav, breadcrumb, utility bar, logo, skip-link (1493) — and
  **card/block affordances** (30), where the whole card or its 22px title is
  the link. Underlining a nav bar or a card title would be the wrong reading of
  "two link treatments".
- Email templates (`emails/*.js`) still use inline styles and bare arrows. That
  is correct — mail clients don't support `var()` and many strip `<style>`.
- Watch the `:is()` specificity trap here too: `.btn .arr` inside a card-type
  `:is()` list lifted that rule to (0,3,0) and outranked STYLE B, leaving four
  action links at 14px. It now sits in its own rule.

### Section header + container (standardized 2026-08-01)

**One container sitewide:** `--maxw: 1160px`, `--gutter: 32px` (20px ≤768).
The gutter was `clamp(20px, 4vw, 64px)`, which made inline padding
viewport-dependent (57.6px at 1440) and impossible to line a fixed-column grid
up against. `.calcband__grid` carried its own `max-width: 1200px` — removed. It
was the only section with a different container.

**SECTION HEADER** component at the foot of `styles.css` — the "H2 block left,
intro paragraph right" pattern:

    display: grid;  grid-template-columns: 1fr minmax(320px, 440px);
    column-gap: var(--s-5);  align-items: start;
    /* ≤900px: one column, row-gap var(--s-3) */

- `.section-head` is the name for new markup. `.head-block` (20 pages) and
  `.mk-outcome` (1) are aliases in the same rule — one geometry, three names,
  no rewrite across 21 files. Before: three different geometries (1.1fr/1fr @48
  align-end, 1fr/1fr @80 align-center, plus inline `align-items` overrides).
- **The optical offset is `calc(0.35 * var(--t-lg))`, not `0.35em`.** `em`
  resolves against each element's own font-size, so a column that wraps its
  paragraph in a `<div>` (17px) got 5.95px while a bare `<p>` (22px) got 7.7px.
  Anchoring the multiplier to the intro's type step makes it 7.7px everywhere,
  which is what "same offset" requires. The offset is removed when stacked.
- Only the block margin stays on `.head-block`; its old 820px stack breakpoint
  is superseded by the component's 900px one.
- Inline `style="align-items:…"` / one-off margins were stripped from 13 pages —
  an inline style outranks the component and silently reintroduces a variant.

**Pricing rows** (`.svc__item`) are `220px 1fr 360px` on every row, so the two
internal dividers form continuous vertical lines (verified at x=393 and x=907
on all four pricing tables). Dividers are `--rule` on light rows and
`--rule-dark` on the dark feature card (was `--dline`, a translucent hairline).
When auditing this, exclude out-of-flow children: `.svc__tab` is an absolutely
positioned chip and reads as a phantom fourth grid cell.

### Card typography — three tiers (2026-08-01)

**CARD TYPOGRAPHY** block at the foot of `styles.css`. Inside a card, type is
one of exactly three tiers — every intermediate step (17px body, 25px title,
19.9px, 13px, 12px) is gone.

| tier | role | style |
|---|---|---|
| 1 | label | mono, `--t-label` 11px, uppercase, `0.08em`, muted |
| 2 | value / heading | sans, `--t-lg` 22px, 700 — prices, timelines, card titles |
| 3 | footnote / body | sans, `--t-sm` 14px, 400, line-height 1.55 |

Scope: `.svc__item` (pricing rows), `.spec-card`/`.statrail` (hero spec card),
`.phase` (method phases), `.rail` (assessment sidebar), `.svc-detail__card` +
`.svc-detail__deliv` ("what you leave with"), `.foot__brand .entity__stats`.

- **Only three sizes may compute inside a card: 11 / 14 / 22.** The single
  exemption is the card's own `<h3>` when larger (the `.phase` h3 is 32px).
  Nothing goes below 11px.
- Geometry: label sits 4px above its value; value pairs in a row use a 40px
  column gap. Where the pair is in a flex/grid stack the 4px belongs on the
  PARENT's `row-gap` — a child `margin-bottom` ADDS to the parent gap and
  lands at 12px, which is exactly what it was doing in the footer stat block.
- `.svc__no` (the pricing-row numeral) was a 48px display figure and is now
  TIER 2. That is the most visible change in this pass; it now reads as a value
  marker in line with the other values rather than a display number.
- Deliberately **not** tiered: `.cmp`, the services comparison TABLE. It is
  dense 5-column tabular data, not a card. Its cells take the TIER 3 *size* so
  nothing sits between the steps, but its prices stay 14px rather than becoming
  22px TIER 2 values, which would destroy the column rhythm.
- Card CTAs take the TIER 3 size only; weight and decoration stay a button's
  own. The 44px tap target comes from `min-height`, so a smaller label does not
  shrink the hit area.

### Vertical rhythm (normalized 2026-08-01)

One rhythm, all from the foundation tokens. **VERTICAL RHYTHM LAYER** at the
foot of `styles.css`.

| step | token | value |
|---|---|---|
| section padding-block | `--section-y` | 160 / 120 ≤1024 / 96 ≤768 |
| header block → content | `--block-gap` = `--s-5` | 64 |
| sibling cards/rows | `--s-3` | 24 |
| card interior | `--s-4` | 40, **24 ≤768 automatically** |
| eyebrow → H2 | `--s-2` | 16 |
| H2 → intro | `--s-3` | 24 |

- **Every** `<section>` takes `--section-y`. All per-section overrides are gone
  (`.final`, `.calcband`, `.section--tight`, `.hero`, `.pagehero`, `.bookhero`,
  `.sechero`, `.cr-hero`). `.section--tight` is now a no-op class kept in the
  markup on two pages. Add a padding override only for a genuine thin banner.
- Card padding needs **no media query**: `--s-4` already steps 40 → 24 at 768px
  from the foundation layer, so `padding: var(--s-4)` is the whole rule.
- The 24px sibling gap applies to card collections ONLY. Deliberately excluded,
  and listed in the CSS comment: two-column page layouts (`.hero__grid`,
  `.head-block`, `.news`, `.faq`, `.bio`, `.math`, `.prose-2`, `.calcband__grid`,
  `.svc-detail__grid`, `.math-vs`, `.final .wrap`, `.foot__signup`) whose gap is
  a column measure, and the hairline grids (`.paths`, `.phases`, `.diffs`,
  `.profile`, `.ind`, `.promise`, `.timeline`, `.arg`, `.svc__item`) that draw
  their own 0/1px borders.
- Band boundary: `:is(.paper, .paper-2, .blueprint) + :is(…)` puts a 1px
  `--rule` at every light→light section seam (83 of them). Adjacent-sibling
  means it can never double up.
- `.mt-s` (16px, 423 uses) was NOT stripped. The eyebrow→H2 and H2→intro rules
  are adjacent-sibling selectors at (0,1,1), which outrank it where it was
  wrong; everywhere else it is still a correct generic nudge.
- **Structural fix:** five guide pages closed `</section>` early, leaving a
  `form.estimate-form` and `p.gtable-note` orphaned as direct children of
  `<main>` — no `.wrap` gutter (they rendered at x=0, edge to edge) and no
  section padding at all. Re-nested. If you see content starting flush at the
  viewport edge, check for a stray `</section>`.

### Contrast / dark surfaces (pass run 2026-08-01)

Every text/background pair was measured by rendering all 41 routes and
compositing the real paint stack. **71 AA failures repaired; 0 remain on dark.**

- `--on-dark-muted: #908778` is the ONE muted step for text on dark. The brief
  set a floor of `#8A8172`, which clears AA on `--ink` (4.67:1) but not on
  `--panel` (4.39) or the accent-washed dark (4.23). "No darker than" is a
  floor, so this sits a step lighter and clears 4.5:1 on all three.
- `--on-dark-head: var(--paper)` — headings on dark read near-white.
- `--accent-ink: #E86A3E` is accent TEXT on dark, decoupled from
  `--rust-bright` (which still drives the primary button's hover background).
  Allowed at 16px+ for short labels only; the mono label set is 11px, so on
  dark those take `--on-dark-muted` instead.
- `--muted-on-light: #685E4F` is the light-surface muted step. It holds the
  literal so light cards nested in dark sections can restore it —
  `--ink-muted` derives from it. Was `#6E6455`, which never cleared AA on
  `--paper-tan` (4.22:1).
- **DARK-SURFACE CONTRAST LAYER** (foot of `styles.css`) rebinds the text
  tokens on dark containers instead of listing every descendant class. The
  older DARK-SURFACE CASCADE lists leaked exactly that way — an unlisted label
  class kept its light colour at 3.09:1 on ink.
- **LIGHT ISLANDS** (`.roi`, `.bound__i`): light cards inside dark sections.
  Token rebinding is inherited, not background-aware, so these restore the
  light values — and must ALSO restate the explicit label/link colours, which
  a token cannot outrank.
- **`:is()` specificity trap:** `:is()` takes the HIGHEST specificity among its
  arguments. One compound in the list (`.svc-detail.ink .svc-detail__card`)
  lifted the whole selector from (0,1,0) to (0,2,1) and silently beat the
  light-island reset. Compound dark surfaces get their own rule below the lists.
- Primary CTA label is `#fff`, not `--paper` (4.26:1 → 5.06:1 on `--accent`).
- Auditing: use `getComputedStyle`, not source. Two traps — `color-mix()`
  serialises as `color(srgb …)`, not `rgb()`, so an rgb-only parser skips
  `--paper-card`; and an absolutely-positioned child can paint outside its
  parent's box (`.ba__bar span`), so background must be resolved by geometric
  containment, not a naive ancestor walk.
- **Known exempt, not fixed:** the brand wordmark ampersand (`.amp`, 4.26:1 on
  40 pages) and the `/privacy/` + `/terms/` wordmark link. WCAG 1.4.3 exempts
  logotypes. Also one transient `.hm-letter` frame mid hero-animation.

### The mono rule (sitewide, added 2026-08-01)

**`--mono` is for short labels and data values only — never for a sentence.**
Keep it for uppercase eyebrows and section labels (≤6 words), spec-card keys
and values, prices, dates, timelines, and small tags. Anything that forms a
full sentence or paragraph uses `--sans` at `--t-sm` (or `--t-base`) in
sentence case with standard link styling.

The standard for what stays mono is ONE block at the foot of `styles.css`
(`MONO TYPOGRAPHY RULE`): `--t-label` / `0.08em` / uppercase, with colour
(`--ink-muted`) scoped to light surfaces via `:is(.paper, .paper-2,
.blueprint)` — on ink the muted step is unreadable, so dark sections keep
their per-component colours. It sits last because every selector in it is a
plain class, so source order is what makes it beat the scattered per-component
label declarations above it.

Deliberately excluded: `.prose code` / `.prose pre` (`text-transform` is
INHERITED — uppercasing a container corrupts any code inside it), the large
display numerals (`.svc__no`, `.q-pm`, `.roi__count`, `.nf__code`), and
accent-coloured markers and label links, where the accent marks an affordance
rather than decorating.

Audit it by rendering, not grepping: computed `font-family` is the only
reliable test, since most mono text inherits rather than declaring. Known
residual: four `.kicker` eyebrows run 9 words (`/`, `/services/`,
`/work/marcus/results/`, `/security/`) — each is a single text node, so
compliance needs a copy trim, not a CSS change.
- `npm run tokens:check` fails the build on any `var()` pointing at a token
  that does not exist — that failure is otherwise SILENT (the declaration is
  dropped at computed-value time).

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
- ~~The topbar banner carries a dated slot count~~ **RETIRED 2026-08-01.** The
  top utility bar was reworked (see below) and no longer publishes a build-slot
  count, so there is no recurring recount chore. `buildSlots` still exists in
  site-facts.json and `fact-values.mjs` still derives the `build-slots` value,
  so the feature can come back by re-adding a
  `data-fact="build-slots"` span and running `npm run facts:render`.
  The guards in `check-facts.mjs` are now **conditional on that span being
  present**: re-add it and both the countable-claim guard and the 21-day
  `countedOn` staleness timer re-arm automatically; with no span, neither runs
  (an unpublished number cannot be unverifiable scarcity). While the span is
  absent a reverse guard applies — no surface may state a slot count that
  nothing keeps current.
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
`/industries/professional-services/`, `/security/`, `/services/` and
`/book/thanks/`. Region names:
`MARCUS-SCORECARD`, `MARCUS-SCORECARD-COMPACT`, `MARCUS-HOME`,
`MARCUS-FIGS-01`…`-07`, `MARCUS-BA`, `MARCUS-BOUNDARY`, `MARCUS-WINDOW`,
`MARCUS-INLINE-<PAGE>` (inline regions inject no whitespace, so they can sit
mid-sentence), plus the legacy `STATS` / `QUOTES`.

`build-work.mjs` also generates **`src/data/proof.mjs`** — a runtime-agnostic
ESM mirror of the signed-off figures, exactly as `company.mjs` mirrors the facts
JSON. Emails and Pages Functions render inside a Worker and cannot read
`data/build-log.json`, so they import that module instead of hardcoding a
number. `signed_off: false` emits an empty `figures` map and every reader must
omit the claim (the assessment autoresponder drops its whole proof block).
Never hand-edit it; run `npm run work:build`.

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
  loudly on a zero-post index while pages link to posts. It also **renders every
  email template in `emails/` and checks the output the same way** — rendered,
  not source-scanned, because the URLs are built from `${SITE_ORIGIN}/…`
  template literals. Emails additionally must write `/blog/<slug>/` with the
  trailing slash: without it Cloudflare answers a 308 some mail clients drop,
  and after `blog:build` the slashless path still resolves on disk, so nothing
  else would catch it. Not to be confused with
  `scripts/check-links.mjs`, which crawls the **live** origin over the network
  to audit redirect hops after a deploy and is not part of the build.
- `head:check` — meta descriptions under **40** chars are a hard ERROR (stub
  detection); under 70 stays advisory. `dateModified` earlier than
  `datePublished` in any JSON-LD block is an ERROR. A `<title>` over **60
  chars is an ERROR** too — measured on the DECODED title, so `&amp;` counts
  as the one character it renders as, not four.
- `facts:check` — see the facts section above: stamped span verification plus
  countable-claim guards. It also holds every hand-embedded **Person `sameAs`**
  to `PERSON_SAMEAS` in `scripts/lib/templates.mjs`, exactly and in order: one
  `@id` is one entity, so all ~40 pages must make the same claim about it.
  (They didn't — `/` and `/about/` shipped 8 profiles while 37 pages shipped 6.)
  Add a profile to `PERSON_SAMEAS` and the build fails until every page carries
  it.
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
