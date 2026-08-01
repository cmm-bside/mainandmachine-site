// GENERATED from data/build-log.json by scripts/build-work.mjs — DO NOT EDIT.
// Edit the JSON, then run: npm run work:build (build:static runs it).
//
// Runtime-agnostic on purpose: imported by the email templates and the
// Cloudflare Pages Functions, which cannot read the JSON at request time.
// When marcus.signed_off is false, `figures` is empty — a reader with no
// figure must omit the claim, never fall back to a remembered number.
export const MARCUS = {
  "signedOff": true,
  "client": "B:Side Capital",
  "measurementWindow": "first 90 days of full-fleet operation",
  "figures": {
    "hours-returned": {
      "value": "1,240",
      "unit": "hrs",
      "desc": "Staff hours of preparation returned in 90 days — a ~5,000-hour annual run rate, roughly 2.4 full-time people of pure prep work."
    },
    "weekly-adoption": {
      "value": "93",
      "unit": "%",
      "desc": "Of staff using MARCUS weekly by week six — with no new app, no new login, and no training deck."
    },
    "identifiers-out": {
      "value": "0",
      "unit": "",
      "desc": "Borrower identifiers sent to any outside model. Every prompt and document cleared the privacy filter first. No exceptions, because no bypass exists."
    },
    "human-approved": {
      "value": "100",
      "unit": "%",
      "desc": "Of consequential actions approved by a person before anything sent, filed, posted, or paid. Zero unapproved actions — verified by the audit log, not asserted."
    },
    "uptime": {
      "value": "99.96",
      "unit": "%",
      "desc": "Uptime since commissioning in February 2026 — one planned maintenance window, zero unplanned outages."
    },
    "model-calls": {
      "value": "2.1M",
      "unit": "",
      "desc": "Model calls processed entirely on-premises in 90 days. In normal operation, none left the building."
    },
    "hardware-markup": {
      "value": "$0",
      "unit": "",
      "desc": "Hardware markup. Bought at cost, in the client's name. That we do not mark it up is the point."
    },
    "model-swaps": {
      "value": "1",
      "unit": "",
      "desc": "Mid-flight model upgrade, completed in an evening, with zero workflow changes for staff."
    },
    "prompts-filtered": {
      "value": "100",
      "unit": "%",
      "desc": "Of prompts and attachments cleared the filter before reaching any model. No bypass path exists in the architecture."
    },
    "identifiers-stripped": {
      "value": "1.9M",
      "unit": "",
      "desc": "Personal identifiers detected and stripped — names, SSNs, account numbers — across ~38,000 documents processed."
    },
    "detection-recall": {
      "value": "99.8",
      "unit": "%",
      "desc": "Detection recall on the monthly seeded red-team test — measured, not claimed, and improving each cycle."
    },
    "pii-incidents": {
      "value": "0",
      "unit": "",
      "desc": "PII incidents since the filter went live. The number the board actually asks about."
    },
    "kb-build-time": {
      "value": "2",
      "unit": "wks",
      "desc": "From completed questionnaire to a queryable knowledge base — generated from the intake, not hand-designed."
    },
    "process-docs": {
      "value": "~840",
      "unit": "",
      "desc": "Process documents ingested, joined with thousands of loan records and a decade of institutional correspondence."
    },
    "questions-monthly": {
      "value": "1,200",
      "unit": "/mo",
      "desc": "Questions asked by staff by month three — the questions that used to wait for whoever just knows."
    },
    "cited-answers": {
      "value": "96",
      "unit": "%",
      "desc": "Of answers delivered with a citation to the source document or record. The rest say they do not know, and escalate to a person."
    },
    "first-question": {
      "value": "11",
      "unit": "min",
      "desc": "From go-live to the first real staff question — no training session had happened yet. None was needed."
    },
    "adoption-week-six": {
      "value": "93",
      "unit": "%",
      "desc": "Weekly active adoption by week six, across all seven divisions — including the skeptics."
    },
    "slack-share": {
      "value": "71",
      "unit": "%",
      "desc": "Of all MARCUS interactions happen in Slack — finished work delivered to the channel where the team already works."
    },
    "chat-conversations": {
      "value": "380",
      "unit": "/wk",
      "desc": "Conversations per week by month three — policy lookups, document summaries, and first drafts leading the mix."
    },
    "chat-filtered": {
      "value": "100",
      "unit": "%",
      "desc": "Of chat traffic routed through the privacy filter — the paste-into-a-chatbot habit, made safe instead of banned."
    },
    "kb-demand-week": {
      "value": "Wk 2",
      "unit": "",
      "desc": "When the first question about loan history arrived — the knowledge base selling itself, in the wild."
    },
    "invoices-staged": {
      "value": "640",
      "unit": "",
      "desc": "Vendor invoices staged in 90 days, each pre-coded with source attached — every one approved by a person before posting."
    },
    "recon-mismatches": {
      "value": "41",
      "unit": "",
      "desc": "Reconciliation mismatches surfaced automatically before month-end — found by the system, decided by a person."
    },
    "days-to-collect": {
      "value": "−9",
      "unit": "days",
      "desc": "Improvement in average days-to-collect on fee invoices, from follow-ups drafted the day an invoice ages past threshold."
    },
    "nightly-assertions": {
      "value": "2,100",
      "unit": "",
      "desc": "Automated assertions run nightly against the production configuration — plus a monthly deliberate failure drill."
    },
    "regressions-caught": {
      "value": "47",
      "unit": "",
      "desc": "Regressions caught by the harness before any staff member encountered them. Zero found by staff first."
    },
    "audit-log-entries": {
      "value": "3.4M",
      "unit": "",
      "desc": "Entries on the tamper-evident audit log — every action traceable to its trigger, its approver, and its source document."
    },
    "harness-generic": {
      "value": "84",
      "unit": "%",
      "desc": "Of the harness is generic assertion-running; the remainder is client-specific fixtures. Which means it deploys anywhere — including on AI systems somebody else built."
    }
  }
};
