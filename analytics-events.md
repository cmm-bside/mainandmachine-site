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
booking events (`calendly_loaded`, `calendly_widget_viewed`,
`calendly_time_selected`, `calendly_booked`, `booking_form_submitted`,
`booking_form_failed`), which
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
| engagement | `score_report_opened` | `page`, `surface` | onscreen or persistent report rendered | Score app |
| lead | `score_report_requested` | `page` | report API accepts the request; delivery happens separately | Score app |
| recovery | `score_report_request_failed` | `page` | report request failed and can be retried | Score app |
| engagement | `calculator_interacted` | `page`, `industry`, `team_band` (1–10 · 11–25 · 26–50 · 51–100), `at` (`first-touch` · `cta-click`) | either ROI calculator. `first-touch` once per page load, debounced 400ms so a slider drag reports the SETTLED value; `cta-click` once more if they then click the calculator's own booking CTA, carrying the state they acted on. An untouched calculator fires neither. | `js/analytics.js` |
| engagement | `guide_read` | `page`, `guide` (slug) | 75% scroll depth on a `/guides/<slug>/` page, once | `js/analytics.js` |
| intent | `cta_book_click` | `page`, `location` (the link's own `data-cta`; + `score-results` or `score-report` from the app) | any `/book` link clicked, anywhere | both |
| intent | `calendly_opened` | `page` | visitor deliberately activates the calendar, once | `js/analytics.js` |
| intent | `booking_form_started` | `page` | first non-honeypot form input, once | `js/analytics.js` |
| recovery | `booking_form_failed` | `page` | fallback request fails; no successful lead event | `book/index.html` |
| intent | `calendly_loaded` | `page` | the /book/ scheduler **iframe** fires `load` — our side of the embed | `book/index.html` |
| intent | `calendly_widget_viewed` | `page` | Calendly's `calendly.event_type_viewed` — **its** booking UI actually rendered. Once per page load. | `book/index.html` |
| intent | `calendly_time_selected` | `page` | Calendly's `calendly.date_and_time_selected` — a slot is picked but not confirmed. Once per page load. | `book/index.html` |
| intent | `booking_form_submitted` | `page` | /book/ fallback form accepted — the `ok` response, not the submit event (fires before the redirect to /book/thanks/) | `book/index.html` |
| engagement | `calculator_emailed` | `page`, `industry`, `team_band` | "Email me this estimate" submitted on /calculator/ or a guide worksheet. No email in the props. | `js/analytics.js` |
| booked | `booking_details_added` | `page` | stage-2 prep details accepted on /book/thanks/ (post-booking enrichment) | `book/thanks/index.html` |
| **booked** | `calendly_booked` | `page` (+ `band` from the app) | Calendly's `calendly.event_scheduled` postMessage — a real slot on the calendar | both |
| audience | `newsletter_subscribed` | `page` | any beehiiv subscribe form submitted (closest observable moment; beehiiv confirms in its own tab) | `js/analytics.js` |

Read rates as: `score_completed / score_started` (tool completion),
`calendly_booked / calendly_widget_viewed` (scheduler completion), `calendly_booked / unique visitors` (the number that matters).

## Microsoft Ads UET (tag 343267453, added 2026-08-23)

Conversion tracking for Microsoft Advertising, feeding two goals. The base
tag (`bat.bing.net/bat.js`) loads from the foot of `js/analytics.js`, **gated
to `*.mainandmachine.com` hostnames** like the Score app's Plausible gate —
dev and previews never register a pageLoad or conversion. Off-host, `uetq`
stays a plain array and every push is inert. CSP: `bat.bing.net` +
`bat.bing.com` in script/img/connect-src (`_headers`).

**Unlike Plausible, UET sets cookies (MUID) and can feed remarketing
audiences.** Disclosed on /privacy/ ("Advertising measurement", the cookies
bullet, and Microsoft in the provider list). The no-PII contract applies
unchanged: labels are constant strings or page paths, never a payload field.

| Goal | UET event | Rides | Fires when |
|---|---|---|---|
| Book appointment | `book_appointment` | `calendly_booked` (`book/index.html`) | `calendly.event_scheduled`, inside the same origin check + once-latch |
| Submit lead form | `submit_lead_form` | `booking_form_submitted` (`book/index.html`) | the fallback form's `ok` response, not the submit attempt |
| Submit lead form | `submit_lead_form` | `calculator_emailed` (`js/analytics.js`) | any `.estimate-form` submit (/calculator/ + guide worksheets) |
| Submit lead form | `submit_lead_form` | `score_report_requested` (Score app, `lib/analytics.ts`) | report request accepted by the API; not email delivery |
| Book appointment | `book_appointment` | `calendly_booked` (Score app) | validated Calendly success message, once |

Deliberately NOT conversions: the beehiiv subscribe form (an audience, not a
lead), the careers application, and `booking_details_added` (stage-2
enrichment of a conversion already counted). A document-wide form listener
would have counted all three — that is why the pushes ride named events
instead of a generic `submit` hook.

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

Since 2026-08-04 the message behind `calendly_widget_viewed`
(`calendly.event_type_viewed`) is **also** what clears the "Loading the
scheduler…" placeholder — see CLAUDE.md → /book/ scheduler. The analytics are
unchanged: the Plausible event stays latched to once per page load, while the
placeholder clears on every paint, because a prefill rebuild is a real repaint
but not a new visitor reaching that step. Do not collapse the two.

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
   `booking_details_added`, `calendly_opened`, `booking_form_started`,
   `booking_form_failed`, `score_report_requested`,
   `score_report_request_failed`, `score_report_opened`. Mark `calendly_booked`
   as the appointment conversion; keep accepted requests separate.
2. Funnels (if on a plan with funnels): the booking funnel is
   `cta_book_click` → `calendly_widget_viewed` → `calendly_time_selected` →
   `calendly_booked`. The wider acquisition funnel is visit →
   `score_started` → `score_completed` → `cta_book_click` → `calendly_booked`.
   Add `location` as a custom property on `cta_book_click` to break the first
   step down by placement.
3. GA4 (Score app only): treat `score_complete` as engagement,
   `email_submit` as an accepted report request, and `report_calendly_booked`
   as a confirmed appointment. Review existing dashboard goal settings; code
   changes do not change previously configured key events.

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
- [ ] Homepage ROI band: drag the slider → one `calculator_interacted`
      `{at:"first-touch"}` ~400ms after you let go, carrying the band you
      SETTLED on (not the first pixel of the drag); move it again → **no
      second event**.
- [ ] /calculator/: change industry → `calculator_interacted`
      `{page:"/calculator/", at:"first-touch", …}`. Then change it again and
      click "Run your real numbers" → one more, `{at:"cta-click"}`, carrying
      the SECOND industry. Load the page and click that CTA without touching
      anything → **no** `calculator_interacted` at all (just `cta_book_click`).
- [ ] /calculator/ → click the CTA → the /book/ scheduler's "What is eating
      your team's time?" field reads "Ran the calculator: <industry>, ~N
      people." and is editable; a bare /book/ leaves it empty. Malformed
      (`?industry=notreal&team=25`, `?service=constructor`) shows nothing.
- [ ] /score report → click the booking door → /book/ field reads "Took the
      AI-Ready Score: <Phase> phase." Confirm the URL carries `phase` and
      **no numeric score**.
- [ ] /guides/ai-consultant-cost/: scroll to ~75% → one `guide_read`
      `{guide:"ai-consultant-cost"}`; keep scrolling → no repeat.
- [ ] Any footer: submit the newsletter form → `newsletter_subscribed`;
      confirm the POST body contains **no email**.
- [ ] /book/: load the page → no calendar events. Activate **Choose a time**
      → `calendly_loaded` **and** `calendly_widget_viewed`
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
      `{location:"score-report"}`, and the URL carries
      `ctx=score&phase=<map|prove|expand>` alongside the report UTMs.
- [ ] Realtime dashboard shows each event within ~30s of firing.

## Attribution and private report links

The static site keeps first-touch `utm_source`, `utm_medium`, `utm_campaign`,
and `utm_content` in session storage and appends them to public booking/Score
links. Only bounded campaign identifiers are accepted; names, emails, arbitrary
query text and report tokens are not persisted. A public Score phase may follow
the journey so the request and calendar retain context. Calendar inline and
direct links carry the same campaign identifiers. Existing destination values
and same-page anchors are preserved.

Persistent Score reports contain a capability token. Their HTTP and metadata
referrer policy is `origin`. Plausible redacts tokens in page URLs, referrers
and event/download props. GA and UET are not initialized for private report
URLs or token-bearing referrers, and explicit events repeat that guard. The
onscreen report remains on `/score/`; persistent reports are reached by ordinary
full-document email links. No client router transition enters a report route.
UET automatic SPA URL tracking is disabled; normal acquisition page loads and
explicit public funnel events remain enabled. Future use of a client router for
private reports requires revisiting automatic-provider privacy before shipping.

Accepted requests, confirmed calendar messages, delivered emails, CRM records
and sales are separate facts. Local tests validate requests and mock delivery
providers; they do not prove a live inbox receipt or closed sale.

## Workflow-plan offer

The website form is independent of Foundry. These events contain only the page path, the placement label for clicks, and a coarse category for submission issues. No workflow text, contact details, request IDs, tools, or email addresses are sent to analytics.

- `cta_plan_click`: visitor clicks an intake link to `/plan/`.
- `workflow_plan_sample_view`: visitor clicks a tagged sample link.
- `workflow_plan_started`: first interaction with the intake per page load.
- `workflow_plan_details`: advances to the contact step.
- `workflow_plan_submitted`: the backend confirms that both transactional messages were accepted by the email provider. This is not a plan-delivery or sales event. The same accepted request also emits the existing Microsoft Ads `submit_lead_form` conversion with `event_label: workflow_plan`.
- `workflow_plan_submit_issue`: a submit or step-advance attempt needs attention. Properties are only `page` and a fixed `reason`: `validation`, `expired`, `rejected`, or `unconfirmed`. `unconfirmed` includes lost responses and does not mean the request was rejected or that no email was sent. No field values, email addresses, request IDs, workflow text, or provider messages are included. This event is diagnostic, not a conversion; blocked or throwing analytics never changes the form state.

Compare accepted plan requests and resulting qualified bookings/projects, not just button clicks. Booking events remain separate. A refreshed successful confirmation page does not emit another conversion.
