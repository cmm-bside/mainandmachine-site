// Autoresponder email sent to the person who booked an assessment.
//
// This is a faithful, wired-up port of the reference design
// "Main & Machine - Autoresponder Email.html". Per that file's notes:
//   • Table-based layout + inline styles ONLY. Do not refactor to modern CSS.
//   • Every link/image uses an ABSOLUTE URL (relative URLs break in email).
//   • Georgia serif fallback is intentional.
// Dynamic values ({{first_name}}, {{reference_id}}) are injected below. The three
// "Read while you wait" posts come from ./blog-picks.js (edit that file to change them).

import { escapeHtml } from "./lib.js";
import { blogPicks, SITE_ORIGIN } from "./blog-picks.js";

const WORDMARK_URL = `${SITE_ORIGIN}/images/mm-wordmark-ink-trim.png`;
const CONTACT_EMAIL = "hello@mainandmachine.com";
const PHONE = "480-360-5128";

function postBlock(p, isFirst) {
  const url = `${SITE_ORIGIN}/blog/${p.slug}`;
  const thumbCell = p.thumb
    ? `<td width="132" style="width:132px; padding:0;">
                    <img src="${escapeHtml(p.thumb)}" width="132" height="108" alt="" style="display:block; width:132px; height:108px; border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic;" />
                  </td>`
    : `<td width="132" style="width:132px; padding:0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="height:108px; background:${escapeHtml(p.plate || "#14110c")};">
                      <tr><td align="center" valign="middle" style="font-family:'Space Mono',ui-monospace,monospace; font-size:14px; font-weight:700; color:#ec6c3d; letter-spacing:-0.04em;">M<span style="color:#f4efe4;">&amp;</span>M</td></tr>
                    </table>
                  </td>`;
  return `
          <tr>
            <td style="padding:${isFirst ? "22px" : "14px"} 40px 0;">
              <a href="${url}" style="text-decoration:none; color:inherit;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fbf8f1; border:1px solid rgba(32,28,23,0.14);">
                <tr>
                  ${thumbCell}
                  <td style="padding:16px 18px;">
                    <div style="font-family:'Space Mono',ui-monospace,monospace; font-size:9.5px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#c14a24;">${escapeHtml(p.category)}</div>
                    <div style="margin-top:7px; font-family:Georgia,serif; font-size:17px; font-weight:700; line-height:1.2; color:#201c17;">${escapeHtml(p.title)}</div>
                    <div style="margin-top:6px; font-family:Georgia,serif; font-size:13px; line-height:1.45; color:#6f675c;">${escapeHtml(p.blurb)}</div>
                  </td>
                </tr>
              </table>
              </a>
            </td>
          </tr>`;
}

export function renderAutoresponderHtml(data) {
  const first = escapeHtml(data.firstName || "there");
  const ref = escapeHtml(data.referenceId || "");
  const posts = blogPicks.map((p, i) => postBlock(p, i === 0)).join("");

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
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">A senior advisor will email you within 24 hours to schedule your free 30-minute assessment.</div>

  <!-- ===================== EMAIL BODY (600px) ===================== -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#3a352d;">
    <tr>
      <td align="center" style="padding:16px 12px 40px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background:#f4efe4;">

          <!-- ===== top rule + masthead (ink) ===== -->
          <tr>
            <td style="background:#14110c; padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:4px; background:#c14a24; font-size:0; line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:30px 40px;">
                    <img src="${WORDMARK_URL}" width="252" height="27" alt="Main &amp; Machine" style="display:block; border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic;" />
                    <div style="margin-top:14px; font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#a59c8e;">Human-Centric AI for Main Street</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== greeting / body ===== -->
          <tr>
            <td style="padding:44px 40px 8px;">
              <div style="font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#978d7f;">The AI Opportunity Assessment</div>
              <h1 style="margin:18px 0 0; font-family:Georgia,'Times New Roman',serif; font-size:30px; line-height:1.15; font-weight:700; color:#201c17; letter-spacing:-0.01em;">Thanks, ${first}&nbsp;— you're in the queue.</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 0;">
              <p style="margin:0; font-family:Georgia,'Times New Roman',serif; font-size:17px; line-height:1.6; color:#3f3a32;">We've got your request. A senior advisor will email you <b style="color:#201c17;">within 24 hours</b> to find a time that works for your free thirty-minute assessment — in whichever channel you preferred.</p>
              <p style="margin:18px 0 0; font-family:Georgia,'Times New Roman',serif; font-size:17px; line-height:1.6; color:#3f3a32;">No prep needed. Come as you are, ready to talk through how the work actually moves day to day.</p>
            </td>
          </tr>

          <!-- ===== reference id chip ===== -->
          <tr>
            <td style="padding:28px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fbf8f1; border:1px solid rgba(32,28,23,0.14);">
                <tr>
                  <td style="padding:16px 22px; font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:#6f675c;">Your reference</td>
                  <td align="right" style="padding:16px 22px; font-family:'Space Mono',ui-monospace,monospace; font-size:14px; font-weight:700; letter-spacing:.06em; color:#c14a24;">${ref}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== what happens (3 steps) ===== -->
          <tr>
            <td style="padding:34px 40px 0;">
              <div style="font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#6f675c; padding-bottom:6px; border-bottom:1px solid rgba(32,28,23,0.14);">What happens next</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:18px 0 0; vertical-align:top; width:80px; font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#c14a24;">Now</td>
                  <td style="padding:18px 0 0; font-family:Georgia,serif; font-size:15px; line-height:1.5; color:#3f3a32;"><b style="color:#201c17;">Request logged.</b> Your details are with a senior advisor — not a CRM funnel.</td>
                </tr>
                <tr>
                  <td style="padding:14px 0 0; vertical-align:top; font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#c14a24;">&lt;24 hrs</td>
                  <td style="padding:14px 0 0; font-family:Georgia,serif; font-size:15px; line-height:1.5; color:#3f3a32;"><b style="color:#201c17;">We email you.</b> A short note proposing a few times that work.</td>
                </tr>
                <tr>
                  <td style="padding:14px 0 18px; vertical-align:top; font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#c14a24;">The call</td>
                  <td style="padding:14px 0 18px; font-family:Georgia,serif; font-size:15px; line-height:1.5; color:#3f3a32;"><b style="color:#201c17;">Thirty focused minutes.</b> We walk your workflows and show you where AI pays — and where it doesn't.</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== READ WHILE YOU WAIT (blog, with thumbnails) ===== -->
          <tr>
            <td style="padding:14px 40px 0;">
              <div style="height:1px; background:rgba(32,28,23,0.14); font-size:0; line-height:0;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 40px 0;">
              <div style="font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#6f675c;">Read while you wait · The Ampersand</div>
              <p style="margin:10px 0 0; font-family:Georgia,serif; font-size:15px; line-height:1.55; color:#6f675c;">A few field notes on where AI actually earns its keep on Main Street.</p>
            </td>
          </tr>
${posts}

          <!-- read-more link -->
          <tr>
            <td style="padding:20px 40px 0;">
              <a href="${SITE_ORIGIN}/blog/" style="font-family:'Space Mono',ui-monospace,monospace; font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#c14a24; text-decoration:none;">All field notes&nbsp;→</a>
            </td>
          </tr>

          <!-- ===== closing note (ink panel) ===== -->
          <tr>
            <td style="padding:34px 40px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#14110c;">
                <tr>
                  <td style="padding:26px 28px;">
                    <div style="font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#a59c8e;">The promise</div>
                    <p style="margin:14px 0 0; font-family:Georgia,serif; font-size:15px; line-height:1.6; color:#a59c8e;">Free, with no obligation. You'll leave knowing what's worth doing and what isn't. <b style="color:#f4efe4;">Substance over sales.</b></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== footer ===== -->
          <tr>
            <td style="background:#ece5d6; padding:24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:'Space Mono',ui-monospace,monospace; font-size:10.5px; letter-spacing:.04em; color:#6f675c; line-height:1.7;">
                    Main &amp; Machine · Denver &amp; Phoenix<br />
                    <a href="mailto:${CONTACT_EMAIL}" style="color:#6f675c; text-decoration:none;">${CONTACT_EMAIL}</a> · <a href="tel:+14803605128" style="color:#6f675c; text-decoration:none;">${PHONE}</a>
                  </td>
                  <td align="right" style="font-family:'Space Mono',ui-monospace,monospace; font-size:10.5px; letter-spacing:.04em; color:#978d7f; vertical-align:bottom;">
                    <a href="${SITE_ORIGIN}" style="color:#978d7f; text-decoration:none;">mainandmachine.com</a>
                  </td>
                </tr>
              </table>
              <div style="margin-top:16px; padding-top:14px; border-top:1px solid rgba(32,28,23,0.14); font-family:'Space Mono',ui-monospace,monospace; font-size:10px; letter-spacing:.04em; color:#978d7f;">
                You're receiving this because you requested an assessment at mainandmachine.com. This is a one-time confirmation — not a subscription.
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
  const lines = [
    `Thanks, ${first} — you're in the queue.`,
    "",
    "We've got your request. A senior advisor will email you within 24 hours to find a time that works for your free thirty-minute assessment — in whichever channel you preferred.",
    "",
    "No prep needed. Come as you are, ready to talk through how the work actually moves day to day.",
    "",
    `Your reference: ${ref}`,
    "",
    "WHAT HAPPENS NEXT",
    "  Now      — Request logged. Your details are with a senior advisor, not a CRM funnel.",
    "  <24 hrs  — We email you. A short note proposing a few times that work.",
    "  The call — Thirty focused minutes. We walk your workflows and show you where AI pays, and where it doesn't.",
    "",
    "READ WHILE YOU WAIT — The Ampersand",
    ...blogPicks.map((p) => `  • ${p.title}\n    ${SITE_ORIGIN}/blog/${p.slug}`),
    `  All field notes: ${SITE_ORIGIN}/blog/`,
    "",
    "The promise: Free, with no obligation. You'll leave knowing what's worth doing and what isn't. Substance over sales.",
    "",
    "—",
    `Main & Machine · Denver & Phoenix · ${CONTACT_EMAIL} · ${PHONE}`,
    "You're receiving this because you requested an assessment at mainandmachine.com. This is a one-time confirmation — not a subscription.",
  ];
  return lines.join("\n");
}
