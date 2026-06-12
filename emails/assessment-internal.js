// Internal notification email — sent to the M&M team when someone books an assessment.
// Reply-To is set (in the handler) to the submitter's email, so a reply goes
// straight to the lead. Table-based + inline styles for consistency/safety.

import { escapeHtml, FIELDS, DETAIL_FIELDS, contactVia } from "./lib.js";

const SITE_ORIGIN = "https://www.mainandmachine.com";

// Which fields to show as a readable summary, in order. We render every submitted
// field; empty optional fields show an em-dash.
function rows(data, fields = FIELDS) {
  return fields.map((f) => {
    let val = data[f.key];
    if (f.key === "website" && val) {
      const href = /^https?:\/\//i.test(val) ? val : `https://${val}`;
      val = `<a href="${escapeHtml(href)}" style="color:#c14a24; text-decoration:none;">${escapeHtml(data[f.key])}</a>`;
    } else if (f.key === "email" && val) {
      val = `<a href="mailto:${escapeHtml(val)}" style="color:#c14a24; text-decoration:none;">${escapeHtml(data[f.key])}</a>`;
    } else if (f.key === "phone" && val) {
      val = `<a href="tel:${escapeHtml(val.replace(/[^0-9+]/g, ""))}" style="color:#c14a24; text-decoration:none;">${escapeHtml(data[f.key])}</a>`;
    } else {
      val = val ? escapeHtml(val).replace(/\n/g, "<br />") : "—";
    }
    return `
                <tr>
                  <td valign="top" style="padding:11px 16px; width:200px; border-bottom:1px solid rgba(32,28,23,0.10); font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#6f675c;">${escapeHtml(f.label)}</td>
                  <td valign="top" style="padding:11px 16px; border-bottom:1px solid rgba(32,28,23,0.10); font-family:Georgia,serif; font-size:15px; line-height:1.5; color:#201c17;">${val}</td>
                </tr>`;
  }).join("");
}

export function renderInternalHtml(data, meta) {
  const ref = escapeHtml(meta.referenceId || "");
  const stamp = escapeHtml(meta.stamp || "");
  const via = escapeHtml(contactVia(data));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>New assessment request</title>
</head>
<body style="margin:0; padding:0; background:#3a352d;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(data.company)} — preferred contact ${via}. Ref ${ref}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#3a352d;">
    <tr>
      <td align="center" style="padding:16px 12px 40px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background:#f4efe4;">

          <tr>
            <td style="background:#14110c; padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="height:4px; background:#c14a24; font-size:0; line-height:0;">&nbsp;</td></tr>
                <tr>
                  <td style="padding:26px 32px;">
                    <div style="font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#a59c8e;">New assessment request</div>
                    <div style="margin-top:8px; font-family:Georgia,serif; font-size:24px; font-weight:700; color:#f4efe4; letter-spacing:-0.01em;">${escapeHtml(data.company)}</div>
                    <div style="margin-top:6px; font-family:Georgia,serif; font-size:15px; color:#a59c8e;">${escapeHtml(data.name)} · preferred contact: <span style="color:#ec6c3d;">${via}</span></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fbf8f1; border:1px solid rgba(32,28,23,0.14);">
                <tr>
                  <td style="padding:14px 16px; font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#6f675c;">Reference <b style="color:#c14a24;">${ref}</b></td>
                  <td align="right" style="padding:14px 16px; font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.04em; color:#978d7f;">${stamp}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(32,28,23,0.14); background:#ffffff;">
${rows(data)}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 32px 30px;">
              <p style="margin:0; font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.04em; line-height:1.7; color:#6f675c;">Reply to this email to reach ${escapeHtml(data.name)} directly — Reply-To is set to their address. Submitted via <a href="${SITE_ORIGIN}/book/" style="color:#c14a24; text-decoration:none;">mainandmachine.com/book</a>.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderInternalText(data, meta) {
  const out = [
    `NEW ASSESSMENT REQUEST — ${data.company} (${data.name})`,
    `Reference: ${meta.referenceId}`,
    `Submitted: ${meta.stamp}`,
    "",
    ...FIELDS.map((f) => `${f.label}: ${data[f.key] || "—"}`),
    "",
    "Reply to this email to reach the lead directly (Reply-To is set to their address).",
    `Submitted via ${SITE_ORIGIN}/book/`,
  ];
  return out.join("\n");
}

export function internalSubject(data) {
  return `New assessment request — ${data.company} (${data.name})`;
}

// --- Stage-2 follow-up: optional prep details, appended to an existing lead. ---
// Sent as a second internal email carrying the same reference id so the thread
// is easy to reconcile; the lead itself already landed with the stage-1 email.

export function renderDetailsHtml(data, meta) {
  const ref = escapeHtml(meta.referenceId || data.referenceId || "");
  const stamp = escapeHtml(meta.stamp || "");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>Assessment prep details</title>
</head>
<body style="margin:0; padding:0; background:#3a352d;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(data.company)} added prep details. Ref ${ref}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#3a352d;">
    <tr>
      <td align="center" style="padding:16px 12px 40px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background:#f4efe4;">

          <tr>
            <td style="background:#14110c; padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="height:4px; background:#c14a24; font-size:0; line-height:0;">&nbsp;</td></tr>
                <tr>
                  <td style="padding:26px 32px;">
                    <div style="font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#a59c8e;">Prep details added</div>
                    <div style="margin-top:8px; font-family:Georgia,serif; font-size:24px; font-weight:700; color:#f4efe4; letter-spacing:-0.01em;">${escapeHtml(data.company)}</div>
                    <div style="margin-top:6px; font-family:Georgia,serif; font-size:15px; color:#a59c8e;">${escapeHtml(data.name)} · appended to reference <span style="color:#ec6c3d;">${ref}</span></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fbf8f1; border:1px solid rgba(32,28,23,0.14);">
                <tr>
                  <td style="padding:14px 16px; font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#6f675c;">Reference <b style="color:#c14a24;">${ref}</b></td>
                  <td align="right" style="padding:14px 16px; font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.04em; color:#978d7f;">${stamp}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(32,28,23,0.14); background:#ffffff;">
${rows(data, DETAIL_FIELDS)}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 32px 30px;">
              <p style="margin:0; font-family:'Space Mono',ui-monospace,monospace; font-size:11px; letter-spacing:.04em; line-height:1.7; color:#6f675c;">Optional details ${escapeHtml(data.name)} added after submitting. File with the original request — same reference id. Submitted via <a href="${SITE_ORIGIN}/book/" style="color:#c14a24; text-decoration:none;">mainandmachine.com/book</a>.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderDetailsText(data, meta) {
  const out = [
    `ASSESSMENT PREP DETAILS — ${data.company} (${data.name})`,
    `Reference: ${meta.referenceId || data.referenceId}`,
    `Submitted: ${meta.stamp}`,
    "",
    ...DETAIL_FIELDS.map((f) => `${f.label}: ${data[f.key] || "—"}`),
    "",
    "Optional details added after the original request — file with the same reference id.",
    `Submitted via ${SITE_ORIGIN}/book/`,
  ];
  return out.join("\n");
}

export function detailsSubject(data) {
  return `Prep details added — ${data.company} (${data.referenceId})`;
}
