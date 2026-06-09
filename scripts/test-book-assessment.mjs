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
  validateSubmission, makeReferenceId, firstNameOf, contactVia, formatStamp,
} from "../emails/lib.js";
import { renderAutoresponderHtml, renderAutoresponderText } from "../emails/assessment-autoresponder.js";
import { renderInternalHtml, renderInternalText, internalSubject } from "../emails/assessment-internal.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "emails", "preview");

const sample = {
  name: "Jordan Rivera",
  email: "jordan@riveraco.com",
  phone: "(480) 360-5128",
  contact: "Either",
  company: "Rivera & Co.",
  website: "riveraco.com",
  industry: "Professional services",
  team: "11 – 25",
  revenue: "$1M – $5M",
  workflows: "Client intake is all manual — every new matter is a 40-minute copy/paste across three systems.\nBilling reconciliation eats a full day each month.",
  heard: "A referral",
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
const bad = validateSubmission({ name: "", email: "nope", phone: "1", company: "", industry: "", team: "", workflows: "" });
if (bad.ok) fail("invalid submission was wrongly accepted");
else pass(`invalid submission rejected (${Object.keys(bad.errors).length} field errors)`);

// 2. render
const now = new Date();
const referenceId = makeReferenceId(now);
const stamp = formatStamp(now);
const meta = { referenceId, stamp };
const emailData = { firstName: firstNameOf(data.name), referenceId };

pass(`reference id: ${referenceId}`);
pass(`contact via: ${contactVia(data)}`);

const files = {
  "autoresponder.html": renderAutoresponderHtml(emailData),
  "autoresponder.txt": renderAutoresponderText(emailData),
  "internal.html": renderInternalHtml(data, meta),
  "internal.txt": renderInternalText(data, meta),
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, body] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), body);
}
pass(`wrote ${Object.keys(files).length} preview files to emails/preview/`);
console.log("  internal subject: " + internalSubject(data));
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
