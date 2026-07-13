# Analytics events — the one contract

Cookieless Plausible, served **first-party** so ad-blockers don't blind us:

- `/js/pa` → `functions/js/pa.js` (Pages Functions strip the extension from
  the route) proxies the site's Plausible tracker
  (`plausible.io/js/pa-Yipfpj7KIiywp6RYmahGL.js`, edge-cached 6h; upstream
  outage degrades to a no-op script, never a broken page).
- `/api/event` → `functions/api/event.js` proxies the beacon, forwarding the
  client IP (`X-Forwarded-For`) and User-Agent — that's all Plausible's
  cookieless unique-visitor hashing needs. No cookie, no fingerprint, no
  consent banner required.
- Every page calls `plausible.init({ endpoint: "/api/event",
  formSubmissions: false })` — auto "Form: Submission" is off because every
  form below has a named event; auto outbound-link and file-download events
  stay on.
- The Score app (ai-ready-score repo, served at `/score`) loads the same
  proxied script from the apex, gated to `*.mainandmachine.com` hostnames in
  production builds only — dev and Vercel previews never pollute stats.
  GA4 stays as the app's full-granularity stream; Plausible gets the funnel
  events below (mapping: `lib/analytics.ts` → `toPlausible()`).

**No-PII contract:** props carry only page paths, placement labels, slugs,
industry keys, and coarse bands (score band, headcount band). Never a name,
email, phone, free-text answer, raw score, or dollar output. Custom events
change ONLY by editing `js/analytics.js` (static site) or
`lib/analytics.ts` (Score app) — no inline one-offs, except the /book/ page's
booking trio which lives in `book/index.html` next to the code it measures.

## The funnel

    visit ──► tool engagement ──► booking intent ──► booked
    (pageviews)   score/calculator/guides   form or scheduler open   calendar slot taken

| Stage | Event | Props | Fires when | Source |
|---|---|---|---|---|
| visit | *(pageviews)* | — | every page, auto | pa script |
| engagement | `cta_score_click` | `page`, `location` (hero·ticker·nav·door·footer·calculator) | any `/score` link clicked in a known region | `js/analytics.js` |
| engagement | `score_started` | `page` | "Get my score" — first question shown | Score app |
| engagement | `score_completed` | `page`, `band` | assessment scored (band, never the number) | Score app |
| engagement | `calculator_interacted` | `page`, `industry`, `team_band` (1–10 · 11–25 · 26–50 · 51–100) | first touch of either ROI calculator, once per page load | `js/analytics.js` |
| engagement | `guide_read` | `page`, `guide` (slug) | 75% scroll depth on a `/guides/<slug>/` page, once | `js/analytics.js` |
| intent | `cta_book_click` | `page`, `location` (+ `score-report` from the app's report door) | any `/book` link clicked in a known region | both |
| intent | `calendly_loaded` | `page` | the /book/ inline scheduler iframe first renders | `book/index.html` |
| intent | `booking_form_submitted` | `page` | /book/ fallback form accepted (fires before the redirect to /book/thanks/) | `book/index.html` |
| **booked** | `calendly_booked` | `page` (+ `band` from the app) | Calendly's `calendly.event_scheduled` postMessage — a real slot on the calendar | both |
| audience | `newsletter_subscribed` | `page` | any beehiiv subscribe form submitted (closest observable moment; beehiiv confirms in its own tab) | `js/analytics.js` |

Read rates as: `score_completed / score_started` (tool completion),
`calendly_booked / (calendly_loaded + booking_form_submitted)` (intent →
booked), `calendly_booked / unique visitors` (the number that matters).

## Plausible dashboard setup (manual, one-time)

1. Goals → add custom events: `cta_score_click`, `cta_book_click`,
   `score_started`, `score_completed`, `calculator_interacted`,
   `guide_read`, `calendly_loaded`, `booking_form_submitted`,
   `calendly_booked`, `newsletter_subscribed`. Mark `calendly_booked` as
   the conversion.
2. Funnels (if on a plan with funnels): visit → `score_started` →
   `score_completed` → `cta_book_click` → `calendly_booked`.
3. GA4 (Score app only) is unchanged — `score_complete` stays the key event
   there; see `ai-ready-score/lib/analytics.ts` header for the custom
   dimensions list.

## Related decisions

- **Cloudflare Web Analytics (Insights)**: its auto-injected beacon is
  blocked by our own CSP on every page — it has never collected anything.
  Turn it off in the Cloudflare dashboard (Pages project → Metrics → Web
  Analytics) to kill the console noise; Plausible is the system of record.
- CSP still allowlists `plausible.io` in `script-src`/`connect-src`. Nothing
  references it directly anymore (everything is first-party); drop both
  after one release of clean Report-Only logs.
- The old event names `score_cta_click` / `book_cta_click` /
  `form_submitted` (pre-2026-07-13) are retired; historical dashboard data
  under those names ends at the rename.

## Manual browser test checklist

Open plausible.io → mainandmachine.com dashboard → "Realtime", plus DevTools
Network filtered to `/api/event`, then:

- [ ] Any page: request to `/js/pa` is 200 **from www.mainandmachine.com**
      (not plausible.io); a `pageview` POST to `/api/event` returns 202.
- [ ] With uBlock Origin ON: both requests still succeed (that's the proxy's
      whole job).
- [ ] Homepage: click the hero "Book a free assessment" → `cta_book_click`
      `{page:"/", location:"hero"}`. Repeat from nav, footer, ticker, door.
- [ ] Homepage ROI band: move the slider → one `calculator_interacted` with
      the industry + band; move it again → **no second event**.
- [ ] /calculator/: change industry → `calculator_interacted`
      `{page:"/calculator/", …}`.
- [ ] /guides/ai-consultant-cost/: scroll to ~75% → one `guide_read`
      `{guide:"ai-consultant-cost"}`; keep scrolling → no repeat.
- [ ] Any footer: submit the newsletter form → `newsletter_subscribed`;
      confirm the POST body contains **no email**.
- [ ] /book/: scroll to the scheduler → `calendly_loaded`; book a test slot
      → `calendly_booked` (cancel the booking after).
- [ ] /book/: submit the fallback form → `booking_form_submitted`, then the
      /book/thanks/ redirect.
- [ ] /score: land → pageview with `u` = the /score URL; start → `score_started`;
      finish → `score_completed` with `band` only (inspect the POST body —
      no answers, no email, no raw score).
- [ ] /score report: click the booking door → `cta_book_click`
      `{location:"score-report"}`.
- [ ] Realtime dashboard shows each event within ~30s of firing.
