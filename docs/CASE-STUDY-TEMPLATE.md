---
# Case-study front matter. Copy this file to docs/case-studies/<slug>.md and fill it.
# NOTHING HERE MAY BE INVENTED. Every figure must exist in data/build-log.json with
# signed_off: true before it can render — build-work.mjs withholds the whole figure
# set otherwise, which is the behaviour that keeps an unapproved number off the site.
client: ""                 # Legal name. Empty until written permission is on file.
client_named: false        # true only with written permission to name them.
industry: ""               # One of: professional-services | retail | healthcare | construction | hospitality
city: ""                   # "Denver, CO" or "Phoenix, AZ" — must match site-facts.json hubs.
sector_detail: ""          # e.g. "SBA 504 / CDFI lender". Shown in the hero statrail.
build_slug: ""             # Which /services/builds/<slug>/ this is an instance of.
measurement_window: ""     # e.g. "first 90 days of full-fleet operation". Renders verbatim.
verified_date: ""          # YYYY-MM-DD the figures were reconciled against the audit log.
signed_off: false          # Client's written approval on file. Gates every number below.
approval:
  who: ""                  # Name + role of the person who approved.
  when: ""                 # YYYY-MM-DD
  basis: ""                # What they saw: audit-log export, draft page, both.
metrics: []                # [{key, value, unit, desc, source}] — MIRRORS data/build-log.json.
                           # The JSON is the source of truth; this list is the editorial view.
quote:
  text: ""                 # Verbatim. Never tidied.
  attribution: ""
  permission: false        # Written sign-off on file, per the proof-shelf rule.
---

# <Headline: what it returned, not what it is>

## The problem
Where the days actually went, in the client's own terms. No solution language yet.

## What we built
Agent/automation/integration count, what it reads, where it runs. Trace every
capability claim to /security/ or the build page — do not invent architecture.

## Who stays in control
The human sign-off rule, stated plainly. Nothing sends, files, posts or pays
until a person approves it.

## The numbers
Rendered from data/build-log.json between BUILD-LOG markers — never typed into
the page. State the measurement window next to them, always.

## Read next
Link /security/, /guides/private-ai-for-small-business/, and the originating
/services/builds/<slug>/ page.

---
## Ship checklist
- [ ] `signed_off: true` and the approval block complete.
- [ ] Every figure present in data/build-log.json; page renders from markers.
- [ ] Quote has `permission: true` or the quote block is omitted entirely.
- [ ] Route added to STATIC_ROUTES, ALL_PAGES, CRUMB_LABELS.
- [ ] `npm run work:build && npm run crumbs:render && npm run jsonld:render && npm run facts:render`
- [ ] `npm run seo:regression` green (it will flag the page as an orphan until linked from /work/).
- [ ] OG card: `node scripts/build-og.mjs --only=/work/<slug>/`
