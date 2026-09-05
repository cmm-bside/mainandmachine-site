// Independent website intake; fulfillment is manual. No Foundry calls or state.
// Uses the existing RESEND_API_KEY, MAIL_FROM and LEAD_NOTIFY_TO bindings.
// Optional RATE_LIMIT KV is best-effort abuse protection, not durable lead storage.
import { WORKFLOW_TYPES, buildWorkflowPlanEmails, workflowPlanDeadline } from "../../emails/workflow-plan.js";

const DEFAULT_FROM = "Main & Machine <hello@mainandmachine.com>";
const DEFAULT_NOTIFY = "cmyers@mainandmachine.com";
const MAX_BODY_BYTES = 32 * 1024;
const MIN_FILL_MS = 3000;
const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000; // Below Resend's 24-hour dedupe retention.
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;
const FIELD_RULES = {
  workflow: [20, 4000, true], tools: [0, 600, true], frequency: [0, 160, false],
  name: [2, 120, false], email: [1, 254, false], company: [2, 160, false],
  website: [0, 300, false], companyUrl: [0, 300, false],
};

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...headers },
  });
}

function validation(body, now) {
  const errors = {};
  const data = {};
  for (const [key, [min, max, multiline]] of Object.entries(FIELD_RULES)) {
    const raw = body[key];
    if (raw !== undefined && typeof raw !== "string") {
      errors[key] = "Please use text for this field.";
      continue;
    }
    const value = (raw || "").replace(/\r\n?/g, "\n").trim();
    if (value.length < min) errors[key] = key === "workflow" ? "Describe the workflow in at least 20 characters." : "Please complete this field.";
    if (value.length > max) errors[key] = `Please use ${max} characters or fewer.`;
    const controls = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/;
    if (controls.test(value)) errors[key] = "Please remove unusual control characters.";
    data[key] = value;
  }
  if (data.email && !EMAIL.test(data.email)) errors.email = "Enter a valid email address.";
  if (typeof body.workflowType !== "string" || !Object.hasOwn(WORKFLOW_TYPES, body.workflowType)) errors.workflowType = "Choose the closest workflow type.";
  data.workflowType = body.workflowType;
  if (typeof body.requestId !== "string" || !UUID.test(body.requestId)) errors.requestId = "Refresh the page before sending a new request.";
  data.requestId = typeof body.requestId === "string" ? body.requestId.toLowerCase() : "";

  // The browser freezes submittedAt with the UUID on the first attempt. Using a
  // fresh server timestamp in either email would make a replay a different body.
  const submittedMs = typeof body.submittedAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(body.submittedAt) ? Date.parse(body.submittedAt) : NaN;
  if (!Number.isFinite(submittedMs) || new Date(submittedMs).toISOString() !== body.submittedAt || submittedMs > now + CLOCK_SKEW_MS) {
    errors.submittedAt = "Check your device clock and refresh before sending.";
  } else if (now - submittedMs >= RETRY_WINDOW_MS) {
    errors.submittedAt = "This request is too old to retry safely. Email cmyers@mainandmachine.com with your request ID.";
  }
  data.submittedAt = body.submittedAt;
  if (!Number.isSafeInteger(body.startedAt) || body.startedAt <= 0 || body.startedAt > submittedMs) errors.startedAt = "Refresh the page and try again.";
  data.startedAt = body.startedAt;
  if (data.website) {
    try {
      const website = new URL(/^[a-z][a-z0-9+.-]*:/i.test(data.website) ? data.website : `https://${data.website}`);
      if (!["https:", "http:"].includes(website.protocol) || website.username || website.password || !website.hostname.includes(".")) throw new Error("Invalid website");
      data.website = website.href;
    } catch {
      errors.website = "Enter a public website address, such as example.com.";
    }
  }
  return { data, errors, ok: Object.keys(errors).length === 0 };
}

async function readBody(request) {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) return { status: 413 };
  if (!request.body) return { status: 400 };
  // Enforce the actual bytes as well as Content-Length; do not buffer an
  // unbounded body supplied without a length or with a misleading length.
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return { status: 413 };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) return { status: 400 };
    return { body };
  } catch {
    return { status: 400 };
  } finally {
    reader.releaseLock();
  }
}

async function rateAllowed(request, env) {
  if (!env.RATE_LIMIT) return true;
  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip) return true;
  // Existing KV is optional. Hash IPs instead of retaining them in KV keys.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const key = `workflow-plan:rate:${hash}`;
  try {
    const count = Number(await env.RATE_LIMIT.get(key)) || 0;
    if (count >= 10) return false;
    await env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: 3600 });
  } catch {
    // KV isn't transactional; this mitigates abuse but is not an exact quota.
    console.error("[workflow-plan] optional rate limit unavailable");
  }
  return true;
}

async function sendBatch(apiKey, requestId, batch) {
  const payload = JSON.stringify(batch);
  // Bounded automatic retries cover timeouts, provider throttling and transient
  // 5xx/concurrency errors. Every attempt uses identical bytes and the same key.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let retryable = true;
    let result = { ok: false, retryable: true, code: "email_unavailable", retryAfter: 5 };
    let pauseMs = 500;
    try {
      const response = await fetch("https://api.resend.com/emails/batch", {
        method: "POST", signal: controller.signal,
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "x-batch-validation": "strict", "Idempotency-Key": `website-workflow-plan/${requestId}` },
        body: payload,
      });
      const value = await response.json().catch(() => null);
      const completeBatch = Array.isArray(value?.data) && value.data.length === 2
        && value.data.every((email) => typeof email?.id === "string" && email.id.trim().length > 0)
        && new Set(value.data.map((email) => email.id)).size === 2;
      const noErrors = !value?.error && (!value?.errors || (Array.isArray(value.errors) && value.errors.length === 0));
      if (response.ok && completeBatch && noErrors) return { ok: true };
      if (response.status === 409 && value?.name === "invalid_idempotent_request") return { ok: false, retryable: false, code: "request_conflict" };
      retryable = response.ok || response.status === 408 || response.status === 429 || response.status >= 500 || (response.status === 409 && value?.name === "concurrent_idempotent_requests");
      const retryHeader = response.headers.get("retry-after");
      const retrySeconds = /^\d+$/.test(retryHeader || "") ? Number(retryHeader) : Math.ceil((Date.parse(retryHeader) - Date.now()) / 1000);
      const retryAfter = Number.isFinite(retrySeconds) && retrySeconds > 0 ? Math.min(retrySeconds, 3600) : 5;
      result = { ok: false, retryable, code: "email_unavailable", retryAfter };
      if (retrySeconds > 0) pauseMs = retrySeconds * 1000;
      // Log status only. Provider error messages may echo submitted addresses.
      console.error(`[workflow-plan] email provider status ${response.status}`);
    } catch {
      console.error("[workflow-plan] email provider request interrupted");
    } finally {
      clearTimeout(timer);
    }
    if (!retryable || attempt === 1 || pauseMs > 2000) return result;
    await new Promise((resolve) => setTimeout(resolve, pauseMs));
  }
}

async function handlePost({ request, env }) {
  // A JSON POST from the same-origin form sends Origin. Do not allow other
  // origins or emit Access-Control-Allow-Origin, including on errors.
  if (request.headers.get("origin") !== new URL(request.url).origin || ["cross-site", "same-site"].includes(request.headers.get("sec-fetch-site"))) {
    return json({ ok: false, error: "Please submit this form from our website." }, 403);
  }
  if (!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get("content-type") || "")) return json({ ok: false, error: "Send this request as JSON." }, 415);
  const parsed = await readBody(request);
  if (parsed.status) return json({ ok: false, error: parsed.status === 413 ? "This request is too large." : "Invalid request." }, parsed.status);
  const { data, errors, ok } = validation(parsed.body, Date.now());
  if (!ok) return json({ ok: false, error: "Please check the highlighted fields.", errors }, 422);
  if (data.companyUrl) {
    // Keep the trap opaque but do not return a false acceptance receipt.
    return json({ ok: false, error: "We couldn’t accept that request. Please email us directly." }, 422);
  }
  if (Math.max(Date.parse(data.submittedAt), Date.now()) - data.startedAt < MIN_FILL_MS) return json({ ok: false, retryable: true, error: "Take a moment to check the workflow, then try again." }, 429, { "retry-after": "3" });
  if (!await rateAllowed(request, env)) return json({ ok: false, retryable: true, error: "Too many attempts. Please wait an hour or email us directly." }, 429, { "retry-after": "3600" });
  const notifyTo = (env.LEAD_NOTIFY_TO || DEFAULT_NOTIFY).split(",").map((email) => email.trim()).filter(Boolean);
  const from = env.MAIL_FROM || DEFAULT_FROM;
  if (!env.RESEND_API_KEY || !notifyTo.length || notifyTo.length > 50 || notifyTo.some((email) => !EMAIL.test(email)) || /[\r\n]/.test(from)) {
    console.error("[workflow-plan] mail configuration unavailable");
    return json({ ok: false, retryable: false, error: "We couldn’t accept your request just now. Please email cmyers@mainandmachine.com." }, 503);
  }
  const result = await sendBatch(env.RESEND_API_KEY, data.requestId, buildWorkflowPlanEmails(data, { from, notifyTo }));
  if (!result.ok) {
    if (result.code === "request_conflict") return json({ ok: false, retryable: false, code: result.code, error: "This request ID was already used with different details. Email us with your request ID so we can check it." }, 409);
    return json({ ok: false, retryable: result.retryable, error: "We couldn’t confirm your request. Retry the same request or email cmyers@mainandmachine.com with your request ID." }, 502, result.retryable ? { "retry-after": String(result.retryAfter || 5) } : {});
  }
  // Provider acceptance is not proof of inbox delivery or completed fulfillment.
  // Do not log names, email addresses, workflow text or provider response bodies.
  return json({ ok: true, requestId: data.requestId, deadlineAt: workflowPlanDeadline(data.submittedAt), emailStatus: "queued" });
}

export function onRequest(context) {
  if (context.request.method === "POST") return handlePost(context);
  return json({ ok: false, error: "Method not allowed." }, 405, { allow: "POST" });
}
