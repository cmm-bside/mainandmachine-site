// Independent website intake; fulfillment is manual. No Foundry calls or state.
// WORKFLOW_INTAKE D1 stores an intake before notifications are attempted.
// RATE_LIMIT KV remains best-effort abuse protection, separate from intake data.
import { WORKFLOW_TYPES } from "../../emails/workflow-plan.js";
import { findIntake, saveIntake, dispatchIntake, intakeReceipt, logIssue } from "../_lib/workflow-intake.js";

const MAX_BODY_BYTES = 32 * 1024;
const MIN_FILL_MS = 3000;
const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000; // Below Resend's 24-hour dedupe retention.
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;
const FIELD_RULES = {
  workflow: [20, 4000, true], tools: [0, 600, true], frequency: [0, 160, false],
  name: [2, 120, false], email: [1, 254, false], company: [2, 160, false],
  website: [0, 300, false],
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

async function rateAllowed(request, env, requestId) {
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
    logIssue(requestId, "rate_limit_unavailable");
  }
  return true;
}


async function handlePost({ request, env }) {
  // A JSON POST from the same-origin form sends Origin. Do not allow other
  // origins or emit Access-Control-Allow-Origin, including on errors.
  const requestOrigin = new URL(request.url).origin;
  const productionOrigins = ["https://mainandmachine.com", "https://www.mainandmachine.com"];
  const allowedOrigins = productionOrigins.includes(requestOrigin) ? productionOrigins : [requestOrigin];
  if (!allowedOrigins.includes(request.headers.get("origin")) || request.headers.get("sec-fetch-site") === "cross-site") {
    logIssue(null, "origin_rejected");
    return json({ ok: false, code: "origin_rejected", error: "Please submit this form from our website." }, 403);
  }
  if (!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get("content-type") || "")) return json({ ok: false, error: "Send this request as JSON." }, 415);
  const parsed = await readBody(request);
  if (parsed.status) return json({ ok: false, error: parsed.status === 413 ? "This request is too large." : "Invalid request." }, parsed.status);
  const { data, errors, ok } = validation(parsed.body, Date.now());
  if (!ok) {
    logIssue(data.requestId, "validation_rejected");
    return json({ ok: false, error: "Please check the highlighted fields.", errors }, 422);
  }
  // The retired companyUrl honeypot could be populated by legitimate browser
  // autofill. Ignore it in legacy payloads; schema, origin, timing and rate checks remain.
  if (Math.max(Date.parse(data.submittedAt), Date.now()) - data.startedAt < MIN_FILL_MS) {
    logIssue(data.requestId, "fill_time_rejected");
    return json({ ok: false, retryable: true, error: "Take a moment to check the workflow, then try again." }, 429, { "retry-after": "3" });
  }
  try {
    // Existing references are checked before the new-request quota so uncertain
    // network retries do not consume the visitor's ability to recover a receipt.
    const previous = await findIntake(env, data.requestId);
    if (!previous && !await rateAllowed(request, env, data.requestId)) {
      logIssue(data.requestId, "rate_limit_rejected");
      return json({ ok: false, retryable: true, error: "Too many attempts. Please wait an hour or email us directly." }, 429, { "retry-after": "3600" });
    }
    const saved = await saveIntake(env, data);
    if (saved.conflict) {
      logIssue(data.requestId, "request_conflict");
      return json({ ok: false, retryable: false, code: "request_conflict", error: "This request ID was already used with different details. Email us with your request ID so we can check it." }, 409);
    }
    let row = saved.row;
    try { row = await dispatchIntake(env, data.requestId) || row; }
    catch { logIssue(data.requestId, "notification_processing_failed"); }
    // Saved intake and email acceptance are deliberately separate. A provider
    // outage cannot erase a request or ask a visitor to create a duplicate.
    return json(intakeReceipt(row));
  } catch {
    logIssue(data.requestId, "intake_storage_unavailable");
    return json({ ok: false, accepted: false, code: "intake_storage_unavailable", retryable: true,
      error: "We couldn’t save your request yet. Retry the same request; your details are still in this tab." }, 503, { "retry-after": "5" });
  }
}

export function onRequest(context) {
  if (context.request.method === "POST") return handlePost(context);
  return json({ ok: false, error: "Method not allowed." }, 405, { allow: "POST" });
}
