// Autoresponder email sent to the person who booked an assessment.
//
// Same email constraints as the other templates in this folder:
//   • Table-based layout + inline styles ONLY. Do not refactor to modern CSS.
//   • Every link/image uses an ABSOLUTE URL (relative URLs break in email).
//   • Georgia serif fallback is intentional.
//
// This reaches the highest-intent reader the site has, during the 24-hour wait.
// Its job is the meeting, not the newsletter — so it carries, in order: the
// scheduler (prefilled, for anyone who would rather not wait), one measured
// proof line, the guarantee and the audit credit, and the price list. Every
// fact comes from COMPANY or the build log; nothing here is typed by hand.
// The blog is one quiet line at the bottom.

import { escapeHtml } from "./lib.js";
import { blogPicks, postUrl, SITE_ORIGIN } from "./blog-picks.js";
import { COMPANY } from "../src/data/company.mjs";
import { MARCUS } from "../src/data/proof.mjs";

const WORDMARK_URL = `${SITE_ORIGIN}/images/mm-wordmark-ink-trim.png`;

// The same scheduler /book/ embeds. Keep in sync with the data-cal-url on
// book/index.html — npm run test:book fails if the two ever drift apart.
export const CALENDLY_URL = "https://calendly.com/cmyers-mainandmachine/30min";

const INK = "#14110c";
const RUST = "#B83E22";
const PAPER = "#f4efe4";
const CARD = "#fbf8f1";
const TX = "#201c17";
const BODY = "#3f3a32";
const MUTE = "#6f675c";
const FAINT = "#978d7f";
const LINE = "rgba(32,28,23,0.14)";

// "Denver, CO" / "Phoenix, AZ" → "Denver" / "Phoenix" for the footer byline.
const CITIES = COMPANY.locations.map((l) => l.replace(/,\s*[A-Z]{2}$/, ""));

// Calendly prefills from query params, so the person lands on the calendar with
// their details already filled in rather than retyping what they just gave us.
export function schedulerUrl(data) {
  const q = new URLSearchParams();
  if (data && data.name) q.set("name", data.name);
  if (data && data.email) q.set("email", data.email);
  const qs = q.toString();
  return qs ? `${CALENDLY_URL}?${qs}` : CALENDLY_URL;
}

// One measured line, straight off the audit log. If the build log is not signed
// off, MARCUS.figures is empty and the proof line is omitted entirely — an
// unapproved number never ships, in an email least of all.
export function proofSentence() {
  const hours = MARCUS.figures["hours-returned"];
  const ids = MARCUS.figures["identifiers-out"];
  if (!hours || !ids) return null;
  const hrs = `${hours.value}${hours.unit ? ` ${hours.unit}` : ""}`;
  // "0 borrower identifiers" is the figure; "zero" is how a sentence says it.
  // Still bound to the data — a non-zero value would print as the number.
  const ident = ids.value === "0" ? "zero" : ids.value;
  return (
    `MARCUS, the AI back office we built for ${MARCUS.client}, returned ${hrs} of staff ` +
    `preparation in its ${MARCUS.measurementWindow}, with ${ident} borrower identifiers ` +
    `sent to an outside model.`
  );
}

export function renderAutoresponderHtml(data) {
  const first = escapeHtml(data.firstName || "there");
  const ref = escapeHtml(data.referenceId || "");
  const proof = proofSentence();
  const pick = blogPicks[0];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>Main &amp; Machine — your assessment request</title>
</head>
<body style="margin:0; padding:0; background:#3a352d; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">

  <!-- email preheader (hidden) -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">We reply within 24 hours — or pick a time now and skip the wait.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#3a352d;">
    <tr>
      <td align="center" style="padding:16px 12px 40px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background:${PAPER};">

          <!-- ===== masthead (ink) ===== -->
          <tr>
            <td style="background:${INK}; padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="height:4px; background:${RUST}; font-size:0; line-height:0;">&nbsp;</td></tr>
                <tr>
                  <td style="padding:30px 40px;">
                    <img src="${WORDMARK_URL}" width="252" height="27" alt="Main &amp; Machine" style="display:block; border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic;" />
                    <div style="margin-top:14px; font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#a59c8e;">Human-Centric AI for Main Street</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== greeting ===== -->
          <tr>
            <td style="padding:44px 40px 0;">
              <div style="font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:${FAINT};">The AI Opportunity Assessment</div>
              <h1 style="margin:18px 0 0; font-family:Georgia,'Times New Roman',serif; font-size:30px; line-height:1.15; font-weight:700; color:${TX}; letter-spacing:-0.01em;">Thanks, ${first}&nbsp;— you're in the queue.</h1>
              <p style="margin:20px 0 0; font-family:Georgia,'Times New Roman',serif; font-size:17px; line-height:1.6; color:${BODY};">We have your request. Christopher will reply from <a href="mailto:${escapeHtml(COMPANY.email)}" style="color:${RUST}; text-decoration:none;">${escapeHtml(COMPANY.email)}</a> <b style="color:${TX};">within 24 hours</b> to find a time that works — in whichever channel you preferred. No prep needed.</p>
            </td>
          </tr>

          <!-- ===== reference id chip ===== -->
          <tr>
            <td style="padding:28px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CARD}; border:1px solid ${LINE};">
                <tr>
                  <td style="padding:16px 22px; font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:${MUTE};">Your reference</td>
                  <td align="right" style="padding:16px 22px; font-family:'Space Mono',ui-monospace,monospace; font-size:14px; font-weight:700; letter-spacing:.06em; color:${RUST};">${ref}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== what happens next ===== -->
          <tr>
            <td style="padding:34px 40px 0;">
              <div style="font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:${MUTE}; padding-bottom:6px; border-bottom:1px solid ${LINE};">What happens next</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:18px 0 0; vertical-align:top; width:80px; font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:${RUST};">Now</td>
                  <td style="padding:18px 0 0; font-family:Georgia,serif; font-size:15px; line-height:1.5; color:${BODY};"><b style="color:${TX};">Request logged.</b> Your details are with a senior advisor — not a CRM funnel.</td>
                </tr>
                <tr>
                  <td style="padding:14px 0 0; vertical-align:top; font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:${RUST};">&lt;24 hrs</td>
                  <td style="padding:14px 0 0; font-family:Georgia,serif; font-size:15px; line-height:1.5; color:${BODY};"><b style="color:${TX};">We email you.</b> A short note proposing a few times that work.</td>
                </tr>
                <tr>
                  <td style="padding:14px 0 18px; vertical-align:top; font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:${RUST};">The call</td>
                  <td style="padding:14px 0 18px; font-family:Georgia,serif; font-size:15px; line-height:1.5; color:${BODY};"><b style="color:${TX};">Thirty focused minutes.</b> We walk your workflows and show you where AI pays — and where it doesn't.</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== want it sooner? (the one rust CTA) ===== -->
          <tr>
            <td style="padding:26px 40px 0;">
              <div style="font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:${MUTE};">Want it sooner?</div>
              <p style="margin:10px 0 18px; font-family:Georgia,serif; font-size:15px; line-height:1.6; color:${BODY};">Pick a time on the calendar and skip the back-and-forth. Your details are already filled in.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="background:${RUST};">
                  <a href="${escapeHtml(schedulerUrl(data))}" style="display:inline-block; padding:14px 26px; font-family:Georgia,'Times New Roman',serif; font-size:16px; font-weight:bold; color:#ffffff; text-decoration:none;">Pick a time now &rarr;</a>
                </td></tr>
              </table>
              <p style="margin:12px 0 0; font-family:'Space Mono',ui-monospace,monospace; font-size:12px; line-height:1.6; color:${MUTE};">Free. No obligation. No pitch.</p>
            </td>
          </tr>
${
  proof
    ? `
          <!-- ===== one proof line ===== -->
          <tr>
            <td style="padding:30px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CARD}; border:1px solid ${LINE};">
                <tr><td style="padding:20px 24px;">
                  <div style="font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:${MUTE};">What we build</div>
                  <p style="margin:10px 0 0; font-family:Georgia,serif; font-size:15px; line-height:1.6; color:${BODY};">${escapeHtml(proof)} <a href="${SITE_ORIGIN}/work/marcus/results/" style="color:${RUST}; text-decoration:none;">Read the measured results &rarr;</a></p>
                </td></tr>
              </table>
            </td>
          </tr>`
    : ""
}
          <!-- ===== guarantee + credit (ink) ===== -->
          <tr>
            <td style="padding:24px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${INK};">
                <tr><td style="padding:24px 28px;">
                  <div style="font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#a59c8e;">The guarantee</div>
                  <p style="margin:14px 0 0; font-family:Georgia,serif; font-size:15px; line-height:1.6; color:${PAPER};">${escapeHtml(COMPANY.guarantee)}</p>
                  <p style="margin:10px 0 0; font-family:Georgia,serif; font-size:15px; line-height:1.6; color:#c9c1b4;">${escapeHtml(COMPANY.rollover)}</p>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- ===== the price list ===== -->
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="margin:0; font-family:Georgia,serif; font-size:15px; line-height:1.6; color:${BODY};">Every price we charge is published, and the assessment is not a prerequisite for reading it: <a href="${SITE_ORIGIN}/pricing/" style="color:${RUST}; text-decoration:none;">the whole price list, no call required &rarr;</a></p>
            </td>
          </tr>

          <!-- ===== one quiet line for the blog ===== -->
          <tr>
            <td style="padding:26px 40px 34px;">
              <p style="margin:0; padding-top:18px; border-top:1px solid ${LINE}; font-family:'Space Mono',ui-monospace,monospace; font-size:12px; line-height:1.7; color:${MUTE};">
                Something to read while you wait: <a href="${postUrl(pick.slug)}" style="color:${RUST}; text-decoration:none;">${escapeHtml(pick.title)}</a>
              </p>
            </td>
          </tr>

          <!-- ===== footer ===== -->
          <tr>
            <td style="background:#ece5d6; padding:24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:'Space Mono',ui-monospace,monospace; font-size:10.5px; letter-spacing:.04em; color:${MUTE}; line-height:1.7;">
                    ${escapeHtml(COMPANY.name)} · ${CITIES.map(escapeHtml).join(" &amp; ")}<br />
                    <a href="mailto:${escapeHtml(COMPANY.email)}" style="color:${MUTE}; text-decoration:none;">${escapeHtml(COMPANY.email)}</a> · <a href="${escapeHtml(COMPANY.phoneHref)}" style="color:${MUTE}; text-decoration:none;">${escapeHtml(COMPANY.phone)}</a>
                  </td>
                  <td align="right" style="font-family:'Space Mono',ui-monospace,monospace; font-size:10.5px; letter-spacing:.04em; color:${FAINT}; vertical-align:bottom;">
                    <a href="${SITE_ORIGIN}/" style="color:${FAINT}; text-decoration:none;">${escapeHtml(COMPANY.domain)}</a>
                  </td>
                </tr>
              </table>
              <div style="margin-top:16px; padding-top:14px; border-top:1px solid ${LINE}; font-family:'Space Mono',ui-monospace,monospace; font-size:10px; letter-spacing:.04em; color:${FAINT};">
                You're receiving this because you requested an assessment at ${escapeHtml(COMPANY.domain)}. This is a one-time confirmation — not a subscription.
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

export function renderAutoresponderText(data) {
  const first = data.firstName || "there";
  const ref = data.referenceId || "";
  const proof = proofSentence();
  const pick = blogPicks[0];

  const lines = [
    `Thanks, ${first} — you're in the queue.`,
    "",
    `We have your request. Christopher will reply from ${COMPANY.email} within 24 hours`,
    "to find a time that works — in whichever channel you preferred. No prep needed.",
    "",
    `Your reference: ${ref}`,
    "",
    "WHAT HAPPENS NEXT",
    "  Now      — Request logged. Your details are with a senior advisor, not a CRM funnel.",
    "  <24 hrs  — We email you. A short note proposing a few times that work.",
    "  The call — Thirty focused minutes. We walk your workflows and show you where AI pays, and where it doesn't.",
    "",
    "WANT IT SOONER?",
    "Pick a time on the calendar and skip the back-and-forth. Your details are already filled in.",
    schedulerUrl(data),
    "Free. No obligation. No pitch.",
    "",
  ];

  if (proof) {
    lines.push(
      "WHAT WE BUILD",
      proof,
      `Read the measured results: ${SITE_ORIGIN}/work/marcus/results/`,
      ""
    );
  }

  lines.push(
    "THE GUARANTEE",
    COMPANY.guarantee,
    COMPANY.rollover,
    "",
    "Every price we charge is published, and the assessment is not a prerequisite",
    `for reading it — the whole price list, no call required: ${SITE_ORIGIN}/pricing/`,
    "",
    `Something to read while you wait: ${pick.title}`,
    postUrl(pick.slug),
    "",
    "—",
    `${COMPANY.name} · ${CITIES.join(" & ")} · ${COMPANY.email} · ${COMPANY.phone}`,
    `You're receiving this because you requested an assessment at ${COMPANY.domain}. This is a one-time confirmation — not a subscription.`
  );

  return lines.join("\n");
}
