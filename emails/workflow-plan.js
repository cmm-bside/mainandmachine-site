// Transactional emails for the website Workflow Plan. No Foundry dependency.
// Keep the payload deterministic: provider idempotency compares the whole batch.
import { escapeHtml } from "./lib.js";
import { COMPANY } from "../src/data/company.mjs";

export const WORKFLOW_TYPES = Object.freeze({
  leads: "Leads and follow-up",
  operations: "Day-to-day operations",
  reporting: "Reporting and visibility",
  documents: "Documents and information",
  other: "Another workflow",
});

const REVIEW_HOURS = COMPANY.workflowPlan.reviewWithinHours;
const text = (value) => escapeHtml(value || "").replace(/\n/g, "<br />");

export function workflowPlanDeadline(submittedAt) {
  return new Date(Date.parse(submittedAt) + REVIEW_HOURS * 60 * 60 * 1000).toISOString();
}

export function workflowPlanStamp(iso) {
  // Explicit locale/time zone make the body stable across regions and retries.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(new Date(iso));
}

function rows(data, deadlineAt, internal) {
  return [
    ["Request ID", data.requestId],
    ["Plan due", `${workflowPlanStamp(deadlineAt)} (${deadlineAt})`],
    ["Workflow", WORKFLOW_TYPES[data.workflowType]],
    ["What you described", data.workflow],
    ["Current tools", data.tools || "Not provided"],
    ["How often", data.frequency || "Not provided"],
    ["Company", data.company],
    ...(internal ? [["Name", data.name], ["Email", data.email], ["Website", data.website || "Not provided"], ["Submitted", data.submittedAt]] : []),
  ];
}

function shell(title, intro, values, ending) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#DDD3C3;color:#201C17;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#DDD3C3;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FAF8F3;">
<tr><td style="padding:28px 24px;background:#14110C;border-top:4px solid #B83E22;color:#FAF8F3;font-family:Arial,sans-serif;font-size:20px;font-weight:700;">Main &amp; Machine</td></tr>
<tr><td style="padding:28px 24px 20px;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;">
<h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#201C17;">${escapeHtml(title)}</h1><p style="margin:0;">${intro}</p></td></tr>
<tr><td style="padding:0 24px;"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #B8AA96;background:#FFFDF8;">
${values.map(([label, value]) => `<tr><th scope="row" align="left" valign="top" style="width:30%;padding:12px;border-bottom:1px solid #DDD3C3;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#5F5547;">${escapeHtml(label)}</th><td valign="top" style="padding:12px;border-bottom:1px solid #DDD3C3;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;overflow-wrap:anywhere;word-break:break-word;">${text(value)}</td></tr>`).join("\n")}
</table></td></tr>
<tr><td style="padding:24px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;">${ending}</td></tr>
</table></td></tr></table></body></html>`;
}

export function buildWorkflowPlanEmails(data, { from, notifyTo }) {
  const replyTo = notifyTo[0];
  const deadlineAt = workflowPlanDeadline(data.submittedAt);
  const due = workflowPlanStamp(deadlineAt);
  const internalRows = rows(data, deadlineAt, true);
  const ownerRows = rows(data, deadlineAt, false);
  const internalIntro = `A website Workflow Plan request is ready for manual review and fulfillment. Email a practical, preliminary recommendation based on the supplied facts within ${REVIEW_HOURS} hours of this request. No meeting is required.`;
  const ownerIntro = `Thanks, ${escapeHtml(data.name)}. We have your workflow request. We’ll email a practical recommendation by <strong>${escapeHtml(due)}</strong>, within ${REVIEW_HOURS} hours of your request. Your plan will be preliminary, based on the facts you supplied and reviewed by ${escapeHtml(COMPANY.workflowPlan.reviewer)}. No meeting is needed.`;
  const internalEnding = "Reply to this email to contact the owner. This notification is the intake record; the plan still needs to be prepared and sent.";
  const ownerEnding = `Need to add something? Reply to this email and include your request ID. Please don’t send passwords or sensitive customer records. If you don’t see the plan by the deadline, email <a href="mailto:${escapeHtml(replyTo)}" style="color:#B83E22;text-decoration:underline;">${escapeHtml(replyTo)}</a>.`;
  const asText = (values) => values.map(([label, value]) => `${label}: ${value}`).join("\n\n");

  return [
    {
      from, to: notifyTo, reply_to: data.email,
      subject: `Workflow Plan request — ${data.company} — ${data.requestId}`,
      html: shell("New Workflow Plan request", internalIntro, internalRows, internalEnding),
      text: `New Workflow Plan request\n\n${internalIntro}\n\n${asText(internalRows)}\n\n${internalEnding}`,
    },
    {
      from, to: [data.email], reply_to: replyTo,
      subject: `Your Workflow Plan request — ${data.requestId}`,
      html: shell("Your Workflow Plan request is in", ownerIntro, ownerRows, ownerEnding),
      text: `Thanks, ${data.name}. We have your workflow request. We’ll email a practical recommendation by ${due}, within ${REVIEW_HOURS} hours of your request. Your plan will be preliminary, based on the facts you supplied and reviewed by ${COMPANY.workflowPlan.reviewer}. No meeting is needed.\n\n${asText(ownerRows)}\n\nNeed to add something? Reply to this email and include your request ID. Please don’t send passwords or sensitive customer records. If you don’t see the plan by the deadline, email ${replyTo}.`,
    },
  ];
}
