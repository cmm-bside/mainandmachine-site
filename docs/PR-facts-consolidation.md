# Close the last gaps in the single source of truth, and guard every number

## Summary

The brief was to consolidate conflicting business facts into one canonical
module. **The consolidation already existed and I found no conflicting facts.**
This PR therefore does the part that was genuinely missing: it moves the last
two claims that had their own private source of truth into the facts file, and
adds the sweep guard that catches a half-finished repricing.

**No price, phone, email, or cadence VALUE changes. Zero HTML files change.**
Confirmed by `git status`: not one `.html` file is modified.

## What the audit actually found

I scanned all 44 rendered pages for every price-like and phone-like string —
104 distinct money tokens — and every canonical fact was already byte-identical
everywhere.

| Concern in the brief | Finding |
|---|---|
| `480-360-5128` as a second/tracking phone | **Zero occurrences in the repo.** Only `928-363-6639` (41 files) and `+1-928-363-6639` (39 files). Confirmed with you: one line, no tracking number |
| Sprint band `$12,000–$45,000` vs `$18,000–$60,000` | **`$12,000` appears in zero HTML files.** `$18,000–$60,000` on 27. The retired band was already a hard-fail token in `check-facts.mjs` |
| A stray `$45,000` in `pricing/index.html` | **Not a price claim** — it is inside a CSS comment describing grid alignment (`pricing/index.html:41`) |
| Blog cadence "weekly" vs "a few times a month" | **No conflict.** All 41 pages say "a few times a month". Every "weekly" hit is a MARCUS proof stat ("93% weekly adoption by week six") |
| Substack profile URL | **Does not exist.** The blog is beehiiv (The Ampersand). Not invented — a wrong `sameAs` is worse than a short one |
| `(480) 555-0123` in `careers/index.html` | An `<input placeholder>` format hint, not a claim |

So inconsistent AI-engine quoting is not being caused by conflicting source
facts. The likelier causes are stale crawls, or the guides' **market-context**
numbers (competitor rates, in-house salary comparisons) being misattributed as
our prices — a separate problem needing a separate fix.

## The four real gaps, and the fix

### 1. Blog cadence had its own source of truth

`BLOG_CADENCE` was a string literal in `scripts/lib/config.mjs`. It is a promise
about how often we publish, it appears in the footer kicker on 41 pages and in
`llms.txt`, and `facts:check` never saw it.

```diff
- export const BLOG_CADENCE = "a few times a month";
+ export const BLOG_CADENCE = COMPANY.blog.cadence;
```

Now `blog.cadence` in `src/data/site-facts.json`, alongside `blog.name`,
`blog.platform`, and `blog.subscribeUrl` (which was a second hardcoded beehiiv
URL in the same file).

### 2. Profile URLs lived in a template module

`PERSON_SAMEAS` / `ORG_SAMEAS` were array literals in
`scripts/lib/templates.mjs` — a claim about an entity, parked in the blog
pipeline's template file.

```diff
- const ORG_SAMEAS = [ "https://www.linkedin.com/company/main-and-machine/", … ];
- export const PERSON_SAMEAS = [ "https://www.linkedin.com/in/cmyers85/", … ];
+ const ORG_SAMEAS = COMPANY.sameAs.org;
+ export const PERSON_SAMEAS = COMPANY.sameAs.person;
```

All 8 founder profiles moved verbatim and in order (LinkedIn, X, Entrepreneur,
ASU faculty, Amazon author, bside.org, Forbes, Inc.). Order matters — the
existing ~40-page `sameAs` equality check depends on it. No Substack.

### 3. `priceRange` was hardcoded in 39 pages with no guard — the one real drift risk

```json
"priceRange": "$3,500–$60,000"
```

It is a **composite** (audit floor → sprint ceiling), so it is not any single
service price, and it lives inside a JSON string where no `data-fact` span can
go. Change the sprint ceiling in `site-facts.json` today and all 39 copies go
stale **with a green build**.

Fixed with the other half of the fact contract: `priceRange(COMPANY)` in
`scripts/lib/fact-values.mjs` derives it, and the new guard re-derives and
compares it on every page.

### 4. Nothing swept for numbers that were never stamped

`check-facts.mjs` proves the **stamped** spans are correct. A price typed
straight into a JSON-LD offer was never stamped, so it was never checked.

## New guard: `npm run numbers:check`

`scripts/check-numbers.mjs`, wired into `build:static` between `quarter:check`
and `security:check`.

| # | Rule | Scope |
|---|---|---|
| 1 | Phone must be canonical | **Everywhere.** There is exactly one number |
| 2 | Prices in structured price fields must be canonical | JSON-LD `price`/`priceRange`/`lowPrice`/`highPrice`, `data-fact` spans |
| 3 | `priceRange` must equal the derived composite | Everywhere |
| 4 | No near-miss ranges | **Everywhere, incl. prose.** A range pairing a canonical endpoint with a non-canonical one (`$18,000–$45,000`), or two canonical prices in a band we don't publish (`$8,500–$18,000`) |
| 5 | No retired tokens | **Everywhere.** `$12,000–$45,000` |

### Why it does not fail on every price

A check that failed on "any price not in `site-facts.json`" fires on **104
tokens, ~95 of them legitimate** — the guides' competitor comparisons
(`$130,000–$200,000` for an in-house hire), ROI worked examples, per-million
token costs (`$25.20`). Failing those trains people to ignore the build.

So editorial prose is **counted and reported, never failed** (currently 363
mentions, printed on every run so the scope is visible rather than silent).
Rule 4 is what actually catches a repricing: a half-updated range is a
canonical endpoint next to a stale one, and that is detectable without knowing
which prose numbers are ours.

Two calibration errors were caught during development and are worth knowing:
meta descriptions and FAQ `acceptedAnswer` text are **prose that sits in the
head** — `/guides/chatgpt-vs-custom-ai/` legitimately describes ChatGPT's own
`$20–$30/month` there. Failing those said "your meta description is lying about
your pricing" about an accurate sentence describing somebody else's product.

### Verified by negative test, not by reading the source

| Injected | Result |
|---|---|
| `480-360-5128` | caught — rule 1 |
| `$12,000–$45,000` | caught — rule 5 |
| `$18,000–$45,000` | caught — rule 4 (half-updated) |
| `$8,500–$18,000` | caught — rule 4b (unpublished pairing) |
| `"priceRange":"$3,500–$8,500"` | caught — rule 3, independently |
| `"price":"$7,000"` in JSON-LD | caught — rule 2 |
| `$130,000–$200,000` + `$25.20` (market context) | correctly **not** failed |
| `placeholder="(480) 555-0123"` | correctly **not** failed |

Plus a cadence guard added to `check-facts.mjs`: injecting
`The Ampersand · free, weekly` into `contact/index.html` fails with a named
assertion; the file was restored and the tree is clean. It is scoped to the
publication's name, because a bare search for "weekly" hits the MARCUS proof
figures on five pages — those are measurements, not publishing promises.

## Bootstrap bug fixed along the way

`render-facts.mjs` **generates** `src/data/company.mjs`, but imported `ROOT`
from `config.mjs`, which re-exports `COMPANY` from that same generated file.
Adding any new facts key that `config.mjs` reads therefore crashed the
generator at import time on its own stale output —
`TypeError: Cannot read properties of undefined (reading 'name')` — with no way
out but hand-editing a DO-NOT-EDIT file. `ROOT` is now defined locally. **The
generator imports nothing generated.**

## Files changed

| File | Change |
|---|---|
| `src/data/site-facts.json` | **+ `blog` and `sameAs` blocks**, with maintainer notes |
| `src/data/company.mjs` | regenerated (DO NOT EDIT) |
| `scripts/lib/fact-values.mjs` | **+ `priceRange()`, `phoneForms()`** |
| `scripts/lib/config.mjs` | `BLOG_NAME` / `BLOG_CADENCE` / `BEEHIIV_SUBSCRIBE_FALLBACK` now read `COMPANY` |
| `scripts/lib/templates.mjs` | `ORG_SAMEAS` / `PERSON_SAMEAS` now read `COMPANY` |
| `scripts/check-facts.mjs` | **+ blog-cadence guard** |
| `scripts/render-facts.mjs` | local `ROOT` — breaks the bootstrap cycle |
| `scripts/check-numbers.mjs` | **new** |
| `package.json` | `numbers:check` script + wired into `build:static` |
| `llms.txt`, `facts.json` | regenerated |

## Diff summary: pages whose visible copy or meta tags changed

**None.** `facts:render` reports `437 fact span(s) verified · 0 file(s) updated`.
No `.html` file is modified in this PR.

Two generated text artifacts change:

- **`llms.txt`** — the auto-stamped `Last updated` date only (`2026-08-06` →
  `2026-08-09`). No fact text changes.
- **`facts.json`** — **gains** the `blog` and `sameAs` blocks (+22 lines). This
  is the endpoint that exists to feed canonical facts to AI agents, so
  publishing cadence and verified profile URLs there is a net gain for exactly
  the ChatGPT/Perplexity problem that prompted this work. Verified that the
  `_blog_note` / `_sameAs_note` maintainer keys are correctly **stripped** from
  the public output.

## Build status

All 14 `build:static` guards pass:
`seo` `facts` `llms` `head` `tokens` `css` `placeholders` `book` `cta` `meta`
`quarter` **`numbers`** `security` — plus `test:book`.

`links:check` fails locally with **15 dangling `/blog/<slug>/` links and zero
other failures**. That is the documented no-`BEEHIIV_API_KEY` state: the local
blog builds with 0 posts while committed pages link to the 15 live essays. It
is unrelated to this change and resolves on deploy, where the fetch runs.

## Follow-ups not taken here

- `/privacy/` and `/terms/` carry no JSON-LD at all — the only indexable pages
  missing the entity graph. Out of scope for a facts-consolidation PR.
- If AI engines are still quoting odd numbers after this ships, the next place
  to look is the guides' market-context tables, not the facts file. Marking
  those up so a machine can tell "what an in-house hire costs" from "what we
  charge" is a content-structure change, not a constants change.
