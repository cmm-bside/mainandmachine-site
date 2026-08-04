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
five booking events (`calendly_loaded`, `calendly_widget_viewed`,
`calendly_time_selected`, `calendly_booked`, `booking_form_submitted`), which
live in `book/index.html` next to the code they measure, and
`booking_details_added`, which lives in `book/thanks/index.html` for the same
reason (it measures the stage-2 form on that page).

**Calendly's payload is never forwarded.** `calendly.event_scheduled` carries
invitee and event URIs — and on some plans the invitee's answers — and none of
it reaches a prop; `calendly_booked` sends `{ page }` and nothing else. The URIs
are stashed in `sessionStorage` for the advisor to match a booking by hand, and
travel only to our own `/api` endpoint. `npm run test:funnel` asserts this by
sending a payload stuffed with a name, an email and a free-text answer and
failing if any of it appears in the props.

**Placement labels are markup, not inference.** Every internal `/book` link
carries `data-cta="<placement>"`; `js/analytics.js` reads it and falls back to
region inference only so a new link is never silently untracked.
`npm run cta:check` (in `build:static`) fails on an unstamped booking link;
`npm run cta:stamp` adds the attribute to new ones. This replaced pure
inference, which was wrong in both directions — 16 links fired nothing at all,
and `.hero__cta` (a shared CTA-row wrapper, not the hero) labelled 30
pre-footer CTAs, two page heroes and three mid-page CTAs as `hero`. Only the
homepage's was a hero. Historical `location` values before 2026-08-04 carry
that distortion; the prop key is unchanged, so the breakdown is continuous but
the pre-change `hero` bucket should be read as "hero + pre-footer + page hero".

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
| intent | `cta_book_click` | `page`, `location` (the link's own `data-cta`; + `score-report` from the app's report door) | any `/book` link clicked, anywhere | both |
| intent | `calendly_loaded` | `page` | the /book/ scheduler **iframe** fires `load` — our side of the embed | `book/index.html` |
| intent | `calendly_widget_viewed` | `page` | Calendly's `calendly.event_type_viewed` — **its** booking UI actually rendered. Once per page load. | `book/index.html` |
| intent | `calendly_time_selected` | `page` | Calendly's `calendly.date_and_time_selected` — a slot is picked but not confirmed. Once per page load. | `book/index.html` |
| intent | `booking_form_submitted` | `page` | /book/ fallback form accepted — the `ok` response, not the submit event (fires before the redirect to /book/thanks/) | `book/index.html` |
| engagement | `calculator_emailed` | `page`, `industry`, `team_band` | "Email me this estimate" submitted on /calculator/ or a guide worksheet. No email in the props. | `js/analytics.js` |
| booked | `booking_details_added` | `page` | stage-2 prep details accepted on /book/thanks/ (post-booking enrichment) | `book/thanks/index.html` |
| **booked** | `calendly_booked` | `page` (+ `band` from the app) | Calendly's `calendly.event_scheduled` postMessage — a real slot on the calendar | both |
| audience | `newsletter_subscribed` | `page` | any beehiiv subscribe form submitted (closest observable moment; beehiiv confirms in its own tab) | `js/analytics.js` |

Read rates as: `score_completed / score_started` (tool completion),
`calendly_booked / (calendly_loaded + booking_form_submitted)` (intent →
booked), `calendly_booked / unique visitors` (the number that matters).

## The booking funnel

    cta_book_click ──► calendly_widget_viewed ──► calendly_time_selected ──► calendly_booked
      intent            the scheduler rendered      a slot is picked          confirmed

Four steps, each a strict subset of the one before it, so every adjacent pair is
a rate you can act on:

- **`cta_book_click` → `calendly_widget_viewed`** is the page, not the
  scheduler: people asked to book and did not arrive at a working calendar.
  A wide gap here is a landing problem or a broken embed, not a copy problem.
  Break it down by `location` to see which placement sends traffic that leaves.
- **`calendly_widget_viewed` → `calendly_time_selected`** is availability.
  People saw the calendar and picked nothing — the usual cause is that the
  visible slots are too far out or too sparse, which is a calendar setting, not
  a website change.
- **`calendly_time_selected` → `calendly_booked`** is the last form. People
  chose a time and abandoned at the name/email/question step. This is the step
  worth the most per point recovered, and the only one where the embed's own
  fields are the lever.
- **`booking_form_submitted`** is a parallel bottom, not a step in this chain —
  it is the fallback form for people who never used the scheduler. Count it
  alongside `calendly_booked`, never inside the Calendly rates.

`calendly_loaded` sits deliberately outside the funnel: it says OUR iframe
loaded, `calendly_widget_viewed` says THEIR widget rendered inside it. Equal
counts is the healthy state. `calendly_loaded` materially exceeding
`calendly_widget_viewed` means the frame is mounting and the booking UI is not
coming up — an embed outage that no other event would show you, because a
visitor who never sees a calendar also never reaches any later step.

Each of the three Calendly events fires **at most once per page load**. Calendly
re-emits `event_type_viewed` whenever someone backs out of a slot to the
calendar, and our own prefill rebuild remounts the frame, which makes it fire
again; neither is a new visitor reaching that step, and an unlatched top against
a once-only bottom would understate every rate above.

## Plausible dashboard setup (manual, one-time)

1. Goals → add custom events: `cta_score_click`, `cta_book_click`,
   `score_started`, `score_completed`, `calculator_interacted`,
   `guide_read`, `calendly_loaded`, **`calendly_widget_viewed`**,
   **`calendly_time_selected`**, `booking_form_submitted`,
   `calendly_booked`, `newsletter_subscribed`, `calculator_emailed`,
   `booking_details_added`. Mark `calendly_booked` as the conversion.
2. Funnels (if on a plan with funnels): the booking funnel is
   `cta_book_click` → `calendly_widget_viewed` → `calendly_time_selected` →
   `calendly_booked`. The wider acquisition funnel is visit →
   `score_started` → `score_completed` → `cta_book_click` → `calendly_booked`.
   Add `location` as a custom property on `cta_book_click` to break the first
   step down by placement.
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
- [ ] /book/: load the page → `calendly_loaded` **and** `calendly_widget_viewed`
      (one each). Pick a date/time → exactly one `calendly_time_selected`; back
      out to the calendar and pick again → **no second** event of either name.
      Book a test slot → `calendly_booked` (cancel the booking after).
- [ ] /book/ console, origin guard — paste this and confirm nothing new appears
      in Realtime and the page does not redirect:
      `postMessage({event:'calendly.event_scheduled',payload:{invitee:{uri:'x'}}},'*')`
      (it posts from the page's own origin, not calendly.com, so it must be
      ignored). The automated version of this is `npm run test:funnel`, which
      drives real cross-origin frames.
- [ ] /book/: submit the fallback form → `booking_form_submitted`, then the
      /book/thanks/ redirect.
- [ ] /book/: book a slot in the embed → `calendly_booked`, then a redirect to
      `/book/thanks/?via=calendly` showing "You're booked" (not the 24-hour copy).
- [ ] /book/thanks/: submit the stage-2 prep form → `booking_details_added`.
- [ ] /book/thanks/?via=calendly (reached by booking in the embed, not by typing
      the URL): the prep form is **visible**, and submitting it fires the same
      `booking_details_added`. The POST carries `via:"calendly"` and the invitee
      URI instead of a reference id — Calendly does not expose the invitee's name
      or email to the parent window, so the internal email says the booking must
      be matched by hand. Same event, same props: no new event for this path.
- [ ] /calculator/: submit "Email me this estimate" → `calculator_emailed` with
      industry + band; confirm the POST body contains **no email address**.
- [ ] /score: land → pageview with `u` = the /score URL; start → `score_started`;
      finish → `score_completed` with `band` only (inspect the POST body —
      no answers, no email, no raw score).
- [ ] /score report: click the booking door → `cta_book_click`
      `{location:"score-report"}`.
- [ ] Realtime dashboard shows each event within ~30s of firing.
