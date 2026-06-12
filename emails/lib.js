// Shared, runtime-agnostic helpers for the Book-an-Assessment flow.
// Imported by BOTH the Cloudflare Pages Function (functions/api/book-assessment.js)
// and the local test/preview script (scripts/test-book-assessment.mjs).
// Keep this file free of Worker- or Node-specific globals so it runs in either.

// The form fields, in display order, with human labels for the notification email.
// `required` mirrors the client-side validation in /book/index.html.
// The form is two-stage: stage 1 is the primary submit; stage 2 ("help us prep",
// all optional) is offered on the confirmation screen and appends to the same lead.
export const FIELDS = [
  { key: "name",      label: "Name",              required: true },
  { key: "email",     label: "Work email",        required: true },
  { key: "phone",     label: "Phone",             required: false }, // required only when contact is Phone/Either
  { key: "contact",   label: "Preferred contact", required: true },
  { key: "company",   label: "Company name",      required: true },
  { key: "workflows", label: "What's eating the team's time", required: true },
  { key: "interest",  label: "Interest (from CTA)", required: false },
];

// Stage-2 fields — optional, collected on the confirmation screen.
export const DETAIL_FIELDS = [
  { key: "industry",  label: "Industry" },
  { key: "team",      label: "Team size" },
  { key: "revenue",   label: "Annual revenue" },
  { key: "website",   label: "Website" },
  { key: "heard",     label: "How they heard" },
];

const CONTACT_VALUES = ["Email", "Phone", "Either"];

export function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

// Server-side validation — never trust the client. Returns {ok, errors, data}
// where data is the trimmed, normalized copy of accepted fields.
export function validateSubmission(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const data = {};
  for (const f of FIELDS) {
    data[f.key] = typeof src[f.key] === "string" ? src[f.key].trim() : "";
  }

  const errors = {};
  if (!data.name) errors.name = "Name is required.";
  if (!isValidEmail(data.email)) errors.email = "A valid email is required.";
  if (!CONTACT_VALUES.includes(data.contact)) data.contact = "Email"; // tolerant default
  // Phone is required only when they ask to be reached by phone.
  const phoneNeeded = data.contact === "Phone" || data.contact === "Either";
  const phoneDigits = data.phone.replace(/[^0-9]/g, "").length;
  if (phoneNeeded && phoneDigits < 7) errors.phone = "A valid phone number is required.";
  if (!phoneNeeded && data.phone && phoneDigits < 7) errors.phone = "That phone number looks incomplete.";
  if (!data.company) errors.company = "Company name is required.";
  if (!data.workflows) errors.workflows = "Tell us a little about the work.";

  // length guards (cheap abuse mitigation)
  for (const f of FIELDS) {
    const cap = f.key === "workflows" ? 5000 : 300;
    if (data[f.key].length > cap) errors[f.key] = "Too long.";
  }

  return { ok: Object.keys(errors).length === 0, errors, data };
}

// Stage-2 validation — everything optional, but the reference back to the
// original submission must look sane and at least one detail must be present.
export function validateDetails(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const data = {};
  for (const f of DETAIL_FIELDS) {
    data[f.key] = typeof src[f.key] === "string" ? src[f.key].trim() : "";
  }
  for (const k of ["referenceId", "name", "email", "company"]) {
    data[k] = typeof src[k] === "string" ? src[k].trim() : "";
  }

  const errors = {};
  if (!/^MM-\d{4}-\d{4}$/.test(data.referenceId)) errors.referenceId = "Missing reference.";
  if (!isValidEmail(data.email)) errors.email = "A valid email is required.";
  if (!DETAIL_FIELDS.some((f) => data[f.key])) errors.details = "Nothing to add.";
  for (const f of DETAIL_FIELDS) {
    if (data[f.key].length > 300) errors[f.key] = "Too long.";
  }

  return { ok: Object.keys(errors).length === 0, errors, data };
}

export function firstNameOf(name) {
  const n = String(name || "").trim();
  return n.split(/\s+/)[0] || n;
}

// MM-YYYY-#### reference. Stateless (Workers are stateless without a binding),
// so it's time-derived + a little mixing — unique enough for a lead form, and
// logged server-side so it's a real, traceable id rather than client junk.
export function makeReferenceId(now = new Date()) {
  const year = now.getUTCFullYear();
  // 4 digits derived from the millisecond clock, mixed so adjacent submits differ.
  const n = (Math.floor(now.getTime() / 137) % 9000) + 1000;
  return `MM-${year}-${n}`;
}

// "How they'll be reached" — mirrors the recap shown on the confirmation panel.
export function contactVia(data) {
  if (data.contact === "Phone") return data.phone;
  if (data.contact === "Either") return `${data.email} · ${data.phone}`;
  return data.email;
}

export function formatStamp(now = new Date()) {
  // e.g. "Jun 9, 2026 · 1:42 PM UTC" — kept simple + timezone-explicit.
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const h = now.getUTCHours();
  const m = String(now.getUTCMinutes()).padStart(2, "0");
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${months[now.getUTCMonth()]} ${now.getUTCDate()}, ${now.getUTCFullYear()} · ${h12}:${m} ${ampm} UTC`;
}

export function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
