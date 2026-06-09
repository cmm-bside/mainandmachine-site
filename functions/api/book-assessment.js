// Cloudflare Pages Function — POST /api/book-assessment
//
// Handles the Book-an-Assessment form: server-side validation, spam protection
// (honeypot + min-fill-time), optional KV rate-limiting, a logged reference id,
// and two emails via Resend (REST, no SDK / no new dependency):
//   1. internal notification to the team (Reply-To = submitter)
//   2. on-brand autoresponder to the submitter
//
// ENV / BINDINGS (set in Cloudflare Pages → Settings → Environment variables):
//   RESEND_API_KEY   (secret, required)  — Resend API key
//   MAIL_FROM        (optional)          — default "Main & Machine <hello@mainandmachine.com>"
//   LEAD_NOTIFY_TO   (optional)          — comma-separated; default the two team addresses
//   RATE_LIMIT       (optional KV binding) — if bound, limits submits per IP/hour
//
// Local dev:  npx wrangler pages dev . --binding RESEND_API_KEY=...
// Logic-only test (no network):  npm run test:book

import { validateSubmission, makeReferenceId, firstNameOf, contactVia, formatStamp } from "../../emails/lib.js";
import { renderAutoresponderHtml, renderAutoresponderText } from "../../emails/assessment-autoresponder.js";
import { renderInternalHtml, renderInternalText, internalSubject } from "../../emails/assessment-internal.js";

const DEFAULT_FROM = "Main & Machine <hello@mainandmachine.com>";
const DEFAULT_NOTIFY = "cmyers@mainandmachine.com,akester@mainandmachine.com";
const MIN_FILL_MS = 3000;       // forms submitted faster than this are almost certainly bots
const RATE_MAX = 5;             // max submissions ...
const RATE_WINDOW_S = 3600;     // ... per IP per hour (only enforced if RATE_LIMIT KV is bound)

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  // --- spam: honeypot (must be empty) ---
  // Bots fill every field; humans never see this one.
  if (typeof body.company_url === "string" && body.company_url.trim() !== "") {
    // Pretend success so bots don't learn the trap. Nothing is sent.
    return json({ ok: true, referenceId: makeReferenceId(), recap: { name: "", via: "", company: "" } });
  }

  // --- spam: min fill time ---
  const ts = Number(body.ts);
  if (Number.isFinite(ts) && ts > 0 && Date.now() - ts < MIN_FILL_MS) {
    return json({ ok: false, error: "That was a little quick — please try again." }, 429);
  }

  // --- validation (never trust the client) ---
  const { ok, errors, data } = validateSubmission(body);
  if (!ok) {
    return json({ ok: false, error: "Please check the highlighted fields.", errors }, 422);
  }

  // --- rate limit (best-effort; only if KV bound) ---
  if (env.RATE_LIMIT) {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const key = `rl:${ip}`;
    try {
      const count = parseInt((await env.RATE_LIMIT.get(key)) || "0", 10);
      if (count >= RATE_MAX) {
        return json({ ok: false, error: "Too many requests. Please try again later." }, 429);
      }
      await env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: RATE_WINDOW_S });
    } catch (e) {
      console.error("rate-limit KV error", e);
    }
  }

  // --- check mailer config ---
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set");
    return json({ ok: false, error: "Email is not configured. Please email us directly." }, 500);
  }

  const now = new Date();
  const referenceId = makeReferenceId(now);
  const stamp = formatStamp(now);
  const from = env.MAIL_FROM || DEFAULT_FROM;
  const notifyTo = (env.LEAD_NOTIFY_TO || DEFAULT_NOTIFY).split(",").map((s) => s.trim()).filter(Boolean);

  // Log the lead so the reference id is real and traceable (visible in CF logs / tail).
  console.log(`[assessment] ${referenceId} ${stamp} — ${data.company} (${data.name} <${data.email}>)`);

  const emailData = { firstName: firstNameOf(data.name), referenceId };
  const meta = { referenceId, stamp };

  // --- send both emails ---
  try {
    const internal = sendEmail(apiKey, {
      from,
      to: notifyTo,
      reply_to: data.email,
      subject: internalSubject(data),
      html: renderInternalHtml(data, meta),
      text: renderInternalText(data, meta),
    });

    const auto = sendEmail(apiKey, {
      from,
      to: [data.email],
      subject: "We've got your request — let's find a time",
      html: renderAutoresponderHtml(emailData),
      text: renderAutoresponderText(emailData),
    });

    const [internalRes, autoRes] = await Promise.allSettled([internal, auto]);

    // The internal notification is the one that must land — it's the actual lead.
    if (internalRes.status === "rejected") {
      console.error("internal email failed", internalRes.reason);
      return json({ ok: false, error: "We couldn't submit that just now. Please try again." }, 502);
    }
    if (autoRes.status === "rejected") {
      // Lead is captured; autoresponder is a nicety. Log but still succeed.
      console.error("autoresponder failed (lead still captured)", autoRes.reason);
    }
  } catch (e) {
    console.error("send error", e);
    return json({ ok: false, error: "We couldn't submit that just now. Please try again." }, 502);
  }

  return json({
    ok: true,
    referenceId,
    stamp,
    recap: { name: data.name, via: contactVia(data), company: data.company },
  });
}

// Anything other than POST.
export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  return json({ ok: false, error: "Method not allowed." }, 405);
}

async function sendEmail(apiKey, payload) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail}`);
  }
  return res.json().catch(() => ({}));
}
