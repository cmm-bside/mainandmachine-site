// "Email me this estimate" — sent when someone asks for a copy of the ROI
// calculator's output (or the worksheet version from guides 01 / 13).
//
// Same email constraints as the other templates in this folder:
//   • Table-based layout + inline styles ONLY. Do not refactor to modern CSS.
//   • Every link uses an ABSOLUTE URL (relative URLs break in email).
//   • Georgia serif fallback is intentional.
//
// This is not a gated download. The numbers are already on the page; this is a
// copy for the inbox, so the tone is "here's what you were looking at", never
// "thanks for your interest".
import { escapeHtml } from "./lib.js";
import { SITE_ORIGIN } from "./blog-picks.js";
import { COMPANY } from "../src/data/company.mjs";

const WORDMARK_URL = `${SITE_ORIGIN}/images/mm-wordmark-ink-trim.png`;
const INK = "#1A1511";
const RUST = "#B83E22";
const CREAM = "#EFE8D9";
const MUTE = "#5b5347";

export function estimateSubject(data) {
  return data.annual
    ? `Your estimate: ${data.annual} a year in manual work`
    : "Your estimate from the Main & Machine calculator";
}

function row(label, value) {
  if (!value) return "";
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #e3ddd0;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:${MUTE};">${escapeHtml(label)}</td>
    <td style="padding:10px 0;border-bottom:1px solid #e3ddd0;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:${INK};font-weight:bold;text-align:right;">${escapeHtml(value)}</td>
  </tr>`;
}

export function renderEstimateHtml(data) {
  const headline = data.annual
    ? `${escapeHtml(data.annual)} a year`
    : "Your estimate";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escapeHtml(estimateSubject(data))}</title></head>
<body style="margin:0;padding:0;background:${CREAM};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#F7F2E8;border:1px solid #e3ddd0;">

      <tr><td style="padding:28px 32px 0;">
        <img src="${WORDMARK_URL}" width="180" alt="Main &amp; Machine" style="display:block;border:0;width:180px;height:auto;" />
      </td></tr>

      <tr><td style="padding:24px 32px 0;">
        <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${MUTE};">The estimate you asked for</p>
        <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.15;color:${INK};font-weight:bold;">${headline}</p>
        <p style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:${MUTE};">
          That is a model of what repetitive manual work costs your team each year &mdash; not a quote, and not a promise. It is the same number you had on screen.
        </p>
      </td></tr>

      <tr><td style="padding:24px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row("Industry", data.industry)}
          ${row("Team size", data.team)}
          ${row("Hours per person, per week", data.hours)}
          ${row("Modelled annual cost", data.annual)}
        </table>
      </td></tr>

      <tr><td style="padding:22px 32px 0;">
        <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.6;color:${MUTE};">
          The assumptions behind it are published &mdash; every rate and multiplier, with the reasoning:
          <a href="${SITE_ORIGIN}/calculator/#assumptions" style="color:${RUST};">read the assumptions</a>.
          If any of them are wrong for your business, the number is wrong; change them and see.
        </p>
      </td></tr>

      <tr><td style="padding:24px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${INK};">
          <tr><td style="padding:22px 24px;">
            <p style="margin:0 0 8px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9a9286;">The guarantee</p>
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.6;color:#EFE8D9;">
              ${escapeHtml(COMPANY.guarantee)}
            </p>
            <p style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.6;color:#c9c1b4;">
              ${escapeHtml(COMPANY.rollover)}
            </p>
            <p style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.6;color:#9a9286;">
              In our shorthand: 100% of your ${escapeHtml(COMPANY.namedOffers.audit.replace(/^The /, ""))} fee credits toward your ${escapeHtml(COMPANY.namedOffers.sprint.replace(/^The /, ""))}, up to 25% of the Build&rsquo;s price.
            </p>
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:24px 32px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr><td style="background:${RUST};">
            <a href="${SITE_ORIGIN}/book/" style="display:inline-block;padding:14px 26px;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;">Book a free 30-minute assessment &rarr;</a>
          </td></tr>
        </table>
        <p style="margin:12px 0 0;font-family:'Courier New',monospace;font-size:12px;line-height:1.6;color:${MUTE};">
          Free. No obligation. No pitch. We reply within 24 hours.
        </p>
      </td></tr>

      <tr><td style="padding:26px 32px 30px;">
        <p style="margin:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.7;color:${MUTE};border-top:1px solid #e3ddd0;padding-top:18px;">
          Main &amp; Machine &middot; ${escapeHtml(COMPANY.email)} &middot; ${escapeHtml(COMPANY.phone)}<br />
          You asked for this estimate at ${SITE_ORIGIN}. We did not add you to anything.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

export function renderEstimateText(data) {
  const lines = [
    data.annual ? `Your estimate: ${data.annual} a year` : "Your estimate",
    "",
    "That is a model of what repetitive manual work costs your team each year -",
    "not a quote, and not a promise. It is the same number you had on screen.",
    "",
  ];
  if (data.industry) lines.push(`Industry: ${data.industry}`);
  if (data.team) lines.push(`Team size: ${data.team}`);
  if (data.hours) lines.push(`Hours per person, per week: ${data.hours}`);
  if (data.annual) lines.push(`Modelled annual cost: ${data.annual}`);
  lines.push(
    "",
    `Assumptions (every rate and multiplier): ${SITE_ORIGIN}/calculator/#assumptions`,
    "",
    "THE GUARANTEE",
    COMPANY.guarantee,
    COMPANY.rollover,
    `In our shorthand: 100% of your ${COMPANY.namedOffers.audit.replace(/^The /, "")} fee credits toward your ${COMPANY.namedOffers.sprint.replace(/^The /, "")}, up to 25% of the Build's price.`,
    "",
    `Book a free 30-minute assessment: ${SITE_ORIGIN}/book/`,
    "Free. No obligation. No pitch. We reply within 24 hours.",
    "",
    `Main & Machine · ${COMPANY.email} · ${COMPANY.phone}`,
    `You asked for this estimate at ${SITE_ORIGIN}. We did not add you to anything.`
  );
  return lines.join("\n");
}
