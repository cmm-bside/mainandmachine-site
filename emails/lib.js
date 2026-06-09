// Shared, runtime-agnostic helpers for the Book-an-Assessment flow.
// Imported by BOTH the Cloudflare Pages Function (functions/api/book-assessment.js)
// and the local test/preview script (scripts/test-book-assessment.mjs).
// Keep this file free of Worker- or Node-specific globals so it runs in either.

// The form fields, in display order, with human labels for the notification email.
// `required` mirrors the client-side validation in /book/index.html.
export const FIELDS = [
  { key: "name",      label: "Name",              required: true },
  { key: "email",     label: "Work email",        required: true },
  { key: "phone",     label: "Phone",             required: true },
  { key: "contact",   label: "Preferred contact", required: true },
  { key: "company",   label: "Company name",      required: true },
  { key: "website",   label: "Website",           required: false },
  { key: "industry",  label: "Industry",          required: true },
  { key: "team",      label: "Team size",         required: true },
  { key: "revenue",   label: "Annual revenue",    required: false },
  { key: "workflows", label: "What's eating the team's time", required: true },
  { key: "heard",     label: "How they heard",    required: false },
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
  if (data.phone.replace(/[^0-9]/g, "").length < 7) errors.phone = "A valid phone number is required.";
  if (!CONTACT_VALUES.includes(data.contact)) data.contact = "Email"; // tolerant default
  if (!data.company) errors.company = "Company name is required.";
  if (!data.industry) errors.industry = "Industry is required.";
  if (!data.team) errors.team = "Team size is required.";
  if (!data.workflows) errors.workflows = "Tell us a little about the work.";

  // length guards (cheap abuse mitigation)
  for (const f of FIELDS) {
    const cap = f.key === "workflows" ? 5000 : 300;
    if (data[f.key].length > cap) errors[f.key] = "Too long.";
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
