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
  `placeholders:check` → `links:check` → `book:check` → `cta:check` →
  `meta:check` → `quarter:check`.
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
- **Open Graph cards:** 1200×630 PNGs in `images/og/`, rendered by
  `scripts/build-og.mjs` and committed (a deploy must never need a browser).
  Most are DERIVED from the page — kicker + H1 read out of the HTML — so a new
  route in `STATIC_ROUTES` picks one up automatically. Four are authored
  instead, in that file's `EXPLICIT` map, and both reasons are permanent:
  `/score/` has **no HTML in this repo** (it is a `PROXIED_ROUTES` entry, so
  there is nothing to derive from), and on `/careers/`, `/contact/` and
  `/guides/` the derived card was wrong — the auto-subline is the first 62
  chars of the meta description, which on `/careers/` restated the H1 and cut
  it mid-word ("…Open applicati…") directly beneath that same sentence, and the
  auto-footer said "Fixed price · quoted in writing" on pages where nothing is
  priced. Prices and contact details in a card come from `COMPANY` at render
  time, never literals: a number baked into a PNG is invisible to
  `facts:check`. Re-render one card with
  `node scripts/build-og.mjs --only=/careers/` — `--force` rewrites all ~24
  derived cards and churns the diff for no visual change. `meta:check` fails
  the build if a page's `og:image` does not resolve to a real file.
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

**A tenth was added 2026-08-03: `--ink-grid: #211A14`**, the reference's dark
band, used ONLY by `.ink--grid` (the blueprint-grid sections — see below). It
is one step up from `--ink` and is not derivable from it: the three channels
move by different amounts (+6/+4/+3), so no `color-mix()` reproduces it.

- **It is scoped, not a second `--ink`.** `.final`, the footer and every other
  page's ink band stay `--ink`. Do not repoint `--ink` at it to "unify" them:
  `--panel` (`#221C15`) is only 1/2/1 above `#211A14`, so a sitewide swap
  flattens every raised panel on ink into its section.
- **`--panel` cannot follow it up, either.** The reference's panel is `#2A2219`,
  which measures **4.42:1** against `--on-dark-muted` — an AA fail, and
  `.failstat` puts that token on three elements (the 74% figure, its caption,
  the ratio labels). `--panel` stays `#221C15` (4.76:1). What separates the
  stat panel from the band is the grid stopping at its border, not tone;
  verified against the reference, which reads the same way.

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

**Crop marks — ONE definition, three uses.** `.crop` draws two 14px corner
pieces, 2px `var(--accent)`, **top-right and bottom-left**, via `::before` /
`::after`. Pseudo-elements on purpose: outside the accessibility tree (no
`aria-hidden` attribute needed), unreachable by pointer, absolutely positioned
so they cause no layout shift.

Applied to exactly three components — the hero spec card (`.statrail`), the
`/book/` "promise" card (`.panel--ink`) and the founder photo frame
(`.bio__portrait`). It had spread to **23 components / 73 elements**, which
made it wallpaper rather than a mark. **Do not add a fourth without removing
one.**

**The highlighted pricing row lost it 2026-08-02 — it is a third bracket
system colliding, not a position bug.** `.svc__item--feature` carried `.crop`
and rendered a lone red bracket at the far-left seam between tiers 01 and 02,
plus a second one opening the wrong way at the card's top-LEFT.

- `.diff::before, .svc__item::before` is the **hover flame-bracket system** (an
  8-gradient L at each corner, `inset: 7px`, arms grow from `background-size:
  0` on hover). It is `(0,1,1)` — the same specificity as `.crop::before` — and
  sits ~1090 lines later in `styles.css`, so its `inset: 7px` wins outright.
- With `inset: 7px` on all four sides *and* `.crop`'s explicit 14px box, the
  pseudo-element is over-constrained. In LTR `top`/`left` win, so it resolved
  to the row's **top-left** corner while still painting `.crop`'s top+right
  borders — a registration mark pointing the wrong way. Meanwhile `::after`
  drew the bottom-left mark at `-1px/-1px`, i.e. 1px outside the card, on the
  hairline it *shares* with row 02 — which is why it read as detached from any
  card.
- **The row can never carry the full motif.** An element has two
  pseudo-elements; `.svc__item::before` is already spent on the hover
  brackets, so at most one of `.crop`'s two corners can render. Half a
  two-corner motif *is* the lone bracket. Insetting or re-anchoring only moves
  it — it cannot make the second corner exist.
- `.crop` was removed from all 5 instances of that row (`/`, `/pricing/` ×2,
  `/denver/`, `/phoenix/`). The row keeps its hover brackets and its
  "MOST START HERE" tab chip as its highlight. Do not re-add it.
- Auditing this: `getComputedStyle(el, '::before')` returning the **same value
  on all four insets** is the tell. A `.crop` that is working reads
  `top: -1px; right: -1px` with the other two as resolved used values — compare
  `.statrail`, which does.

Removed as duplicate/partial-border experiments:
- `.hm-crop` — a second four-corner system (13px / 1.5px / four corners / rust)
  on the hero. Its spans and CSS are gone; no JS referenced them.
- `.bound__i`'s 3px ink top edge + asymmetric radius, now the standard hairline.

**Dark-band texture.** Large dark bands whose content leaves one half empty get
a layer on *that side only*. Two treatments, never both on one section. (A
third thing, `.ink--grid`, is NOT one of these — it is the band's whole
surface rather than a filler for an empty half. See the blueprint-grid section
below; a section takes that or one of these, never both.)

- `.deco-grid` — 1px cream grid on a 56px pitch at 4.5%, masked to the right
  half. `--left` and `--edges` modifiers for the other cases.
- `.deco-amp` — one oversized outlined ampersand at 7%, bottom-right, with a
  diagonal mask so it materialises only in the empty corner and never tracks
  behind a copy column. It sits fully inside the section — no shape is cut at
  the boundary.

**Max one ampersand per page** — it is a signature, not a texture. Currently
**`/work/marcus/` (MARCUS band) only**. The grid is the default;
`.section.ink.final` takes it by selector on all 41 pages.

**`/` `#problem` lost its ampersand 2026-08-03**, by decision rather than by
defect: the reference has no decoration in that section. `.deco-amp` came off
the section outright — the class carried `overflow: clip` and the `> .wrap`
z-index lift with it, and neither turned out to be load-bearing (no page
overflow at 1440 / 1280 / 1024 / 768 / 430 / 320 with `overflow` back to
`visible`). The `.deco-amp` rule itself stays for `/work/marcus/`.

- The section keeps its texture: `#problem` never had a *grid*. Its background
  was `--grain` — a 180×180 `feTurbulence` fractal-noise SVG at 4.5%, from
  `.ink`. The reference paints something different there, a 1px ruled grid on
  the section itself. Ours was noise, the reference's is ruled. **That gap is
  closed 2026-08-03 — see the blueprint grid below.**

### Blueprint grid — `.ink--grid` (2026-08-03)

The reference's dark-band surface, adopted verbatim on the two sections that
carry it there: `/` `#problem` and `/` `#calcband`. On the SECTION, so it runs
full-bleed; a `.wrap` is 1160px inside a viewport-wide band.

    background-color: var(--ink-grid);          /* #211A14 */
    background-image:
      linear-gradient(rgba(240,235,224,.028) 1px, transparent 1px),
      linear-gradient(90deg, rgba(240,235,224,.028) 1px, transparent 1px);
    background-size: 56px 56px;

- **It REPLACES `--grain`, it does not stack with it.** `.ink` sets
  `background-image: var(--grain)` at (0,1,0); `.ink--grid` is the same
  specificity, so the block must stay LATER in `styles.css` — source order is
  what decides, the usual trap. And the textures do not compose: a 5/255 line
  under 4.5% fractal noise is exactly the "the grid is missing" this was
  reported as. Noise and rule are two different surfaces; pick one.
- **A plain background, not a masked `::before` like `.deco-grid`/`.deco-amp`.**
  There is no mask, so there is nothing to position, no `overflow: clip`, no
  `> .wrap` z-index lift — and no child can paint over it by accident.
- **Not switched off below 900px**, unlike `.deco-grid`. That layer exists to
  fill an empty HALF of a two-column band and has nothing to do once the
  columns stack. This one is the band's surface at every width.
- **`.calcband` lost `.deco-grid--left` to it.** The earlier note said not to
  remove that class from this section — it was the only thing keeping the empty
  left run reading as a drawn surface. `.ink--grid` rules the whole band, which
  covers that run and the rest. **Never put both on one section**: two grids on
  different pitches with a mask between them is moiré, not texture.
  `.deco-grid` itself stays — 5 other pages use it (`/denver/`, `/phoenix/`,
  `/services/`, `/work/marcus/`, `/work/marcus/results/`).
- **The alpha ceiling is `.04`.** `.028` is the reference's and is what ships;
  it may go to `.04` if the grid reads as absent on real hardware, no higher.
- Measured, not eyeballed: field `rgb(33,26,20)`, rule `rgb(39,31,25)`, pitch
  56px on both sections — byte-identical to the same scanline through the
  reference. Auditing it: probe a scanline in an empty part of the band and
  count distinct colours; the delta is 5–6/255, which no screenshot comparison
  will show you reliably.
- Verified after: `qa:matrix` ALL ROWS PASS (contrast included — `#211A14` is
  lighter than `--ink`, so every dark-surface ratio moved down a notch and all
  still clear AA), `tokens:check`, `css:check`, `facts:check`, `head:check`,
  `placeholders:check`, and no horizontal overflow at 1440/1280/1024/921/768/
  430/390/320.

**Ampersand retuned 2026-08-02.** Stroke 4% → **7%**, mask 30%/62% →
**50%/76%**, `bottom` −0.18em → **−0.30em**. All three move together; changing
one alone makes things worse.

**Un-clipped later the same day: `bottom` −0.30em → `0`, mask 50%/76% →
65%/86%.** The glyph hung ~126px below the section and let `overflow: clip`
cut it. That is what read as "faint outlined rectangles sliced by the section
edge" — Archivo's `&` is angular, so the surviving fragments of an *outlined*
glyph look like stray rectangles rather than a letter. Nothing is cut now: the
ink bottoms out **21px above** the section's bottom edge and touches no edge at
1440 / 1280 / 1024 / 901.

- **The mask is the counterweight to `bottom`, and this is the same trap in
  reverse.** Raising the glyph moves the whole fragment up ~126px into the band
  the closing copy occupies: at `bottom: 0` with the old 50%/76% mask it painted
  **36 px behind text at 1280, 24 at 1024, 52 at 901** (1440 was clean, which is
  why one width is not a test). 65%/86% takes it back to 0 everywhere.
- **Tightening the mask did not shrink the mark** — 1294 px of ink at 1440
  versus 1453 for the old *clipped* fragment. Un-clipping gives back more than
  the tighter mask takes: the whole visible fragment is now the glyph's tail
  and the corner of its bowl, which reads as a letter.
- Both `.deco-amp` users move together, as documented. `/work/marcus/` had the
  identical defect (clipped at 1440 / 1280 / 901, clean only at 1024) and the
  same two values fix it. **`/` `#problem` no longer carries the class at all
  (see above), so these values now serve `/work/marcus/` alone** — the tuning
  still stands, and it is what keeps that page's glyph whole.

- At 4% the glyph's peak deviation from the ink background was **13/255** in
  the section's tail — present in the DOM, effectively invisible on screen, so
  the space under the closing copy read as an empty panel rather than a marked
  one. At 7% the peak is **17/255**.
- **Raising the alpha exposed a latent bug.** At the 30% mask the glyph was
  already painting *behind* the closing copy — 251 pixels at 1280, 451 at 1440
  — which nobody had noticed because at 4% nothing there was visible at all.
  The mask had to tighten and the glyph had to drop in the same pass.
- **Measure collision by DIFFING, not by geometry.** Render the frame, render
  it again with the pseudo-element `display:none`, and count differing pixels
  that fall inside the copy column's TEXT rects. Comparing against the column's
  bounding BOX instead reports a collision for any glyph in the column's
  whitespace, which is the whole point of the corner treatment. Final: **0 px
  behind text at 1280 / 1440 / 1024 / 901.**
- The tail closes at 96px via `.section--close-96`. 96 rather than a second
  early-close step; the brief's cap was ≤120px and one step beats two.
  (`#problem` was in `CLOSE_96_OTHER` while it ended in `.prose-2`, a content
  block. **Removed from the allowlist 2026-08-03** — "How we work →" moved out
  of that prose onto its own line as `p.section-action`, whose whole text IS
  the link, so the section now satisfies the real terminal-element test and
  needs no escape hatch. The allowlist only means something while every entry
  still has to be there.)

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
- **The quarter is a STATED fact, not a computed one (reworked 2026-08-04).**
  It lives in `src/data/site-facts.json` → `booking.quarter` as `"Q4 2026"`,
  is stamped into `<span data-fact="booking-quarter">` on all 40 chip-bearing
  surfaces by `facts:render`, and is held current by `quarter:check`
  (`scripts/check-booking-quarter.mjs`) in `build:static`. `book:check` asserts
  that span exists on `/book/` — it deliberately asserts the hook, not the
  wording. Full operator instructions live in README.md → "Booking quarter".
  - **`js/nav.js` used to rewrite it to the next calendar quarter on every page
    load.** That could not go stale, but it could be WRONG with nobody deciding
    anything: in October it would have flipped the entire site to "Booking Q1
    delivery" — a claim about *next year's* capacity — and kept doing so every
    quarter forever. The bar states capacity and `/pricing/` and `/book/` lean
    on it, so a computed value is the wrong instrument. The block is deleted,
    not disabled.
  - **The config stores the YEAR; the chip renders only `Q4`.** A guard cannot
    compare "Q4" to a build date — "Q4" is true once a year, forever, which is
    the exact failure being guarded. Rendering is unchanged, verified JS-on and
    JS-off.
  - `quarter:check` **warns** within 30 days of the quarter's end and **fails**
    once it has passed, naming `booking.quarter` and the four-step fix. It never
    advances the value. Test both branches without waiting for the date:
    `BOOKING_QUARTER_NOW=2027-01-05 npm run quarter:check`.
  - **`buildSlots.quarter` and `buildSlots.line` were deleted from
    site-facts.json.** Both hardcoded the quarter a second time, in a file
    nothing kept in step with the chip. The line is now derived by
    `buildSlotsLine()` in `lib/fact-values.mjs` from `remaining` +
    `booking.quarter`, so the old "prose count vs machine count" drift guard in
    `check-facts.mjs` is replaced by construction.
  - **`/facts.json` was publishing the maintainer notes.** `_`-prefixed keys in
    site-facts.json are instructions to whoever opens the file ("Recount, update
    this date, run npm run facts:render"), and they were being served verbatim
    on the public endpoint that exists to feed agents canonical facts.
    `build-llms.mjs` now strips them at any depth; the deliberate top-level
    `_meta` block is constructed separately and survives.
- The markup is duplicated: hand-written in the 39 static pages and generated by
  `topbar()` in `scripts/lib/templates.mjs` for blog pages. Change both.
- `/privacy/`, `/terms/` and `/404.html` carry no utility bar, by existing design.

### Desktop nav fit (2026-08-02)

The nav row **overflowed its own container by 129px at every width ≥1141px**,
where the mobile drawer hands over. Logo 213 + links 686 + CTA 270 + gaps =
1225px of content inside a `.wrap` whose content box is a fixed **1096px**.

Two symptoms, one cause: a horizontal scrollbar from 1141px to ~1345px, and
above that no scrollbar but the CTA still painting ~130px outside the content
column, out of line with every section below it. Only the scrollbar was ever
noticed, which is why this read as a narrow-band bug rather than a permanent
misalignment.

- **Raising the drawer breakpoint would NOT have fixed it.** The container is
  capped at `--maxw`, so a wider viewport never gives the nav more room — it
  only pushes the spill into the page margin where it stops being a scrollbar.
  The row has to actually fit 1096px. Same reasoning rules out "just show the
  hamburger sooner".
- Fixed in one `@media (min-width: 1141px)` block: `--s-16` gaps on both
  `.nav__inner` and `.nav__links`, no `margin-left` on the links, and nav
  labels at `--t-sm`. **1225px → 1057px, 39px of headroom** — enough to
  survive a label edit. 17px was oversized for chrome anyway; the utility bar
  above it is 12px and every other label on the site is 11–14px.
- **Scoped to `min-width` on purpose.** The ≤1140px drawer sets its own
  `font-size: var(--fs-16)` and 48px touch rows, which `sweep:mobile` asserts.
  Both rules are (0,1,1), so the block is placed AFTER the drawer block —
  source order decides, not luck.
- Verified: **215 route×width checks** (43 routes × 1141/1200/1280/1345/1440)
  with zero page overflow and zero nav-past-container. At 1440 the CTA's right
  edge is 1268px — exactly the content column's right edge (172 + 1096).
- Auditing this: measure the nav against its container's CONTENT box, not the
  viewport. Viewport-only overflow checks call this clean at 1440 and above,
  which is where it was actually still broken — just invisibly.

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

**Pins are capped by the viewport (2026-08-02).** A three-word pin at 39px is an
unbreakable run up to 412px — wider than the 280px of content a 320px phone has
— so it sized its grid track and scrolled the page sideways. That was the single
biggest source of horizontal overflow on the site. 86 pins were relaxed, one at
a time, taking only the ones that did not fit: each heading keeps every pin it
can afford at 320px. Widows did not get worse (64 → 62 across four widths) —
relaxing a pin lets `text-wrap: balance` rebalance the whole heading.
**A pin must never make a heading's min-content exceed 280px.** Long single
words are handled instead by `hyphens: auto` below 480px, which only breaks when
a break is needed and, unlike `overflow-wrap: break-word`, also lowers
min-content so the track can shrink.

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
- **Below 620px the label wraps** and the box grows downward from a 52px
  `min-height` (2026-08-02). The one-52px-box rule assumed every label is short;
  several CTAs are sentences ("Run your real numbers: book the free assessment"
  is 487px of nowrap mono) and a box wider than the screen scrolled the page.
  A two-line button on a phone beats a page that scrolls sideways (WCAG 1.4.10).
  `qa:matrix` asserts exactly 52px above 620 and at-least-52 below it.

### Link system — two treatments (2026-08-01)

**LINK SYSTEM** block at the foot of `styles.css`. Every content link is one of
two styles. **The invariant: underline + accent never co-occur at rest** — that
combination is what STYLE A's hover means.

**ONE documented exception: `.section-action` (2026-08-03).** A STYLE B link
lifted out of running copy onto its own line at the foot of a section takes a
1px rule under the label, `color-mix(in srgb, currentColor 45%, transparent)`
with `padding-bottom: 3px`. Requested against the reference, and it does breach
the invariant above — recorded here rather than quietly absorbed.

- The reference is not uniform about it either, and the pattern is worth
  copying: the rule appears only on action links that **stand alone on their
  own line** (`HOW WE WORK`, `READ THE MEASURED RESULTS`) and never on ones
  inside a card (`READ THE FULL SPEC`, `BROWSE THE BUILD CATALOG`, `HOW THIS IS
  MODELED`). So the class names the standing-alone CASE, not the decoration.
- `currentColor` rather than a token: it resolves to `--accent-text` on paper
  and `--accent-ink` on ink with no surface-awareness in the rule.
- The border is on an INLINE box, so its `padding-bottom` paints without
  entering the line box — no reflow, and the rule hugs the label rather than
  spanning the paragraph.
- **Currently one instance sitewide**, `/` `#problem`. `/` `#proof`'s "Read the
  measured results →" is the site's other lone action link and does NOT have
  it, so the two are inconsistent; the reference gives both the rule. Adding
  `.section-action` to that `<p>` is the whole fix if that is wanted.

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
- **BLOCK links are excluded structurally**, via
  `:not(:has(h1,h2,h3,h4,h5,h6,p))` (2026-08-02). `:has(.arr)` is a subtree
  test, so a card link whose footer carries a "Read more →" affordance matched
  STYLE B and inherited mono + uppercase + 12px + accent into everything inside
  it. `/work/`'s MARCUS teardown card was rendering its 39px `h2` and its
  37-word brief in uppercase Space Mono for exactly that reason — the worst
  mono-rule violation on the site, and produced by the link system, not by the
  card. The exclusion is structural rather than a class blocklist so the next
  block link with an arrow is handled without anyone remembering. `.arr` also
  now has a base rule (`display:inline-block` + the transition) outside STYLE B,
  which previously owned it — an arrow in an excluded link could not animate.
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

**Pricing rows** (`.svc__item`) come in TWO track sets, one per table, never
mixed inside a table — every row of a given table has identical geometry, and
the dark feature row differs only in colour, never in track sizing:

- **`220px 1fr 360px`** (default) — `/pricing/`, `/denver/`, `/phoenix/`. The
  third column earns its width there: it carries a labelled "What you leave
  with" list. Dividers form continuous vertical lines at x=393 and x=907.
- **`220px 1fr`** (`.svc--2col`, 2026-08-02) — the homepage. See the pricing-row
  section below for why.

Dividers are `--rule` on light rows and `--rule-dark` on the dark feature card
(was `--dline`, a translucent hairline). When auditing this, exclude
out-of-flow children: `.svc__tab` is an absolutely positioned chip and reads as
a phantom fourth grid cell.

**`.svc--2col`'s track rule MUST stay inside `@media (min-width: 921px)`.** The
stack rule is a plain `.svc__item` at (0,1,0) inside a max-width query, and a
media query adds no specificity — so a bare `.svc--2col .svc__item` at (0,2,0)
wins at every width and the rows never stack. That put a 220px rail beside a
157px column on a 320px phone: 130px of horizontal overflow on a site whose
mobile sweep is green. Same trap as the `--section-y` overrides.

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

- **Every** `<section>` takes `--section-y`, with exactly ONE named exception
  (below). The old per-section overrides are gone (`.final`, `.calcband`,
  `.section--tight`, `.pagehero`, `.bookhero`, `.sechero`, `.cr-hero`).
  `.section--tight` is now a no-op class kept in the markup on two pages. Add a
  padding override only for a genuine thin banner.
- **The exception: `.hero` (homepage) takes a flat 96px** — see the homepage
  hero section below. It is named in `SECTION_Y_EXEMPT` in `scripts/qa-matrix.mjs`,
  so a *second* section drifting off `--section-y` still fails the check.
- **Sections that END on a thin utility element close at 96px**
  (`.section--close-96`, 2026-08-02). A rule-bounded strip or a lone action
  link already reads as an ending; a further 160px of air below one makes the
  section look unfinished rather than closed. `padding-bottom` only — the top
  keeps `--section-y`, so these are the only intentionally asymmetric sections
  on the site. **Four** qualify across 205 by the terminal rule: `/` `#work`
  (the `.buildstrip` — still, now that it carries a chip row: `endsThin` matches
  the class, not a height), `/` `#proof` and `/work/`'s scorecard section (both
  a lone "…measured results →"), and as of 2026-08-03 `/` `#problem` (a lone
  "How we work →" in `p.section-action`). Plus one allowlisted exception below.
  - The class is named for its EFFECT, not its cause. It was `--ends-thin` for
    one afternoon; `/` `#about` closes at 96px for a different reason and the
    old name would have lied about it.
  - **`CLOSE_96_OTHER` in `qa-matrix.mjs` is the escape hatch, and it is an
    ALLOWLIST so it cannot become one.** A section carrying the class without
    the terminal shape must be named there and justified here. Currently one
    entry — `#about`, the founder section: its last element is `.bio`, a
    content block, so it does not "end thin"; it closes early because the press
    row and the photo card now bottom out on the same line, which is already a
    hard horizontal ending. Keyed by `id` because `sel()` collapses to
    `section.section.paper` for half the page and would exempt the wrong ones.
    (`#problem` was the second entry until 2026-08-03; it now passes the real
    test on its own. Entries come OUT when they stop being needed, or the
    allowlist quietly becomes the rule.)
  - **It is an authored class, not a `:has()` selector, and that is deliberate.**
    The real test is "the paragraph's entire text IS the link text", which CSS
    cannot express: `p:last-child > a:only-child` counts only ELEMENT children,
    so it also matches every prose paragraph holding one link — it caught six
    (`/services/builds/` ×2, `/denver/`, `/phoenix/`, `/calculator/`,
    `/404.html`). Requiring `.arr` does not rescue it either; `/calculator/`'s
    `.roi__note` is prose *and* carries an arrow.
  - `qa:matrix` re-derives the real test and checks it **both ways** — the
    shape without the class always fails, and the class without the shape fails
    unless the section is named in `CLOSE_96_OTHER`. That is what stops the
    markup and the rule drifting apart. Both directions verified by negative
    test: removing the class from `/work/` fails with "ends thin but is NOT
    tagged"; adding it to `#pricing` fails with "tagged … but does not end thin
    and is not in CLOSE_96_OTHER".
  - **A lone `.btn` does not count.** `/services/#builds-cta` ends in a single
    `.btn--primary` whose text is the whole paragraph, so it matches the naive
    shape — but a filled 52px conversion CTA is a content block. Excluded with
    the same `a:not(.btn)` test the LINK SYSTEM uses for STYLE B.
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

### Homepage hero — sized to the viewport (tightened 2026-08-02)

The hero is the one section that answers to the SCREEN rather than to the
sitewide rhythm: nav bottom → first dark band must fit inside one 900px
viewport. It was 953px at 1440×900, so the dark band's top edge was below the
fold and the hero read as unfinished rather than as composed. **Now 811px.**

| | before | after |
|---|---|---|
| nav bottom → eyebrow | 168.31px | **96px** |
| spec-card top − H1 cap top | −4.91px | **0.00px** |
| microcopy bottom → section bottom | 160px | **96px** |
| hero bottom @1440×900 | 953.08px | **811.41px** |

- **`.hero { padding-block: var(--s-96) }`** — flat, not the `--section-y`
  ladder. 96px is where `--section-y` itself lands at ≤768px, so the hero just
  reaches that step early. Nothing below the hero moved.
- **The eyebrow's 8.31px of phantom leading is gone.** `.kicker` is
  `inline-flex`, so it baseline-aligned inside a line box of the column's
  inherited 26.86px line-height and its border box sat 8.31px BELOW the padding
  edge — 160px of padding rendered as a 168px gap. The FLUSH-TOP EYEBROWS rule
  makes it block-level `flex` with `line-height: var(--eyebrow-lh)` (1.2, the
  label leading the card TIER 1 already uses), so the measured gap IS the
  padding. The selector is an explicit `:is(.hero, .calcband__intro)` list —
  any eyebrow that STARTS A COLUMN which has to line up with something needs
  it; everywhere else `.kicker` stays inline by design, where it can share a
  line with other content.
- **The spec card's top offset is a formula, not a number.** It was a flat
  `margin-top: 46px` tuned at one width, which drifted −1.98px → −5.12px across
  941–1500px because the H1 is `clamp(--fs-49, 5.6vw, --fs-78)` and its cap
  moves with the font size. Now
  `calc(var(--eyebrow-h) + var(--s-2) + 0.0998 * var(--h-hero-size))`:
  eyebrow height + the eyebrow→H1 step + the headline's own ink inset
  (half-leading at line-height .98 plus Archivo's ascent-box-to-cap gap, which
  measures **0.0998em** and therefore has to scale). Lands within **0.21px** at
  every width from 941 to 1920.
- **`--h-hero-size` is the clamp, named once** and used by both `.h-hero` and
  `.hero__headline`. The card does arithmetic on it, so a second copy of the
  clamp would silently knock the card off the cap height.
- **Measure the cap, not the line box.** `getBoundingClientRect().top` on the
  heading is ~8px above the ink at this size. The cap top is
  `lineBoxTop + (lineHeight − (fontBoundingBoxAscent + fontBoundingBoxDescent))/2
  + fontBoundingBoxAscent − actualBoundingBoxAscent`, via a canvas
  `measureText` with the element's computed font. Align to the rect and the card
  sits 8px high while every number says it is correct.
#### Headline reveal — the timing budget (2026-08-04)

The accent line "Main Street." **completes within 1.2s of first paint**, measured
on Fast 3G + 4× CPU throttle. It was **2476ms**, and the payoff line sat hidden
for **1442ms** — the first impression read "The machine belongs to" with no
resolution. Now **856ms** settle, **750ms** hidden. `npm run test:hero`
(`scripts/test-hero-timing.mjs`) measures it under real CDP throttling.

**The cost was in FRONT of the animation, not inside it.** This is the part that
matters for anyone retuning it: the headline ships complete in the HTML and
`font-display:swap` paints it at first paint, so the script's `armed` state does
not delay an entrance — it **removes a line the visitor has already read** and
brings it back. Three things stacked:

- `IntersectionObserver`'s first record is delivered on a **later task**, not
  synchronously from `observe()`. The hero is the top of the page and always
  past the 0.35 threshold on load, so that round-trip bought nothing and cost a
  frame or more — on a slow first visit, where the deferred script arrives long
  after first paint, it is the largest term. The script now measures the rect
  itself and, at ratio ≥ 0.35, goes **straight to `play` in the same task**;
  `armed` is a state the browser never paints (`test:hero` asserts the observed
  states are `["idle","play"]`). The observer is kept for the below-the-fold
  case, where its latency is irrelevant because the visitor must scroll first.
- A flat **0.35s lead-in delay** before letter 0 moved. Removed outright: a
  lead-in is the one part of a stagger that buys nothing — it reads as lag, not
  rhythm.
- The reveal itself ran 1.42s (`.045s` stagger × 10 + `.62s` drop).

Now `--hm-dur: .42s` / `--hm-stagger: .032s`, named on `[data-hero-machine]` so
the budget is auditable rather than re-derived from two literals: 11 letters,
`--i` 0..10, so the last completes at **0.74s** after `play`. The remaining
0.46s of headroom absorbs script execution. Keep the two in proportion if
retuned — the stagger is what makes it mechanical (0.32s of cascade is plainly
sequential), the duration is what makes each letter land. Shortening the stagger
alone turns it into a single fade.

Safety net **2.5s → 1.5s**. It backstops a state nobody should reach, and 2.5s
of a missing payoff line is itself the bug; the reveal's own worst case is 0.74s.

**The contract is unchanged and verified, not assumed** — all six by measurement,
never by reading the source:

- **No JS**: `hero-machine.js` aborted at the network layer → full headline,
  never split, `armed` never entered.
- **Reduced motion**: full headline, `document.getAnimations()` has **zero**
  `hm-drop` animations, state goes straight to `done`, `armed` never entered.
- **JS error**: the fault is injected into the served script body immediately
  **after** it arms — the worst case, letters already split and hidden — and the
  `catch` force-finishes to the complete headline. Patching the body rather than
  stubbing a DOM method matters: a stub broad enough to break the script also
  breaks the test's own probe, which is how the first attempt failed.
- **No layout shift**: the accent line's box is byte-identical across
  unsplit / armed / play / done (x 172, y 390.22, w 622.42, h 93.52 at 1440).
- **CLS 0** from the headline.

Two measurement traps here, both of which produce confident nonsense:

- **Record the LAST settle, not the first.** The line is already complete at
  first paint, then the script hides it. A probe that records the first
  `complete` reading reports a perfect 0ms on a page that blanks its headline
  for two seconds. `test:hero` samples every frame and finds the last
  incomplete→complete transition, and separately reports how long the line spent
  hidden.
- **A `layout-shift` entry's `value` is the score for the whole FRAME, not for
  one source.** Charging the full value to the hero because one of its sources
  is inside it reported the sitewide **webfont swap** — one entry at ~43ms
  moving `.nav__right`, a stat label and the hero's CTA button together — as a
  hero shift worth 5.4e-5. It is not one: page CLS is **identical to the last
  decimal with `hero-machine.js` blocked entirely**, which is the control run
  that settles it, and no element of the headline is ever a shift source.

Not touched, per the brief: the headline copy, and the canvas grid drawing
(`hm-wipe` still runs .9s — it is the background surface, not the headline).

- Grid texture raised 4.5% → **6%** (`js/hero-machine.js`). Less empty field is
  left, so what remains has to read as a drawn surface, not leftover space. The
  registration ticks stay at 14% — they are the mark, the grid is the texture.
- Below 940px the hero stacks and none of this applies; the card alignment rule
  is already inside `@media (min-width: 941px)`.
- **Known, pre-existing, NOT from this pass:** the homepage has 37px of
  horizontal overflow at 1280px wide. It is identical at the previous commit.
  `sweep:mobile` covers 320/390/430 and `qa:matrix` renders 1440/1024/768/375,
  so 1280 is in nobody's grid.

### Homepage pricing rows — two columns (2026-08-02)

The homepage's third column held one "Read the full spec →" link in a 360px
track and nothing else. Those rows are now `.svc--2col` (`220px 1fr`), the link
moved to the foot of the description column, and the price fine print
(`.svc__note`) moved out of the rail into the description column with it.

**`.fineprint`, the note block under the tiers (2026-08-03).** The two closing
paragraphs ran the full 1096px container at **~122 characters a line** — about
half again the top of the readable band. They are now an eyebrow rail
("The fine print", `.tick-lbl`) plus a measured column, **on the tier rows' own
geometry**: a 220px rail, a 32px gap, text capped at 640px. **81 chars/line**,
which is what the reference measures too.

- **The two literals are the row's, restated so the block lines up with it.**
  220px is `.svc--2col`'s rail; 32px is `.svc__main`'s own left padding. Edit
  the row's tracks and this has to move with them.
- **Plus a 1px left pad, and it is not a fudge.** The `.svc` table draws a 1px
  border, so its rows begin one pixel inside the container; a block starting at
  the container edge lands 1px left of every tier's text. With it: rail-to-rail
  **0.0px** and text-to-text **0.0px** at 1440 / 1280 / 1024 / 921.
- `.hero__note`'s own 16px top margin is zeroed on the first paragraph, so the
  eyebrow and the first line share a baseline row as they do in the reference.
- **Tracks inside `@media (min-width: 921px)`** — the same breakpoint and the
  same reason as `.svc--2col` above: the single-column state is the default,
  and a media query adds no specificity, so declaring the two-column form
  unconditionally would outrank any rule meant to undo it. Stacked, the eyebrow
  takes a 12px bottom margin because the column gap is no longer doing that job.
- Copy is **unchanged**. One thing it says is now stale, and is left alone
  deliberately — see the note in the TODO section about the retired slot count.

**The empty third column was a symptom, not the cause.** Measured naturally at
1440: the 220px rail was the TALLEST column in rows 01 and 02 (285 and 423px)
while the description needed only 236px. At the rail's 171px of content width,
row 02's two fine-print sentences wrapped to 3 and 4 lines (87px + 65px) and
`$18,000–$60,000` broke across two lines. Collapsing to two columns *alone*
made it worse, not better — it widened the residual void from 356px to 872px,
because the slack simply moved into a wider column. Moving the fine print out
of the rail is what balances them: the description becomes the taller column in
every row, and the leftover slack lands in the 220px rail, too narrow to read
as a panel.

| | before | after |
|---|---|---|
| table height | 945px | **817px** (−13.5%) |
| row 02 height | 424px | **305px** (−28%) |
| total dead area | 507k px² | **421k px²** (−17%) |
| row 02 dead area | 256k px² | **158k px²** (−38%) |
| largest panel-void (01/02/03) | 300 / 452 / 300 px | **432 / 320 / 196 px** |

- **The brief's acceptance bar — no empty region wider than 200px — is not
  met, and is not reachable at this row width.** Any horizontal band with no
  ink is as wide as its column minus that ink. The narrowest column is 220px,
  and the elements at a column's foot are a 165px action link and a one-line
  note in an 810px column. Rows 01 and 03 improved; **row 01's largest void got
  WORSE** (300 → 432px) because its description column is now 874px wide and
  its bottom band is short. Getting under 200px needs either a narrower
  container for this section or Option B's three-item INCLUDES list, which
  needs copy that does not exist yet.
- **`margin-top: auto` on the action link was tried and rejected.** Bottom-
  anchoring it only moves the slack from below the link to above it, as a
  full-column-width gap — the "internal dead space" the brief rules out. In
  flow is better on both the metric and the eye.
- The link needs `margin-top: calc(var(--s-24) - 14px)` for a 24px VISIBLE gap:
  the tap-target rule (`.svc__cta, .path__cta, .feed__archive`) sets
  `padding-block: 14px; margin-block: -14px` and, being later in source, its
  margin-block beats `.svc__cta`'s own margin-top outright. In the old
  third-column layout nothing sat above the link, so the collapse was invisible.
- `.svc__note`'s 24ch cap is a RAIL measure and must be lifted in the
  description column or the sentences wrap exactly as they did before.
- Prose is capped at **80ch** — the top of the readable band. Uncapped, 1fr
  gives 810px of content, about 95 characters. Uncapping also made row 03 worse
  (void 228 → 672px), so the cap is doing real work, not just readability.
- **No `min-height` exists on these rows and none was added** — heights hug
  content (275 / 305 / 237, all different).
- **Auditing empty space: count TEXT and replaced elements only.** Treating a
  background or a border as "content" marks every bordered grid cell as full —
  `.svc__meta` and `.svc__main` both carry `border-right`, so the 3-column
  layout measured as 30% dead when only its one unbordered cell was being
  looked at. An area with a background painted on it is still empty.

### Homepage calculator band (rebalanced 2026-08-02)

`.calcband__grid` is `align-items: start`, not `center`. Centering a 297px text
block against the 1031px ROI card put the eyebrow **375px below** the band's
padding edge: the card started at the top of the band, the text started most of
the way down it, and the two columns read as unrelated. Start-aligning puts the
eyebrow and the card's top border on the same y — measured **0.00px apart** at
every two-column width (901→1920).

- **Nothing was inflating the band.** `padding-block` was already plain
  `var(--section-y)` (160/120/96) and there is no `min-height`. The band's
  1351px is entirely the card's 1031px + padding, and start-aligning does not
  change it — it redistributes the slack.
- **The card is contained, at every width.** Its bottom sits exactly one
  `--section-y` above the band's, so there is no overlap into `#proof` and
  nothing to cap.
- **Top-aligning DOUBLES the largest empty run on the left**, from 367px (a
  centred block splits its slack evenly above and below) to **715px** in one
  run under the CTAs. That is the direct, unavoidable consequence of the
  alignment, and it means the "no empty dark region taller than 200px" bar is
  NOT met. `.deco-grid--left` (`inset: 0`, masked to the left half) was what
  kept that run reading as a drawn surface rather than a hole. **Superseded
  2026-08-03 by `.ink--grid`**, which rules the whole band and so covers that
  run and everything else — the requirement stands, only the layer meeting it
  changed. The band must never be left with neither.
- CTAs sit `--s-64` below the intro, in flow. They are deliberately NOT pinned
  to the band bottom: pinning turns one 715px run into a 779px one, because the
  gap opens above them instead.
- **Why the card can't just be shorter:** it is `.roi--slim` in a 464px track,
  which stacks inputs over output. Its height is real content — inputs 320,
  output 559 (net 146 + assumptions 137 + disclaimer 168), bar 69. There is no
  slack in it.
- **The costed option, not applied:** widening the card's track shortens it,
  because it is cramped at 464px (the header bar, the "Modeled return / year"
  label and the big number each wrap to two lines).

  | tracks | card | card h | band h | left void | CTAs |
  |---|---|---|---|---|---|
  | `1.1fr .9fr` (now) | 464 | 1031 | 1351 | **715** | side by side |
  | `1fr 1fr` | 516 | 945 | 1265 | 508 | stacked |
  | `.85fr 1.15fr` | 593 | 903 | 1223 | **466** | stacked |

  The big win needs the text column below **526px**, which is the width the two
  CTAs need to sit side by side — so every meaningful reduction stacks them.
  That is a design decision, not a defect, which is why it is recorded here
  rather than shipped.

### Homepage proof stat strip (amplified 2026-08-02)

`.bstat` went from three loose 32px figures with a 24px gap to a **hairline
grid** — one row, 1px `--rule` between the cells, a rule above and below, no
outer left/right border so the strip runs the full container width and the
first figure sits flush with the H2.

| | before | after |
|---|---|---|
| value | 32px / weight 900 | **72px @1440** / weight 800 / `-0.03em` |
| unit (`hrs`, `%`) | 17.6px (`.55em`) | **24px** (`calc(1em / 3)`) |
| value → label gap | 4px | **8px** |
| intro → strip | 64px | 64px (unchanged) |
| strip → action link | 40px + a rule | **64px**, no rule |
| links in section | 2 | **1** |

- **`.bstat` had to move out of the 24px sibling-gap `:is()` list** in the
  VERTICAL RHYTHM LAYER and into that block's hairline-grid exclusion comment.
  That rule is later in source than `.bstat`'s own `gap: 0`, so leaving it
  would have silently reopened 24px holes in the separator lines.
- **The value size stays fluid — `clamp(44px, 5vw, 72px)`.** 5vw is exactly
  72px at 1440. It cannot be a flat 72px: "1,240" + "hrs" is ~245px at that
  size and the cell is only ~215px wide at a 900px viewport, so it would
  overflow the strip on the way down to the 900px stack breakpoint.
- The unit is `calc(1em / 3)` rather than a literal 24px so it stays
  proportional as the value scales.
- **Stacked (≤900px) the separator turns 90°**: `border-left` becomes
  `border-top`, or a full-width row carries a stray vertical tick.
- The markup is GENERATED — `REGIONS["MARCUS-HOME"]` in `scripts/build-work.mjs`
  between the `BUILD-LOG:MARCUS-HOME` markers. It already had the right shape
  (`.bstat__n` with a nested `<small>`, then `.tick-lbl`), so this was a
  CSS-only change and `work:build` stays idempotent. The action-link `<p>` sits
  OUTSIDE the markers and is hand-editable.
- **`.builds__note` is a shared note bar on eight pages** — bordered, padded,
  running prose. The proof section's instance carries nothing but a STYLE B
  action link, where that chrome would draw a second rule 64px under the
  strip's own bottom rule. `.builds__note--action` strips it. A modifier, not
  an `#id` override, because the base component is shared.
- The deleted second link (`/work/`, "the whole proof shelf") is **not
  orphaned** — `/work/` is still reached from the nav and the footer. The
  surviving link keeps its `/work/marcus/results/` href, which is what its
  label says; repointing it at `/work/` would make the label lie.

### Homepage build-catalog strip (flattened 2026-08-02)

`.buildstrip` replaces a `.builds` panel (40px card padding + `--paper-card` +
its own border) whose only content was a `.builds__bar` carrying its own
border-bottom and gradient — a box inside a box, for one label and one link.

    <div class="buildstrip">
      <div class="buildstrip__row">
        <span class="tick-lbl">Example builds</span>
        <a class="buildstrip__go" href="/services/builds/">Browse the build catalog →</a>
      </div>
      <ul class="buildstrip__chips"> …four <li> … </ul>
    </div>

1px `--rule` top and bottom, no left/right border, transparent at rest,
`padding-block: 24px`, and it sits in the standard `.wrap` so it measures 1096px
inside the 1160px container. Hover fills the band with `--paper-tan` and nudges
the arrow 2px. **Zero nested containers.**

**Chips added 2026-08-03.** The strip was a label, a link and a rule with
nothing beneath — an empty table header. `.buildstrip` became a flex COLUMN
(`gap: --s-16`) and its old row geometry moved to `.buildstrip__row`, so the
label/action row is unchanged and the chips are a second row under it.

- **The four names are REAL catalog entries, verbatim from `/services/builds/`**
  — "24/7 AI receptionist", "Instant lead response", "Business system
  connectors", "Company knowledge base". One per door of the three cards the
  strip sits under (agent · automation · integration · data). The reference's
  own four are placeholders ("Intake & triage agent", "Quote-to-invoice
  automation", "CRM ↔ field-ops sync", "Policy Q&A with audit log") and must
  NOT be copied — none of them is a thing we sell.
- Chips are **static `<li>`, not links**: the strip already targets the
  catalog, and a chip that looked clickable would promise a per-build page that
  does not exist. A `<ul>` rather than four `<div>`s because it is a list of
  four things and the semantics are free.
- **The stretched `::after` now covers the chips too, on purpose.** `inset: 0`
  resolves against `.buildstrip`, so the overlay grew with the strip. Hit-tested
  at 1440/1024/620/390: chip text, the gap between chips, the label, and both
  far corners all resolve to `/services/builds/`.
- 12.5px is **off the type scale deliberately** — the steps either side are
  `--fs-12`/11px and `--fs-13`/14px — and is the reference's measured size. It
  clears the 11px floor `qa:matrix` asserts. The border is
  `color-mix(in srgb, var(--ink) 28%, transparent)`: the brief's "~28% ink",
  derived so it tracks the palette rather than pasted as a literal.
- Chip height is **44px against the reference's 40px**, because Space Mono has a
  taller line box than the reference's IBM Plex Mono at the same 12.5px and
  `11px 16px` padding. The padding matches the brief; the height follows the
  face.
- Wraps on its own: one row to 1024, two at 768–620, four at ≤430. No chip
  escapes the strip and no page overflow at any of 1440/1280/1024/768/620/430/
  390/320.
- **The strip is still `#work`'s terminal element**, so the section keeps
  `.section--close-96`; `qa:matrix`'s `endsThin` matches `.buildstrip` by class,
  not by height, so a taller strip does not drift the two apart.

- **`.builds` itself is untouched** — six industry pages use it as designed,
  with build cards under the bar. Only the homepage had the degenerate
  empty-panel case.
- **The whole strip is clickable via a stretched `::after` on the small `<a>`,
  NOT by wrapping the row in one anchor.** This is the load-bearing decision.
  The LINK SYSTEM selects STYLE B with `a:not(.btn):has(.arr)`, a SUBTREE test,
  so a strip-wide anchor would pull mono + uppercase + 12px + accent onto the
  `.tick-lbl` and onto any body-font description added later — the exact
  cascade the block-link exclusion exists to stop. Keeping the `<a>` small
  means it takes STYLE B from the system with **no new rules**, holds the
  accessible name to "Browse the build catalog" rather than the whole row, and
  leaves a future description alone. Verified: label renders 11px
  `--ink-muted`, action renders 12px mono uppercase `--accent-text`, undecorated.
- **The `::after` belongs to the `<a>`, so hovering anywhere on the strip is
  also hovering the `<a>`** — STYLE B's own `:hover .arr` nudge already covers
  the full band and needs no separate rule. Confirmed by hovering 30px in, over
  the label: arrow goes `none` → `translateX(2px)`.
- Hit-tested at 1440/1024/768/620/430/320: all four corners, the centre and the
  mid-left point resolve to the link.
- Hover state is AA-clean: `--ink-muted` on `--paper-tan` is 4.62:1,
  `--accent-text` 4.67:1. `qa:matrix`'s contrast column only samples the REST
  state, so a hover fill has to be checked by hand.
- **No description was added.** The brief allowed one "if one exists" and none
  does — the old bar carried only the label and the link. Copy for it would
  have to be written, not lifted; the closest existing line is the catalog
  page's own "The stock parts." `.buildstrip__desc` is defined and ready
  (body face, `margin-right: auto` so it sits center-LEFT beside the label
  rather than being centred by `space-between`).
- Below 620px the row stacks; `space-between` has no free space to distribute
  there, so the action would otherwise sit flush under the label.
- The old bar coloured its first label `--accent-text`. The strip uses the
  standard muted `.tick-lbl` so the single accent belongs to the affordance,
  per the link system's rule that accent marks the action.

### Homepage "Pick the door" cards (normalized 2026-08-02)

**Door 01's CTA is PRIMARY as of 2026-08-03** ("Book a free assessment"); 02 and
03 stay SECONDARY. Three identical outlines gave the free assessment — the one
conversion the whole page funnels toward — no more weight than "Get your score".
Matches the reference, which fills door 01 and outlines the other two.

- **It had to gain an arrow.** Every PRIMARY carries one and SECONDARY never
  does; `qa:matrix` fails `PRIMARY without arrow`. The reference's own door-01
  label has no arrow — our button contract wins over copying the glyph.
- **The one-primary-per-viewport-height rule still holds**, and was checked
  rather than assumed. Content primaries now sit at y 628 (hero), 4950
  (calculator band) and 7635 (doors) — gaps of **4322px** and **2685px**,
  against a 1000px floor. The footer's "Subscribe →" is 373px below the new
  one, which is fine: nav CTA and footer newsletter are chrome and excluded by
  the rule, exactly as the BUTTONS section records.
- Geometry is untouched: all three stay `align-self: stretch`, so widths remain
  identical (267.33 / 267.33 / 267.34 at 1440, spread 0.01px) at every width
  from 320 to 1440, each button inside its own card, 52px box throughout. At
  320px the primary alone measures 67px — its label is the longest and wraps,
  which is the documented sub-620px button behaviour, not a defect.

`.paths` was a hairline grid — one bordered container, `gap: 0`, a
`border-right` on each `.path`. Those shared walls are what read as a stray
divider beside "Scope a sprint" and a left rule on "Get your score". It is now
**three separate cards**: a full 1px `--ink` border each, `--s-4` padding, 24px
gap, no container border, no internal rules left to be stray.

| | before | after |
|---|---|---|
| card border | shared container + `border-right` | **1px `--ink`, all four sides** |
| gap | 0 (shared walls) | **24px** |
| padding | 32px hand-set | **`--s-4`** (40 / 24 ≤768) |
| CTA width | 250.2 / 180.3 / 180.3 | **267.33 / 267.33 / 267.34** |
| CTA baseline | already aligned | aligned, spread **0.00px** |
| `min-height` | 340px | none — cards hug content |

- **`.paths` moved OUT of the hairline-grid exclusion in the VERTICAL RHYTHM
  LAYER and INTO its card-collection gap list; `.path` was added to the
  card-padding list.** Exactly the reverse of `.bstat`'s move the same day.
  Both lists sit later in the file than the component, so leaving `.paths` in
  the exclusion would have kept `gap: 0` and left the walls shared.
- **`align-self: stretch` is what makes the buttons pixel-identical.** The
  cards are equal grid tracks, so a stretched button is the same width in all
  three whatever the label says; `flex-start` sized each to its own copy. The
  residual 0.01px spread at 1440 is the browser splitting a 1048px row three
  ways — sub-device-pixel, not a layout difference.
- **`.path p` lost `flex: 1`.** That made the PROSE absorb the card's free
  space and pinned the button as a side effect. `margin-top: auto` on the
  button claims the space directly, so it sits between the copy and the button.
- **`.path__cta` was removed from the 44px tap-target rule**
  (`.svc__cta, .path__cta, .feed__archive { padding-block: 14px; margin-block:
  -14px }`). That rule grows a small inline text link without moving its
  glyphs; `.path__cta` is a real `.btn` with a 52px box, already past the
  floor. The padding did nothing (border-box) while `margin-block: -14px` —
  later in source than `.path__cta`'s own `margin-top` — silently overrode it
  to **−14px** and pulled the button up into the copy.
- **The track minimum is load-bearing, not cosmetic.**
  `repeat(auto-fit, minmax(min(330px, 100%), 1fr))`. `.btn` is
  `white-space: nowrap` and a flex item's auto min-width is its min-content, so
  "Book a free assessment" stays 250.2px wide however narrow the card gets.
  330px = that button + 2 × `--s-4`, so a card only joins a multi-column row if
  the button actually fits. Widening the padding 32 → 40 and adding a 24px gap
  would otherwise have overflowed the card at 1024 — a width `qa:matrix`
  renders. auto-fit now steps 3 → 2 → 1 on its own (3 down to 1120, 2 to 768,
  1 below ~700) and the old hard 860px breakpoint is gone.
  `min(330px, 100%)` is the auto-fit overflow guard: a bare `minmax(330px,1fr)`
  holds a 330px track inside a 280px container and scrolls the page sideways at
  320px.
- Verified at 17 widths from 320 to 1440: the CTA sits inside its card's
  content box at every one, height is exactly 52px down to 390px, and the
  row-1 baseline spread is 0.00px throughout. At 320px the label wraps to
  67.06px off the 52px min-height — the documented sub-620px button behaviour.

### ROI card compression (2026-08-02)

The `.roi--slim` embed on the calculator band went **1031px → 839px**, taking
the dark band from **1.50× → 1.29×** of a 900px viewport.

| | before | after |
|---|---|---|
| card height | 1031px | **839px** |
| band height | 1351px (1.50×) | **1159px (1.29×)** |
| bar | 69px (2 lines) | **47px** (1 line) |
| footnote | 168px, 9 lines | **21px** + a STYLE B link |
| receipt rows | 22px on an 8px gap | **40px pitch** |
| card content width | 322px | **402px** |
| left-column empty run | 715px | **524px** |

- **The biggest win was a bug, not a trim.** `.roi` sits in the rhythm layer's
  card-interior `:is()` list, so it took `padding: var(--s-4)` *on top of* the
  30px its own zones (`.roi__bar`, `.roi__inputs`, `.roi__output`) already
  apply — 80px of doubled inset. Worse, it squeezed the content column to
  322px, which is what forced the bar's right label, the "Modeled return /
  year" label and the select's note each onto two lines. `.roi--slim{ padding:
  0 }` must sit AFTER that list: same (0,1,0) specificity, and `.roi--slim`'s
  own block is ~1300 lines earlier, so source order is what decides.
- **Nothing had to be moved to `/calculator/`.** All eight caveats in the cut
  footnote were already published there in fuller form (verified clause by
  clause against the rendered page). Deleting them from the homepage loses
  nothing from the site.
- **`--roi-zone: 28px`** is a local custom property on `.roi--slim`, named once
  rather than repeated as a literal at four zone boundaries. It sits between
  `--s-24` and `--s-32` because the brief specified it.
- The 40px receipt pitch is the one change here that ADDS height (+48px). It is
  paid for several times over by the padding removal and the footnote cut.
- **The select's caret** was `color: var(--accent)` at 14px, absolutely
  positioned against the wrap while `.roi__select` was `width: auto` — so the
  field stopped 51px short of the wrap and the caret rendered as a loose rust
  fleck in the gap beside the control. `width: 100%` puts the field under its
  own caret (the 40px of right padding was already reserved for it); the caret
  is now 12px `--ink`, 14px inside the field's right edge. **The same bug was
  live on `/calculator/` and is fixed there too.**
- `.roi__how` carries the sitewide 44px touch floor, leaving ~12px of empty box
  under its 12px text, so the card trailed 45px of cream against 30px above.
  `margin-bottom: -12px` closes exactly that dead space; the hit area stays
  44px. Output zone now reads 30.0px top / 32.5px bottom — the 2.5px is the
  mono line-box descender.
- **`.roi--slim` scoping is deliberate.** `/calculator/` runs the full `.roi`
  two-column card and keeps its 40px padding, its 12-line disclaimer and its
  own rhythm. Only the homepage embed is compressed.
- **The results header stacks in the slim card only (2026-08-03).**
  `.roi__nethead` is two mono labels in a `space-between` row. At
  `/calculator/`'s 447px they sit on one line each and read correctly; in the
  262px slim card BOTH wrap to two lines and the columns interleave — the eye
  reads across and gets "MODELED RETURN FOR 25 / YEAR PEOPLE". `.roi--slim`
  makes it a column: two left-aligned lines, `--s-04` apart, the second in
  `--tx-mute` as the qualifier. Scoped to `--slim`, because the full card is
  not broken and must not move. `#bandFor` was already live on the slider
  (`range.addEventListener('input', …)`); verified at 5 / 60 / 100, and it
  keeps the singular case at 1.
- **The duplicated caveat is resolved (2026-08-02).** "A model, not a promise"
  had been appearing twice — the bar's right label and the whole footnote,
  ~500px apart. The FOOTNOTE sentence went; the bar keeps it, because the bar
  states the caveat BEFORE the reader reaches the number, which is where a
  caveat belongs. `.roi__how` is now the card's last zone and takes the full
  `--roi-zone` step rather than the 12px it used under the sentence.
- **The 524px left-column void is resolved (2026-08-02): now 95px.** Padding
  was never the lever — the card had to get SHORTER, and the only way to
  shorten it was to stop stacking its two zones. See the two-column note in the
  `.roi--slim` block. Band 1159px → **852px, 0.95× of a 900px viewport**.
  Void ≤320px at every side-by-side width: 95 (≥1160), 317 (1060–1159),
  303 (1024), 273 (901).
  - **Cost, accepted deliberately:** the card needs ≥565px to hold two
    columns, which drops the text column below the 526px the two CTAs need
    side by side, so they now stack. Two-column card and single-row CTAs are
    mutually exclusive — that is arithmetic, not preference. Flagged twice and
    confirmed before shipping.
  - **SETTLED 2026-08-03: the CTAs stack, and that is the design.** Asked to
    make a call rather than keep flagging it, the answer is to keep the
    two-column ROI card and let the pair stack equal-width. The card is what
    the section is for; collapsing it back to one column to win a single row of
    buttons trades a 0.95×-viewport band for a 1.29× one and reopens the 524px
    void that took a whole pass to close. Nothing further is owed here.
  - **Re-raised 2026-08-03 and the arithmetic still holds.** The CTAs were
    asked to go side by side at a 16px gap. They cannot at 387px: `.btn` is
    `white-space: nowrap`, so the pair needs 260 + 250 + 16 = **526px**. The
    reference does not manage it either — its buttons need 520px against a
    fixed 502px column and wrap at 1280/1440/1600/1920. What shipped instead:
    `gap` 36 → **16px** as asked, and `.calcband__intro .roi__cta .btn
    { flex: 1 1 0 }`, which puts them side by side wherever the row can hold
    them (≤900px, where the band is single-column) and makes them **equal
    width** when it cannot — the real visible defect was 260px against 250px.
    `flex-basis: 0`, not `auto`: from `auto` a side-by-side pair grows off its
    own label widths and lands at 415/405, the same raggedness one row over.
    Below 620px the rule flips to `flex: 1 1 100%` — `.btn` may wrap its label
    there, which removes the min-content floor, and the pair had begun sitting
    side by side at 187px each with both labels broken over two lines.
- **KNOWN, pre-existing, NOT from this work:** at 320px the industry select
  clips its widest option by 19px (199px of text needed, 180px available) —
  the card is only 280px wide there. Verified identical under the previous
  `width:auto; min-width:200px`, so `width:100%` did not cause it; that change
  in fact FIXED a 2px clip at 390 and 430px.

### Founder section — beige band + uniform press row (2026-08-03)

**`#about` moved cream → beige and `#paths` moved beige → cream**, so the tail
of the page alternates `#proof` cream → `#about` **beige** → `#paths` cream.
Both had to move: `#about` alone would have put two beige bands back to back,
since `#paths` was already `.paper-2`. The reference does exactly this swap.

- Contrast on `--paper-tan` re-measured, all AA-clean: h2 **13.05:1**, outlet
  names 13.05, action link 15.24, and every muted step — lead, eyebrow, prose,
  the new press label — **4.62:1**. That last number is why `--ink-muted` is
  `#685E4F` and not the older `#6E6455`, which was 4.22:1 on this exact band.
- **Hairlines lose contrast on beige and that is worth knowing.** `--line` is
  **1.16:1** on `--paper-tan` against 1.34:1 on `--paper` — the `.bio__press`
  top rule is now nearly invisible. Left as-is: `--rule` on `.paper-2` is what
  `/pricing/` and the doors section have always done, and darkening the token
  for one band would fork the hairline system. The new outlet underline sits at
  **2.36:1**, which is the visible line in that block now.

**The press row is uniform, linked or not.** Four outlets (Forbes, Inc.,
TechCrunch, Fox Business) are `<a>` and took STYLE A's underline; WSJ, NYT and
MSNBC are bare `<span>` and took nothing — so the row read half-linked,
signalling nothing except which URLs we happen to hold. All seven now render
600 weight with a 1px rule at `color-mix(in srgb, var(--ink) 35%, transparent)`.

- **Drawn with `text-decoration`, not `border-bottom`.** The border was the
  first attempt and `qa:matrix` rejected it: to stop the linked ones doubling
  up I had stripped their underline, which left them with neither underline nor
  arrow — a THIRD link appearance, and 8 failing cells across `/` and
  `/about/` (`STYLE A without underline: a "Forbes"`). Underlining every outlet
  keeps the four links textbook STYLE A with only the decoration COLOUR moved.
- **The mid-dot separator is retired.** It lived inside the nowrap span so it
  could never start a line; an inline border/underline wraps the whole inline
  box including a `::after`, so the rule ran on under " ·".
- **`.bio__press .press-list` had `gap: 0.5em 0` — a ZERO column gap.** The
  mid-dot and its 8px margins were the only thing holding the names apart, so
  removing it ran them into "ForbesThe Wall Street JournalThe New York
  Times…" under one continuous rule. Now `0.7em 1.6em`, giving 22px between
  outlets. Do not reinstate the dot without putting that gap back to 0.
- The intro is a label now, not a sentence: `.tick-lbl` mono caps, its own
  line, colon dropped. Copy still credits the founder, per the voice rules.
- **The CSS is shared, so `/about/` gets the same row** — deliberate; the two
  pages should not disagree about how the press strip looks.

### Founder section — press block at the column foot (2026-08-02)

`.bio` was already `align-items: stretch`, so the prose column had always
matched the photo card's height. But as a block container its children stacked
at the top and left the slack **below** the press block — 166px of it on the
homepage — so a finished card sat beside an unfinished column.

`.bio__prose` becomes a flex column and `.bio__press` takes `margin-top: auto`.
Press bottom and card bottom now measure **0.00px apart** at 1440 / 1024 / 900.
The hairline needed no separate handling: `border-top` is on `.bio__press`
itself, so it travels with the block instead of sitting stranded mid-column.

- **Guarded on the press being the column's LAST child** —
  `.bio__prose:has(> .bio__press:last-child)`. True on the homepage, false on
  `/about/`, where `.bio__verify` follows it; pushing the press down there
  would strand the verify list at the bottom and open a gap in the middle.
  Verified `/about/` still computes `display: block`.
- `margin-top: auto` **overrides** `.bio__press`'s own 24px margin-top and
  collapses to 0 when there is no slack (stacked, ≤760px), so the minimum gap
  has to come from the paragraph above it.
- The section takes `.section--close-96` via the `CLOSE_96_OTHER` allowlist,
  not the terminal-element rule — see the note in the rhythm layer.
- **Measuring "empty zone" here:** the auto-margin MOVES slack, it does not
  remove it, so the right column now carries a 183px gap between the action
  link and the press row. That is not an empty *zone*: the photo card fills
  that whole vertical range beside it. Measured as bands with no ink anywhere
  across the section's content box, the largest run is **62px** — the standard
  `--block-gap` between the header block and `.bio`. Measure the section, not
  one column, or a two-column layout with a tall image always reads as failing.

### /book/ scheduler — eager mount + a hero sized to the fold (2026-08-03)

The Calendly embed is the site's conversion moment. At 1440×900 the whole card
started below the fold — **panel header at 975px, calendar at 1194px** — and
the iframe was created by an **IntersectionObserver** (`rootMargin: 600px`).

**Measure the observer before blaming it.** It was NOT what made the
"Loading the scheduler…" placeholder dwell at desktop sizes: 600px of root
margin already covered an embed 1193px down a 900px viewport, so it fired at
**+4ms with no scroll** — indistinguishable from the eager mount's +3ms. The
dwell is Calendly's own weight (**~25s to `load` on Fast 3G**, unchanged by
when we start it). What the observer really cost was a **cliff below ~593px of
viewport height**, where the embed stopped intersecting the expanded root and
genuinely required a scroll: measured `NO — requires a scroll` at 580 / 500 /
400px tall, `yes` at 600 and up. Short windows and landscape phones sat on the
wrong side of it. After the change every one of those mounts without scrolling.

**The observer is deleted, not kept as a fallback.** The inline script sits at
the foot of `<body>`, so `document.readyState` is already `interactive` and the
frame goes out on the spot; the `DOMContentLoaded` listener is only for the
case where it is not. There is no browser that would run this script and fail
to mount early, and a fallback path nobody exercises is a path that rots.
`loading="eager"` is set explicitly — it is the default, but this frame starts
below the fold on a short viewport, which is exactly the shape a browser
heuristic may decide to defer.

- **Still not `widget.js`.** `script-src` does not allow `assets.calendly.com`
  and must not be loosened. The direct iframe IS the integration; booking
  events arrive via `postMessage` either way.
- **Two preconnects in the head, and they are not redundant.** The socket pool
  keys on the anonymous flag, so the `crossorigin` (credentials-omitted)
  connection is a *different* one from the credentialed connection an iframe
  NAVIGATION uses. Drop the plain one and the iframe re-handshakes from cold.
  preconnect is a resource hint, not a fetch, so CSP does not apply to either.
- **The placeholder comes off on the iframe's `load` event, never on a timer**
  (`.cal-embed.is-ready::before { content: none }`). A timer either lies about
  a slow frame or leaves the message sitting under a live calendar. It goes
  back up during a prefill rebuild, because that is a real load.
- **Zero CLS, and it was already structurally impossible.** `.cal-embed` has
  `min-height: 720px` and the iframe is `position: absolute`, so the frame is
  out of flow and contributes nothing to the box either way — the card measures
  720px on the parse, on the mount and on the load. Measured **0.00003**.

**The prefill guard is tightened.** `calUrl()` is byte-for-byte unchanged; what
changed is when a rebuild fires. `change` **and** `blur` now go through
`syncPrefill()`, which rebuilds only when the value actually CHANGED and is
non-empty, and never once `engaged` is latched.

- Previously any `change` rebuilt unconditionally — including re-mounting an
  identical URL, which is a free flash of the placeholder for nothing.
- **`engaged` latches on `calendly.date_and_time_selected`, deliberately NOT on
  first click or focus into the frame.** The context field sits ABOVE the
  calendar, so latching on focus would silently drop the prefill for anyone who
  scrolls down, looks, then comes back up to type. Picking a time is the point
  where a rebuild starts costing the visitor something they created.
- Past that point the answer still reaches the advisor: the `postMessage`
  handler stashes it in `sessionStorage` and `/book/thanks/` carries it.
- Verified against the LIVE booking form (navigated directly, so the DOM is
  readable — you cannot read it through the iframe): `a1` lands in the custom
  question **"Please share anything that will help prepare for our meeting."**
  Six cases checked: empty blur, type+blur, unchanged blur, cleared field,
  post-selection edit, and placeholder state during a rebuild.

**The hero is sized to the screen, like the homepage hero.** `.bookhero` takes a
flat `96px / 48px` and `#request` a `48px` top, replacing `160 + 160 + 160`.
Both are named in `SECTION_Y_EXEMPT` in `qa-matrix.mjs`, so a THIRD section
drifting off `--section-y` still fails. Nothing was deleted; `#request` keeps
its full closing step at the foot of a section that runs 3000px.

| | before | after |
|---|---|---|
| panel header top | 974.6px | **639.5px** |
| calendar top | 1193.5px | **838.4px** |
| calendar visible @900px | 0px | **61.6px** |
| hero height | 705.6px | **482.5px** |

- **The crumb was carrying 30px of pure layout air.** The sitewide TOUCH
  TARGETS block gives crumb links `padding-block: 15px` on the premise that
  vertical padding on an INLINE box paints outside the line box and moves
  nothing. That premise does not hold here: `.bookhero__crumb` is
  `display: flex`, which BLOCKIFIES its links — a 17px row measured 47px.
  Cancelled with the negative margin that block already prescribes for its
  atomic boxes; the 44px hit area is untouched. **`.crumb` /
  `.sechero__crumb` / `.legal__crumb` have the identical latent bug on ~40
  pages and are deliberately left alone** — one line each, but it moves every
  interior page's hero geometry and that is its own pass.
- **`.bookhero` joined the FLUSH-TOP EYEBROWS list.** Its eyebrow starts the
  left column of a two-column hero whose right column is a `.statrail`, and the
  two tops were **8.31px apart** — the same defect the homepage hero had, on
  the same shape. Now 0.00px.
- 48 + 48 across the cream/beige seam is one `--s-96` gutter split by the
  colour change. 96px on top is where `--section-y` itself lands at ≤768, so
  the hero just reaches that step early.
- **The floor is the `.statrail` at 305px** — it is the taller of the hero's
  two columns, so trimming the headline's margins buys nothing further.
- **Known, and a deliberate non-fix: the Calendly iframe carries ~65px of its
  own top inset** before its white "Select a Date & Time" card begins. So at
  exactly 900px the embed's top edge is visible and that card starts ~3px
  below the fold. Closing it would mean forking the shared `.statrail` to a
  denser row height on this page alone, pushing section seams below 48px, or
  cropping the third-party embed with a negative `top` — which breaks silently
  the day Calendly changes its own padding. None is worth it. **An 812px-tall
  viewport does not clear the calendar top at all**; 900 is the bar that is met.
- Verified after: `qa:matrix` ALL ROWS PASS (including a negative test — the
  guard still fails on drift), `sweep:mobile` green on all 43 routes ×
  320/390/430, `css:check`, `tokens:check`, `facts:check`, `head:check`,
  `placeholders:check`, `book:check`.

### Sticky mobile booking bar (2026-08-04)

`js/nav.js` injects `.stickybook` on viewports <=768px after ~1.5 viewport
heights of scroll: a full-width rust bar, "Book a free assessment ->", with a
dismiss x that persists for the session in `sessionStorage`. Injected rather
than added to 40 pages of markup — it is a pure enhancement, so no-JS loses
nothing and there is no chrome to keep in sync.

- **Never on `/book/`**, by path test. A fixed bar there would sit over the
  Calendly iframe's action area, which on a phone is exactly where the confirm
  button lives.
- **Never while the drawer is open**, via `body:has(.nav.is-open)` in CSS
  rather than a JS class, so there is no second piece of state to drift.
- **Not injected at all on a page shorter than 1.7 viewport heights.** Such a
  page can never scroll far enough to show it, so the bar would be pure DOM —
  and on `/404.html` its label was enough to break `sweep:mobile`'s JS-off/JS-on
  text-parity check, which exists to catch content that DISAPPEARS without JS.
- **It was silently captured by the LINK SYSTEM.** STYLE B is
  `a:not(.btn):has(.arr):not(:has(h1,...,p))` — selected BY the arrow — so the
  CTA rendered `--accent-text` on the rust bar at **1.27:1** and at 12px.
  Source order cannot save a lower-specificity rule: that selector is
  **(0,2,2)**, not the (0,2,1) a quick reading gives, because the trailing
  `:not()` adds an element to the count. Two attempts under-counted it. The rule
  is now `.stickybook a.stickybook__cta:not(.btn)` — (0,3,1), winning outright
  rather than by position — and restates every property STYLE B would impose.
  `#fff` on `--accent` is 5.06:1; `--paper` is 4.26:1 and would fail.
- **`.stickybook` is in `qa:matrix`'s `CHROME` exclusion**, alongside `.nav` and
  `.ticker`. It carries an arrow, and STYLE B is selected by the arrow, so
  without it the bar reports as a link-treatment violation for being a filled
  button — the same wrong reading that would flag the nav's own booking CTA.
- `data-cta="sticky-bar"` is picked up by `js/analytics.js` with no
  registration: its click listener is document-level and capture-phase, so an
  element added later is tagged automatically.
- Total new JS for this pass (focus trap + bar): **1657 bytes**, budget 2048.

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
- **Dark-surface links are already on that token, and it is already the
  "something worse." colour.** Re-audited 2026-08-03 after a report that they
  sat near 3.5:1 — they do not. The dark heading accent span and every
  dark-surface link both compute **`#E86A3E` at 5.61:1 on `--ink`**; light
  surfaces keep `--accent-text` `#AA371A` (4.66:1 on `--paper-tan`, 5.79:1 on
  the ROI card). `--accent` `#C6401E` IS 3.59:1 on ink, which is where a 3.5:1
  figure comes from, but no link resolves to it — only the focus ring does, and
  3:1 is the bar there (WCAG 1.4.11).
- The reference's `#E8622C` measures **5.39:1** on `--ink`, slightly BELOW our
  `#E86A3E`. **Not adopted, and settled 2026-08-03** — it would repaint every
  dark surface sitewide to lose 0.2 of a ratio. The same call was made for the
  other two exact-hex asks: the `.failstat` bar track stays derived from
  `--rule-dark` (lands `rgb(74,66,55)` against a spec `rgb(74,66,52)`, and it
  tracks the palette instead of pinning a literal), and the doors primary keeps
  its arrow (the reference's has none, but `qa:matrix` fails
  `PRIMARY without arrow` and the button contract outranks the mock). Reopen
  any of the three only if exact parity with the reference becomes the goal.
- **STYLE B on dark hovers to `--on-dark-head` (cream), 5.61 → 15.11:1**, added
  2026-08-03. Rest colour is unchanged. STYLE A on dark deliberately keeps the
  inverse — cream at rest, `--accent-ink` on hover — because pointing both at
  cream would leave it with no hover response at all.
- Auditing this: measure **hover as well as rest**, and remember that
  `color-mix()` serialises as `color(srgb 0.96 0.95 0.93)` with **0..1**
  channels. An `rgb()`-shaped parser reads those as bytes and turns every
  `--paper-card` surface into near-black, which manufactures a page of phantom
  1:1 failures — the same trap the contrast pass hit in 2026-08-01.
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
reliable test, since most mono text inherits rather than declaring. This is
now enforced — **`npm run mono:check`** (`scripts/check-mono.mjs`) renders all
43 routes and fails on any mono run over 8 words. Like `sweep:mobile` it needs
Playwright, which is deliberately not a dependency, so it is NOT in
`build:static`: `npm i -D playwright && npm run mono:check`, or point
`PLAYWRIGHT_PATH` at an existing install.

Two things the guard had to get right, and both took a wrong answer first:

- **The unit is a mono BLOCK, not an element.** Charge each element for its own
  text nodes and a mono sentence broken by inline links reads as three passing
  fragments; charge it for its whole subtree and every container is reported
  once per descendant. The guard climbs to the outermost mono ancestor, but
  only across ancestors that have interstitial text of their own — otherwise a
  pure wrapper of separate labels (`.ticker__left`, `.foot__bottom`) merges
  into one long pseudo-sentence and reports a false 10- and 16-word violation.
- **Separators are not words.** `·` `/` `—` `→` carry no reading load. Counting
  them is what previously made four legitimate eyebrows look like 9-word
  violations — "The Ampersand · free, a few times a month" is eight words and a
  middot, and `a few times a month` is `BLOG_CADENCE`, shared with llms.txt,
  the FAQ and the smoke test. Those four are compliant as written; the earlier
  note calling for a copy trim was a counting artefact, not a real residual.
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
  **RESOLVED 2026-08-03 by deleting the clause — but only on `/`. FINISHED
  2026-08-04.** The fine print read "We take a fixed number of builds each
  quarter — *the count at the top of this page is real*", pointing at a count
  the utility bar stopped publishing. It stated no NUMBER, so `facts:check`'s
  reverse guard never fired — the guard looks for a stated count, and this was
  a *reference* to one. The 2026-08-03 pass removed it from the homepage and
  recorded the job as done; **`/pricing/` and `/book/` carried the identical
  sentence for another day**, telling readers to go verify a number that was
  not on the page. Both now end at "each quarter." A guard that keys on a
  stated number cannot catch a sentence that only points at one — when a claim
  is deleted, grep the whole repo for it rather than the page it was noticed
  on. Re-adding a
  `data-fact="build-slots"` span would re-arm both guards and is still the
  route back if the slot count returns.
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
- `cta:check` (`scripts/check-cta.mjs`, 2026-08-04) — offline; every internal
  `/book` link in committed HTML must carry a non-empty `data-cta`, the blog
  chrome in `templates.mjs` must carry the same three, and `/book/` must still
  map all three Calendly postMessage names to Plausible events behind an origin
  check. Booking placement used to be INFERRED from ancestor classes in
  `js/analytics.js`, and inference fails silently in both directions: 16 links
  matched no region and fired NOTHING (the `/pricing/` FAQ strip, `/security/`,
  `/contact/`, `/404.html`, nine in-prose links), while `.hero__cta` — a shared
  CTA-ROW wrapper, not the hero — labelled 30 pre-footer `.final` CTAs, two
  page heroes and three `/work/marcus/` mid-page CTAs as `hero`. Only the
  homepage's was a hero. 176 links now carry one of 16 placements; run
  `npm run cta:stamp` to stamp new ones (it renders each page and applies a
  first-match rule list, so it sees what `closest()` sees). **The stamper walks
  committed HTML, NOT `STATIC_ROUTES`** — `/book/thanks/` is a `NOINDEX_ROUTES`
  entry carrying four booking links, and a `STATIC_ROUTES`-driven pass left
  every one unstamped while reporting success. `cta:check` is what caught that.
- `test:funnel` (`scripts/test-booking-funnel.mjs`) — needs Playwright, so it is
  NOT in `build:static`. Drives the real `/book/` listener from genuine
  cross-origin frames (request routing serves stubs AT `https://calendly.com`
  and `https://evil.example`, so `event.origin` is browser-stamped rather than
  forged) and asserts the funnel fires once per step, ignores every other
  origin and every malformed body, and leaks no invitee field into the props.
  Verified both ways: deleting the origin check fails it with a named
  assertion, not a stack trace.
- `meta:check` (`scripts/check-meta.mjs`, 2026-08-04) — offline, in `build:static`.
  Per page: title ≤ 60, description 110–155, canonical present, exactly one
  `<h1>`, and **`og:image` resolving to a real file on disk**. Lengths are
  measured DECODED, so `&amp;` counts as one character.
  - **The file-resolution check is the one that earns its place.** Eight pages
    shipped with a bespoke card sitting unused in `images/og/` while the HTML
    still pointed at the generic `/og-image.png` — `/careers/`, `/contact/`,
    `/guides/`, `/privacy/`, `/security/`, `/terms/`, plus `/work/marcus/` and
    `/services/builds/`, which pointed at a *different page's* card
    (`work.png`, `services.png`). Every one of them "had an og:image", so a
    presence-only check was green throughout. Presence was never the failure
    mode.
  - **It lints `/score/` too, which has no HTML in this repo.** That route is
    proxied (`lib/score-proxy.mjs`), so a file walk cannot see it — which is
    exactly why its title had drifted to 64 chars while `head:check` held every
    static page to 60. The proxy's exported constants are held to the same
    rules, and the check also asserts the injected `<meta>`/`<link>` tags are
    entity-escaped: they are appended with HTMLRewriter's `html: true`, which
    escapes nothing, and `SCORE_TITLE` ends "| Main & Machine". The ld+json in
    the same string is deliberately NOT escaped — script content is raw text,
    and escaping it would put a literal `&amp;` inside the JSON.
  - `EXEMPT` names `/404.html` for canonical and og:image, with reasons: a 404
    must not be indexed and Google discourages a canonical on one, and an error
    page is never deliberately shared.
- `jsonld:check` (`scripts/check-jsonld.mjs`) — validates all 69 ld+json blocks
  (1124 nodes) against the **real schema.org vocabulary**, building
  type → allowed-properties including inheritance. NOT in `build:static`: it
  downloads the ~1.5MB vocabulary on first run and caches it under
  `node_modules/.cache/`, and a deploy must never depend on schema.org being
  reachable.
  - **The parsing trap: the dump writes ids as `schema:Question`, not
    `https://schema.org/Question`.** Strip only the URL form and every type
    resolves as unknown — the first run reported **3,539 errors** including
    "unknown @type Question" and "unknown property name". A validator that
    fails everything is indistinguishable from a site that is broken
    everywhere; the giveaway is that the "errors" are all obviously-real
    schema.org terms.
  - Two findings are allowlisted with reasons in the file: `query-input` on
    `SearchAction` (Google's sitelinks-searchbox extension — in Google's docs
    and schema.org's Actions examples, but not a formal property, so every
    validator flags it; removing it turns the searchbox off) and an empty
    `blogPost` on `Blog` (only reachable with zero posts fetched, i.e. local dev
    under `ALLOW_EMPTY_BLOG=1` — `blog:build` fails the build on a zero-post
    index otherwise, so a deploy can never emit it).
- `shots:mobile` / `audit:mobile` (2026-08-04) — the mobile verification pass.
  Both need Playwright, so neither is in `build:static`. `shots:mobile` captures
  full-page screenshots of `/`, `/book/`, `/pricing/`, `/services/`, `/score/`
  at 390x844 and 768x1024 into `audit/mobile-shots/<label>/` and FAILS on any
  horizontal overflow; `audit:mobile` runs the 33-item checklist (hamburger,
  focus trap, tap targets, /book/ form, reveal.js, footer). Both accept
  `BASE_URL=` for a preview deploy.
  - **`/score/` is proxied**, so a plain static server 404s it and a harness
    that never looked at it would report green. The local server mirrors
    `functions/score/[[path]].js` for `/score/*`; if the upstream is down the
    route reports **SKIPPED**, never `ok`.
  - **`js/reveal.js` returns early on `navigator.webdriver`.** Under Playwright
    it never runs, so "is any content stuck hidden?" answers itself and the
    check is theatre. `audit:mobile` stubs `webdriver` to false in an init
    script, and asserts `.reveal` elements actually exist to prove the stub
    worked.
  - **Three of the first seven "failures" were the harness, not the site**, and
    each looked exactly like a real defect: the drawer is full-width so a click
    at (200,700) is *inside* it, not outside; the ROI slider sits ~8000px down
    and Playwright's mouse takes VIEWPORT coordinates, so dragging its
    boundingBox without scrolling drags empty space; and
    `getComputedStyle(el, "::-webkit-slider-thumb")` returns the HOST's box in
    Chromium (it reported the 304px track as the thumb). Check the instrument
    before filing the bug.
- `qa:matrix` (`scripts/qa-matrix.mjs`) — the design-system consistency matrix,
  rendered across every route at 1440/1024/768/375. Eight checks: two link
  treatments, two button variants on one 52px box, `padding-block:
  var(--section-y)` on every section bar the `SECTION_Y_EXEMPT` homepage hero,
  nothing under 11px, WCAG AA on every
  text/background pair, heading widows against the documented budget, one
  1160px container, and utility-bar + footer DOM identity across pages. Like
  `sweep:mobile` and `mono:check` it needs Playwright, so it is not in
  `build:static`. Two measurement traps it had to solve, both of which produce
  confident nonsense if you get them wrong:
  - **Resolve the background by the text's CENTRE POINT, not full-rect
    containment.** Full containment fails wherever a child is wider than its
    background ancestor — i.e. on every page that still has horizontal overflow
    at 375px — so the walk finds nothing, falls back to white, and reports a
    shelf of phantom failures (cream headings "on #ffffff" at 1.19:1 that are
    really cream on ink).
  - **STYLE B is selected by the ARROW, not by font-family.** Classifying on
    mono misreads every STYLE A link that sits inside a mono container: the
    footer's legal bar is mono, so its Privacy/Terms links looked like
    underlined STYLE B violations. Card TITLES that are links are excluded too
    — the affordance is the title, and underlining it is the wrong reading of
    "two link treatments".
- All guards skip `LOCAL_SCRATCH_DIRS` (`scripts/lib/config.mjs`) so a stale
  local copy of the site can't flood the checks with phantom failures — that
  noise is how people learn to ignore a red build.

**Mobile sweep is green (2026-08-02).** `npm run sweep:mobile` went from 254
failures to 0 across 43 routes × 320/390/430. One cause dominated, and it is
worth knowing because it looks like the layout is responding correctly when it
is not: **a grid or flex ITEM defaults to `min-width: auto`, so its track can
never be narrower than the item's min-content.** These layouts DID collapse to
one column on a phone; the track then stayed 290–409px wide inside a 280px
viewport because something unbreakable inside it — a pinned heading, a long
word, an email address — set the floor. The MOBILE TRACK RELEASE block at the
foot of `styles.css` sets `min-width: 0` on the children of every two-column
layout below 900px. The same bug, found separately, is why `.final .wrap` uses
`minmax(0, …)` tracks and why the contact card's value takes
`overflow-wrap: anywhere` (the only value that also lowers min-content).
The rest: the footer's legal link row was 318px of nowrap flex on all 43 routes,
the skip link was 42px against a 44px floor, and the press-strip outlets and
comparison-table row headers were 15px-tall inline links — all fixed with
padding that paints outside the line box, so no glyph moved.

**Chrome parity.** The utility bar and footer are duplicated by hand across the
static pages and generated by `scripts/lib/templates.mjs` for the blog, so they
drift silently — the blog shipped the RETIRED scrolling marquee, a footer with
the signup block in the wrong position, no `entity__stats`, a different legal
bar, and bare `→` characters that the arrow-normalisation pass never reached.
`qa:matrix`'s `chrome` column now compares footer and utility-bar DOM across all
43 routes and fails on any shape that is not the majority. Exceptions are named
in `CHROME_MINIMAL` in that script: `/privacy/`, `/terms/` and `/404.html` carry
a cut-down footer and no utility bar by existing design. Everything else — 40
routes — is one identical footer and one identical bar.

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
