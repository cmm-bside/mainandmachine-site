# SEO & AI-visibility monitoring — 15 minutes, monthly

Analytics on this site is **Plausible**, self-proxied (`/js/pa` → tracker,
`/api/event` → beacon) so ad-blockers that blanket-block `plausible.io` don't
blind it. There is **no Google Analytics**, which matters for two items below:
GA4 concepts like "channel groups" don't exist here, and the equivalent is a
saved filter.

---

## Before the first run — one-time setup (your side)

### 1. Google Search Console
1. https://search.google.com/search-console → **Add property** → **Domain** →
   `mainandmachine.com`.
2. Choose **DNS TXT** (verifies apex + www + every subdomain in one go).
   Cloudflare DNS → `mainandmachine.com` → **Add record**:
   `Type: TXT · Name: @ · Content: google-site-verification=<token>`
3. Verify. Then delete `google-site-verification-PLACEHOLDER.txt` from the repo.
4. **Sitemaps** → submit `https://www.mainandmachine.com/sitemap.xml`.
5. **Settings → Users** → add anyone else who needs access.

*(If you prefer the HTML-file method, GSC gives you a `google<hash>.html`;
drop it in the repo root, deploy, verify.)*

### 2. Bing Webmaster Tools
1. https://www.bing.com/webmasters → **Add site** →
   **Import from Google Search Console**. This is the fastest path and needs no
   file. If you verify manually instead, Bing gives you `BingSiteAuth.xml` —
   put it in the repo root and delete `BingSiteAuth-PLACEHOLDER.xml`.
2. Submit the same sitemap URL.
3. **IndexNow is already wired** — the key file is at the site root and
   `scripts/ping-indexnow.mjs` submits changed URLs after every deploy. Bing's
   IndexNow panel should show submissions within a day of the next deploy.
   Nothing to configure.

### 3. Plausible — the AI-referral segment
Plausible has no "channel group". The equivalent is a **saved segment** on the
Sources report:

1. Plausible → **mainandmachine.com** → **Sources** → **Referrers**.
2. Add filter → **Referrer** → **contains** → then add each of these as an
   OR term:
   `chatgpt.com`, `chat.openai.com`, `perplexity.ai`,
   `copilot.microsoft.com`, `claude.ai`, `gemini.google.com`
3. **Save as segment** → name it **AI assistants**.
4. Bookmark the segment URL with `?period=month`. That is your monthly view.
5. To see landing pages for AI traffic: with the segment applied, switch to
   **Top Pages → Entry pages**.

**Known limitation, worth understanding before you read the numbers:** several
assistants strip the referrer or render the citation client-side, so
AI-sourced sessions are **undercounted, not overcounted**. Treat the trend as
the signal, not the absolute. A month-over-month rise is real; "only 40
sessions" is a floor, not a ceiling.

---

## The monthly 15 minutes

### A. Google Search Console — 5 min
- **Page indexing**: any new *Not indexed* reasons since last month? The ones
  worth acting on are `Crawled – currently not indexed` (thin/duplicate signal)
  and `Alternate page with proper canonical tag` on a page you expected to
  index. Ignore counts on `/book/thanks/` — it is `noindex` by design.
- **Sitemaps**: status `Success`, discovered URL count roughly matches the
  route count. A drop means the build shipped a short sitemap.
- **Performance → Queries**, last 28 days: note the top 10 and anything new
  above ~20 impressions. Specifically watch the commercial heads —
  *ai consultant cost*, *private ai small business*, *ai consulting denver*.
- **Performance → Pages**: are the guide and build pages picking up
  impressions, or only the homepage?

### B. Bing Webmaster Tools — 3 min
- **Search performance**: same query check. Bing matters out of proportion to
  its share here because **ChatGPT search reads Bing's index**.
- **IndexNow**: submissions registering, no errors.
- **Site scan / SEO reports**: only act on things our own build guards don't
  already cover (they cover titles, descriptions, canonicals, JSON-LD, alt
  text, and internal 404s — see `npm run seo:regression`).

### C. AI-referral report — 2 min
- Open the saved **AI assistants** segment, period = last month.
- Record: total sessions, and the top 3 **entry pages**.
- The question to ask: *are assistants landing people on the pages we wrote for
  them* (`/guides/private-ai-for-small-business/`, `/guides/ai-consultant-cost/`,
  `/work/marcus/results/`) or only on the homepage?

### D. Conversion sanity check — 1 min
Plausible → **Goals**. These should all be non-zero in a normal month:

| Event | Fires on |
|---|---|
| `booking_form_submitted` | `/book/` fallback form submit |
| `calendly_booked` | Calendly booking completed |
| `calendly_loaded` | Scheduler iframe loaded |
| `roi_calculated` | First real interaction with the ROI calculator |

If `calendly_loaded` is healthy but `calendly_booked` is zero, the scheduler is
loading and nobody is finishing — that is a booking-flow problem, not an SEO one.

---

## The prompt spot-check — 4 min

Run these **six prompts** monthly, once each in **ChatGPT**, **Perplexity**, and
**Claude**. Use a fresh/logged-out session where you can — a personalised one
tells you about your own history, not about the model's default answer.

For each, record: **cited? (y/n)** · **prices correct?** · **what it said instead**.

1. `best AI consultant for a small business in Denver?`
2. `how much does an AI consultant cost?`
3. `Main & Machine reviews`
4. `private AI for a small business — what does it mean and who needs it?`
5. `can a small business run AI on its own server instead of ChatGPT?`
6. `AI consultant vs hiring an in-house AI engineer — which is cheaper?`

### What counts as a problem

| Finding | Severity | Action |
|---|---|---|
| Quotes a price that is **not** in `site-facts.json` | **High** | Check the page it cited. If our copy is right, the model is stale — re-ping IndexNow and re-check next month. If our copy is wrong, fix the facts file and run `npm run facts:render`. |
| Quotes the **retired** `$12,000–$45,000` sprint band | **High** | That band appears nowhere on the site and is a hard-fail token in `facts:check`. It means the model is citing a cached old page. Nothing to fix in the repo; note the date and watch it age out. |
| Cites a competitor for prompt 4 or 5 | **Medium** | Those are the prompts `/guides/private-ai-for-small-business/` was written to own. Check GSC impressions for that page. |
| Not cited anywhere, but facts are right | **Low** | Normal early state. Trend over months. |
| Describes us as something we are not (e.g. "an AI software product") | **Medium** | Check what `/llms.txt` and `/facts.json` say — those are the surfaces built for exactly this, and both are generated from `site-facts.json`. |

### Record it

Append one row per month to the table below. Three months of rows is worth more
than any single reading.

| Month | GSC clicks | Bing clicks | AI sessions | Top AI entry page | Cited (CGPT/PPLX/Claude) | Price errors |
|---|---|---|---|---|---|---|
| 2026-09 | | | | | | |

---

## What is already automated — do not re-check by hand

Every build runs these. If they pass, the corresponding class of SEO problem
does not exist and does not need a monthly look:

- `seo:regression` — one H1, unique titles ≤60, unique descriptions, canonical
  shape, og/twitter completeness, image alt + dimensions, orphan pages,
  apex/`http://` links, sitemap validity, RSS parse
- `jsonld:presence` — JSON-LD parses, Organization on every page, FAQPage only
  where the questions are visible, no dangling `@id`
- `numbers:check` — no non-canonical price or phone anywhere
- `links:check` — no internal link 404s
- `freshness:check` — visible "Updated" stamp matches JSON-LD `dateModified`
- `meta:check`, `head:check`, `facts:check`, `cities:check`, `crumbs:check`

Post-deploy, GitHub Actions also runs the smoke test, Lighthouse budgets
(desktop **and** mobile), and the IndexNow ping.
