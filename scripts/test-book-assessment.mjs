// Local test + preview for the Book-an-Assessment flow.
//
//   npm run test:book              → validate a sample submission + write both
//                                    rendered emails (HTML + text) to emails/preview/
//   npm run test:book -- --send you@example.com
//                                  → ALSO send the two real emails via Resend
//                                    (needs RESEND_API_KEY in your env; the
//                                    autoresponder goes to the address you pass)
//
// This exercises the exact same modules the Cloudflare Function uses, so a green
// run here means the validation + templates are sound without spinning up Workers.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateSubmission, validateDetails,
  validateEstimate, makeReferenceId, firstNameOf, contactVia, formatStamp,
} from "../emails/lib.js";
import { renderAutoresponderHtml, renderAutoresponderText, CALENDLY_URL } from "../emails/assessment-autoresponder.js";
import { COMPANY } from "../src/data/company.mjs";
import { MARCUS } from "../src/data/proof.mjs";
import { renderEstimateHtml, renderEstimateText, estimateSubject } from "../emails/estimate.js";
import {
  renderInternalHtml, renderInternalText, internalSubject,
  renderDetailsHtml, renderDetailsText, detailsSubject,
} from "../emails/assessment-internal.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "emails", "preview");

// Stage 1 — the primary submit (phone optional when contact is Email).
const sample = {
  name: "Jordan Rivera",
  email: "jordan@riveraco.com",
  phone: "(555) 201-4400",
  contact: "Either",
  company: "Rivera & Co.",
  workflows: "Client intake is all manual — every new matter is a 40-minute copy/paste across three systems.\nBilling reconciliation eats a full day each month.",
  company_url: "", // honeypot, empty
  ts: String(Date.now() - 60000),
};

function fail(msg) { console.error("✗ " + msg); process.exitCode = 1; }
function pass(msg) { console.log("✓ " + msg); }

// 1. validation
const { ok, errors, data } = validateSubmission(sample);
if (!ok) { fail("sample failed validation: " + JSON.stringify(errors)); }
else { pass("sample passes server-side validation"); }

// a known-bad case
const bad = validateSubmission({ name: "", email: "nope", phone: "1", contact: "Phone", company: "", workflows: "" });
if (bad.ok) fail("invalid submission was wrongly accepted");
else pass(`invalid submission rejected (${Object.keys(bad.errors).length} field errors)`);

// conditional phone: Email preference needs no phone…
const noPhone = validateSubmission({ ...sample, phone: "", contact: "Email" });
if (!noPhone.ok) fail("email-preference submission without phone was wrongly rejected: " + JSON.stringify(noPhone.errors));
else pass("email-preference submission passes with no phone");

// …but Phone preference does.
const phonePref = validateSubmission({ ...sample, phone: "", contact: "Phone" });
if (phonePref.ok) fail("phone-preference submission without phone was wrongly accepted");
else pass("phone-preference submission without phone is rejected");

// Stage 2 — optional prep details appended to the submission.
const detailsSample = {
  stage: "details",
  referenceId: makeReferenceId(),
  name: sample.name,
  email: sample.email,
  company: sample.company,
  industry: "Professional services",
  team: "11–25",
  revenue: "$1M–$5M",
  website: "riveraco.com",
  heard: "A referral",
};
const det = validateDetails(detailsSample);
if (!det.ok) fail("details sample failed validation: " + JSON.stringify(det.errors));
else pass("details sample passes server-side validation");

const detEmpty = validateDetails({ stage: "details", referenceId: detailsSample.referenceId, email: sample.email });
if (detEmpty.ok) fail("empty details submission was wrongly accepted");
else pass("empty details submission rejected");

const detBadRef = validateDetails({ ...detailsSample, referenceId: "nope" });
if (detBadRef.ok) fail("details with bad reference id was wrongly accepted");
else pass("details with bad reference id rejected");

// --- the Calendly prep path -------------------------------------------------
// Someone who books in the embed has no reference id and no email: Calendly's
// postMessage carries only the invitee/event URIs. /book/thanks/ promises them
// a prep form, so the server has to accept that shape.
const calSample = {
  stage: "details",
  via: "calendly",
  calendlyInvitee: "https://api.calendly.com/scheduled_events/ABC123/invitees/DEF456",
  calendlyEvent: "https://api.calendly.com/scheduled_events/ABC123",
  bookedAt: "2026-08-01T17:04:11.000Z",
  industry: "Professional services",
  team: "11–25",
};
const cal = validateDetails(calSample);
cal.ok
  ? pass("details: Calendly booking accepted with no reference id and no email")
  : fail(`details: Calendly booking rejected — ${JSON.stringify(cal.errors)}`);

const calEmpty = validateDetails({ stage: "details", via: "calendly", calendlyInvitee: calSample.calendlyInvitee });
calEmpty.ok ? fail("details: empty Calendly submission wrongly accepted") : pass("details: empty Calendly submission rejected");

// via must be exactly 'calendly' — anything else still needs a real reference.
const calSpoof = validateDetails({ ...calSample, via: "whatever" });
calSpoof.ok ? fail("details: unknown `via` bypassed the reference requirement") : pass("details: unknown `via` still requires a reference id");

const calLong = validateDetails({ ...calSample, calendlyInvitee: "x".repeat(400) });
calLong.ok ? fail("details: over-long invitee URI accepted") : pass("details: over-long invitee URI rejected");

// The internal email must SAY it cannot be auto-matched, and carry the join key.
const calMeta = { referenceId: "", stamp: "1 Aug 2026, 11:04 MST" };
const calSubj = detailsSubject(cal.data);
const calHtml = renderDetailsHtml(cal.data, calMeta);
const calText = renderDetailsText(cal.data, calMeta);
calSubj.includes("Calendly") && !calSubj.includes("undefined")
  ? pass(`details email: Calendly subject reads honestly ("${calSubj}")`)
  : fail(`details email: bad Calendly subject ("${calSubj}")`);
calHtml.includes("DEF456") && calText.includes("DEF456")
  ? pass("details email: invitee URI present as the join key")
  : fail("details email: invitee URI missing — the booking cannot be matched");
calText.includes("no assessment reference") && calHtml.includes("no assessment reference")
  ? pass("details email: states plainly that there is no reference to match")
  : fail("details email: does not disclose the missing reference");
!/Reference:\s*$|\(undefined\)|Ref \./.test(calText)
  ? pass("details email: no empty reference artifacts")
  : fail("details email: prints a blank reference");

// 2. render
// --- stage 3: "email me this estimate" -------------------------------------
const estimateSample = {
  stage: "estimate",
  email: "jordan@rivera.co",
  industry: "Professional services",
  team: "24",
  hours: "6",
  annual: "$96,000",
  source: "/calculator/",
};
const est = validateEstimate(estimateSample);
est.ok ? pass("estimate: valid payload accepted") : fail(`estimate rejected: ${JSON.stringify(est.errors)}`);
const estBad = validateEstimate({ ...estimateSample, email: "nope" });
!estBad.ok && estBad.errors.email ? pass("estimate: bad email rejected") : fail("estimate: bad email should be rejected");
const estLong = validateEstimate({ ...estimateSample, industry: "x".repeat(200) });
!estLong.ok && estLong.errors.industry ? pass("estimate: over-long field rejected") : fail("estimate: over-long field should be rejected");
const estNoInputs = validateEstimate({ stage: "estimate", email: "jordan@rivera.co" });
estNoInputs.ok ? pass("estimate: email alone is enough (no gate)") : fail("estimate: email alone should be accepted");
const estSubj = estimateSubject(est.data);
estSubj.includes("$96,000") ? pass(`estimate: subject carries the number ("${estSubj}")`) : fail("estimate: subject missing the number");
const estHtml = renderEstimateHtml(est.data);
const estText = renderEstimateText(est.data);
estHtml.includes("$96,000") && estHtml.includes("/calculator/#assumptions") && estHtml.includes("90 days")
  ? pass("estimate HTML: number + assumptions link + guarantee present")
  : fail("estimate HTML: missing number, assumptions link, or guarantee");
estText.includes("$96,000") && estText.includes("/book/")
  ? pass("estimate text: number + booking link present")
  : fail("estimate text: missing number or booking link");
!/\shref="\/(?!\/)/.test(estHtml) ? pass("estimate HTML: no relative links") : fail("estimate HTML: relative link found (breaks in email)");

const now = new Date();
const referenceId = makeReferenceId(now);
const stamp = formatStamp(now);
const meta = { referenceId, stamp };
const emailData = { firstName: firstNameOf(data.name), referenceId, name: data.name, email: data.email };

pass(`reference id: ${referenceId}`);
pass(`contact via: ${contactVia(data)}`);

// --- the autoresponder ------------------------------------------------------
// This is the email that reaches the highest-intent reader on the site, during
// the 24-hour wait. Every load-bearing element is asserted here because there
// is no build guard for email bodies — the only thing standing between a broken
// autoresponder and a lead's inbox is this file.
const autoHtml = renderAutoresponderHtml(emailData);
const autoText = renderAutoresponderText(emailData);

// The scheduler must be the one /book/ actually embeds. Two copies of a URL
// drift; this fails the moment they do.
const bookHtml = fs.readFileSync(path.join(__dirname, "..", "book", "index.html"), "utf8");
const embedded = /data-cal-url="([^"]+)"/.exec(bookHtml);
embedded && embedded[1] === CALENDLY_URL
  ? pass(`scheduler URL matches the /book/ embed (${CALENDLY_URL})`)
  : fail(`scheduler URL drift: email has ${CALENDLY_URL}, /book/ embeds ${embedded ? embedded[1] : "nothing"}`);

for (const [label, body] of [["HTML", autoHtml], ["text", autoText]]) {
  const has = (needle) => body.includes(needle);
  has(CALENDLY_URL) ? pass(`autoresponder ${label}: scheduler link present`) : fail(`autoresponder ${label}: no scheduler link`);
  has(encodeURIComponent(sample.email))
    ? pass(`autoresponder ${label}: scheduler prefilled with the submitted email`)
    : fail(`autoresponder ${label}: scheduler is not prefilled`);
  has(COMPANY.guarantee) ? pass(`autoresponder ${label}: guarantee verbatim from COMPANY`) : fail(`autoresponder ${label}: guarantee missing or reworded`);
  has(COMPANY.rollover) ? pass(`autoresponder ${label}: audit credit verbatim from COMPANY`) : fail(`autoresponder ${label}: rollover missing or reworded`);
  has(COMPANY.email) ? pass(`autoresponder ${label}: reply address is canonical`) : fail(`autoresponder ${label}: canonical email missing`);
  has("/work/marcus/results/") ? pass(`autoresponder ${label}: proof link present`) : fail(`autoresponder ${label}: no link to the measured results`);
  has("/pricing/") ? pass(`autoresponder ${label}: price-list link present`) : fail(`autoresponder ${label}: no link to /pricing/`);
  // The proof line is data, not prose: it must carry the signed-off figure.
  const hours = MARCUS.figures["hours-returned"];
  if (MARCUS.signedOff) {
    has(hours.value) ? pass(`autoresponder ${label}: proof line carries the build-log figure`) : fail(`autoresponder ${label}: proof figure missing`);
  } else {
    !has("MARCUS,") ? pass(`autoresponder ${label}: unsigned build log → proof line withheld`) : fail(`autoresponder ${label}: shipped an unapproved figure`);
  }
}

// Blog links must carry the trailing slash; /blog/<slug> without it is a 308.
!/\/blog\/[a-z0-9-]+(?![a-z0-9-/])/.test(autoHtml.replace(/\/blog\/[a-z0-9-]+\//g, ""))
  ? pass("autoresponder HTML: every /blog/<slug>/ link has a trailing slash")
  : fail("autoresponder HTML: a /blog/<slug> link is missing its trailing slash");
!/\shref="\/(?!\/)/.test(autoHtml) ? pass("autoresponder HTML: no relative links") : fail("autoresponder HTML: relative link found (breaks in email)");
!autoHtml.includes("hello@mainandmachine.com") ? pass("autoresponder: no stale hello@ address") : fail("autoresponder: still carries the non-canonical hello@ address");

const files = {
  "estimate.html": estHtml,
  "estimate.txt": estText,
  "autoresponder.html": autoHtml,
  "autoresponder.txt": autoText,
  "internal.html": renderInternalHtml(data, meta),
  "internal.txt": renderInternalText(data, meta),
  "details.html": renderDetailsHtml(det.data, meta),
  "details.txt": renderDetailsText(det.data, meta),
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, body] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), body);
}
pass(`wrote ${Object.keys(files).length} preview files to emails/preview/`);
console.log("  internal subject: " + internalSubject(data));
console.log("  details subject:  " + detailsSubject(det.data));
console.log("\nOpen the previews:");
console.log("  open emails/preview/autoresponder.html");
console.log("  open emails/preview/internal.html");

// 3. optional live send
const sendIdx = process.argv.indexOf("--send");
if (sendIdx !== -1) {
  const to = process.argv[sendIdx + 1];
  const key = process.env.RESEND_API_KEY;
  if (!to) { fail("--send needs an email address: --send you@example.com"); process.exit(); }
  if (!key) { fail("RESEND_API_KEY not set; cannot send"); process.exit(); }
  const from = process.env.MAIL_FROM || "Main & Machine <hello@mainandmachine.com>";
  const notify = (process.env.LEAD_NOTIFY_TO || to).split(",").map((s) => s.trim());

  const send = async (payload) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    return res.json();
  };

  console.log(`\nSending live test emails (from ${from})…`);
  const [i, a] = await Promise.allSettled([
    send({ from, to: notify, reply_to: data.email, subject: internalSubject(data), html: files["internal.html"], text: files["internal.txt"] }),
    send({ from, to: [to], subject: "We've got your request — let's find a time", html: files["autoresponder.html"], text: files["autoresponder.txt"] }),
  ]);
  i.status === "fulfilled" ? pass(`internal sent (id ${i.value.id})`) : fail(`internal send failed: ${i.reason.message}`);
  a.status === "fulfilled" ? pass(`autoresponder sent to ${to} (id ${a.value.id})`) : fail(`autoresponder send failed: ${a.reason.message}`);
}
