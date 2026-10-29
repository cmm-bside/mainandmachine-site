// Private D1 intake record plus deterministic transactional-email outbox.
// All dates below are server timestamps; no submitted details enter logs.
import { buildWorkflowPlanEmails, workflowPlanDeadline } from "../../emails/workflow-plan.js";

const DEFAULT_FROM = "Main & Machine <hello@mainandmachine.com>";
const DEFAULT_NOTIFY = "cmyers@mainandmachine.com";
const EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RETENTION_MS = 90 * 86400000;
const SAFE_RETRY_MS = 23 * 3600000;
const LEASE_MS = 60000;
const ALERT_AFTER_MS = 30 * 60000;

export function logIssue(requestId, reason, providerStatus) {
  const diagnostic = { reason };
  if (typeof requestId === "string" && UUID.test(requestId)) diagnostic.requestId = requestId.toLowerCase();
  if (Number.isInteger(providerStatus) && providerStatus >= 100 && providerStatus <= 599) diagnostic.providerStatus = providerStatus;
  console.error(`[workflow-plan] ${JSON.stringify(diagnostic)}`);
}

function database(env) {
  if (!env.WORKFLOW_INTAKE?.prepare) throw new Error("intake_storage_unavailable");
  return env.WORKFLOW_INTAKE;
}

export async function findIntake(env, requestId) {
  return database(env).prepare("SELECT * FROM workflow_intakes WHERE request_id = ?").bind(requestId).first();
}

export async function saveIntake(env, data) {
  const db = database(env);
  const payload = JSON.stringify(data);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  const now = Date.now();
  await db.prepare(`INSERT INTO workflow_intakes
    (request_id, payload_hash, payload_json, deadline_at, created_at, expires_at, next_attempt_at)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(request_id) DO NOTHING`)
    .bind(data.requestId, hash, payload, workflowPlanDeadline(data.submittedAt), now, now + RETENTION_MS, now).run();
  const row = await findIntake(env, data.requestId);
  if (!row) throw new Error("intake_storage_unavailable");
  return { row, conflict: row.payload_hash !== hash };
}

export function intakeReceipt(row) {
  return { ok: true, accepted: true, storageStatus: "saved", requestId: row.request_id,
    deadlineAt: row.deadline_at, emailStatus: row.email_status === "queued" ? "queued" : "pending" };
}

function mailConfiguration(env) {
  const notifyTo = (env.LEAD_NOTIFY_TO || DEFAULT_NOTIFY).split(",").map(email => email.trim()).filter(Boolean);
  const from = env.MAIL_FROM || DEFAULT_FROM;
  if (!env.RESEND_API_KEY || !notifyTo.length || notifyTo.length > 50 || notifyTo.some(email => !EMAIL.test(email)) || /[\r\n]/.test(from)) return null;
  return { from, notifyTo };
}

async function sendBatch(apiKey, requestId, batch, { single = false } = {}) {
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
      const response = await fetch(single ? "https://api.resend.com/emails" : "https://api.resend.com/emails/batch", {
        method: "POST", signal: controller.signal,
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", ...(single ? {} : { "x-batch-validation": "strict" }), "Idempotency-Key": `${single ? "website-workflow-plan-review" : "website-workflow-plan"}/${requestId}` },
        body: payload,
      });
      const value = await response.json().catch(() => null);
      const completeBatch = Array.isArray(value?.data) && value.data.length === 2
        && value.data.every((email) => typeof email?.id === "string" && email.id.trim().length > 0)
        && new Set(value.data.map((email) => email.id)).size === 2;
      const noErrors = !value?.error && (!value?.errors || (Array.isArray(value.errors) && value.errors.length === 0));
      const complete = single ? typeof value?.id === "string" && value.id.trim().length > 0 : completeBatch;
      if (response.ok && complete && noErrors) return { ok: true };
      if (response.status === 409 && value?.name === "invalid_idempotent_request") {
        logIssue(requestId, "request_conflict", response.status);
        return { ok: false, retryable: false, code: "request_conflict" };
      }
      retryable = response.ok || response.status === 408 || response.status === 429 || response.status >= 500 || (response.status === 409 && value?.name === "concurrent_idempotent_requests");
      const retryHeader = response.headers.get("retry-after");
      const retrySeconds = /^\d+$/.test(retryHeader || "") ? Number(retryHeader) : Math.ceil((Date.parse(retryHeader) - Date.now()) / 1000);
      const retryAfter = Number.isFinite(retrySeconds) && retrySeconds > 0 ? Math.min(retrySeconds, 3600) : 5;
      result = { ok: false, retryable, code: "email_unavailable", retryAfter };
      if (retrySeconds > 0) pauseMs = retrySeconds * 1000;
      logIssue(requestId, response.ok ? "provider_response_incomplete" : "provider_rejected", response.status);
    } catch {
      logIssue(requestId, "provider_request_interrupted");
    } finally {
      clearTimeout(timer);
    }
    if (!retryable || attempt === 1 || pauseMs > 2000) return result;
    await new Promise((resolve) => setTimeout(resolve, pauseMs));
  }
}


async function release(env, requestId, token, status, reason, retryAt) {
  return database(env).prepare(`UPDATE workflow_intakes SET email_status = ?, last_reason = ?,
    next_attempt_at = ?, lease_token = NULL, lease_until = NULL, queued_at = ?
    WHERE request_id = ? AND lease_token = ?`)
    .bind(status, reason, retryAt, status === "queued" ? Date.now() : null, requestId, token).run();
}

export async function dispatchIntake(env, requestId) {
  const db = database(env);
  let row = await findIntake(env, requestId);
  if (!row || row.email_status !== "pending") return row;
  const now = Date.now();
  // Never risk re-sending an accepted batch after the provider's dedupe window.
  // Keeping the row allows a person to reconcile and fulfill it manually.
  // A legacy browser retry may have reached Resend before D1 was introduced.
  // Use submittedAt as an upper bound, never a fresh D1 insertion timestamp.
  const submittedAt = Date.parse(JSON.parse(row.payload_json).submittedAt);
  const retryDeadline = Math.min(submittedAt, row.first_attempt_at ?? row.created_at) + SAFE_RETRY_MS;
  if (now >= retryDeadline) {
    await db.prepare(`UPDATE workflow_intakes SET email_status = 'needs_review',
      last_reason = 'retry_window_expired', lease_token = NULL, lease_until = NULL
      WHERE request_id = ? AND email_status = 'pending' AND (lease_until IS NULL OR lease_until <= ?)`)
      .bind(requestId, now).run();
    logIssue(requestId, "retry_window_expired");
    return findIntake(env, requestId);
  }
  const token = crypto.randomUUID();
  const claim = await db.prepare(`UPDATE workflow_intakes SET lease_token = ?, lease_until = ?,
      attempt_count = attempt_count + 1, last_attempt_at = ?
    WHERE request_id = ? AND email_status = 'pending' AND next_attempt_at <= ?
      AND (lease_until IS NULL OR lease_until <= ?)`)
    .bind(token, now + LEASE_MS, now, requestId, now, now).run();
  if (!claim.meta?.changes) return findIntake(env, requestId);
  row = await findIntake(env, requestId);
  const config = mailConfiguration(env);
  if (!config) {
    logIssue(requestId, "mail_configuration_unavailable");
    await release(env, requestId, token, "pending", "mail_configuration_unavailable", now + 300000);
    return findIntake(env, requestId);
  }
  // Fix the complete batch before any network attempt. Deployments and mail
  // configuration changes cannot alter an already-attempted idempotent payload.
  if (!row.batch_json) {
    const batch = JSON.stringify(buildWorkflowPlanEmails(JSON.parse(row.payload_json), config));
    await db.prepare(`UPDATE workflow_intakes SET batch_json = ? WHERE request_id = ? AND lease_token = ? AND batch_json IS NULL`)
      .bind(batch, requestId, token).run();
    row = await findIntake(env, requestId);
  }
  await db.prepare(`UPDATE workflow_intakes SET first_attempt_at = COALESCE(first_attempt_at, ?) WHERE request_id = ? AND lease_token = ?`)
    .bind(now, requestId, token).run();
  const result = await sendBatch(env.RESEND_API_KEY, requestId, JSON.parse(row.batch_json));
  const status = result.ok ? "queued" : result.code === "request_conflict" ? "needs_review" : "pending";
  // Even permanent provider rejections get bounded later attempts so corrected
  // credentials/domain settings recover without asking the visitor to resubmit.
  const delay = result.retryable ? Math.max(300, result.retryAfter || 5) : 900;
  await release(env, requestId, token, status, result.ok ? null : result.code || "email_unavailable", Date.now() + delay * 1000);
  return findIntake(env, requestId);
}


async function dispatchRecoveryAlert(env, requestId) {
  const db = database(env);
  let row = await findIntake(env, requestId);
  if (!row || row.email_status === "queued" || row.review_status !== "pending") return;
  const now = Date.now();
  if (row.review_first_attempt_at && now >= row.review_first_attempt_at + SAFE_RETRY_MS) {
    await db.prepare(`UPDATE workflow_intakes SET review_status = 'expired'
      WHERE request_id = ? AND review_status = 'pending' AND (lease_until IS NULL OR lease_until <= ?)`)
      .bind(requestId, now).run();
    logIssue(requestId, "recovery_alert_window_expired");
    return;
  }
  const token = crypto.randomUUID();
  const claim = await db.prepare(`UPDATE workflow_intakes SET lease_token = ?, lease_until = ?
    WHERE request_id = ? AND email_status IN ('pending', 'needs_review') AND review_status = 'pending'
      AND (email_status = 'needs_review' OR created_at <= ?)
      AND review_next_attempt_at <= ? AND (lease_until IS NULL OR lease_until <= ?)`)
    .bind(token, now + LEASE_MS, requestId, now - ALERT_AFTER_MS, now, now).run();
  if (!claim.meta?.changes) return;
  const config = mailConfiguration(env);
  if (!config) {
    await db.prepare(`UPDATE workflow_intakes SET review_next_attempt_at = ?, lease_token = NULL,
      lease_until = NULL WHERE request_id = ? AND lease_token = ?`).bind(now + 300000, requestId, token).run();
    logIssue(requestId, "recovery_mail_configuration_unavailable");
    return;
  }
  row = await findIntake(env, requestId);
  if (!row.review_email_json) {
    const original = row.batch_json ? JSON.parse(row.batch_json)[0] : buildWorkflowPlanEmails(JSON.parse(row.payload_json), config)[0];
    const explanation = "This saved Workflow Plan request needs manual review because email confirmation could not be verified. Check prior delivery before preparing or sending the plan. The saved intake is below. Do not ask the visitor to resubmit.";
    const alert = { ...original, from: config.from, to: config.notifyTo, subject: `Manual review needed — Workflow Plan — ${requestId}`,
      text: `${explanation}\n\n${original.text}`,
      html: original.html.replace(/(<body\b[^>]*>)/i, `$1<p style="padding:20px;font-family:Arial,sans-serif;background:#fff3cd;color:#201c17;"><strong>Manual review needed.</strong> ${explanation}</p>`) };
    await db.prepare(`UPDATE workflow_intakes SET review_email_json = ? WHERE request_id = ? AND lease_token = ? AND review_email_json IS NULL`)
      .bind(JSON.stringify(alert), requestId, token).run();
    row = await findIntake(env, requestId);
  }
  await db.prepare(`UPDATE workflow_intakes SET review_first_attempt_at = COALESCE(review_first_attempt_at, ?)
    WHERE request_id = ? AND lease_token = ?`).bind(now, requestId, token).run();
  const result = await sendBatch(env.RESEND_API_KEY, requestId, JSON.parse(row.review_email_json), { single: true });
  await db.prepare(`UPDATE workflow_intakes SET review_status = ?, review_next_attempt_at = ?,
      review_queued_at = ?, lease_token = NULL, lease_until = NULL WHERE request_id = ? AND lease_token = ?`)
    .bind(result.ok ? "queued" : result.code === "request_conflict" ? "expired" : "pending",
      Date.now() + 900000, result.ok ? Date.now() : null, requestId, token).run();
  if (!result.ok) logIssue(requestId, "recovery_alert_pending");
}

export async function retryPendingIntakes(env, { limit = 10 } = {}) {
  const db = database(env);
  const now = Date.now();
  const boundedLimit = Math.min(Math.max(Number.isInteger(limit) ? limit : 10, 1), 25);
  await db.prepare("DELETE FROM workflow_intakes WHERE expires_at <= ?").bind(now).run();
  // One shared bounded send budget, with half reserved for operator alerts.
  // Escalate persistent email failures after 30 minutes rather than waiting
  // until the customer's 24-hour fulfillment deadline is almost over.
  const review = await db.prepare(`SELECT request_id FROM workflow_intakes
    WHERE email_status IN ('pending', 'needs_review') AND review_status = 'pending'
      AND (email_status = 'needs_review' OR created_at <= ?) AND review_next_attempt_at <= ?
      AND (lease_until IS NULL OR lease_until <= ?) ORDER BY created_at LIMIT ?`)
    .bind(now - ALERT_AFTER_MS, now, now, Math.ceil(boundedLimit / 2)).all();
  let alertsAttempted = 0;
  for (const { request_id } of review.results || []) {
    try { await dispatchRecoveryAlert(env, request_id); alertsAttempted += 1; }
    catch { logIssue(request_id, "recovery_alert_processing_failed"); alertsAttempted += 1; }
  }
  const pending = await db.prepare(`SELECT request_id FROM workflow_intakes
    WHERE email_status = 'pending' AND next_attempt_at <= ?
      AND (lease_until IS NULL OR lease_until <= ?) ORDER BY created_at LIMIT ?`)
    .bind(now, now, boundedLimit - alertsAttempted).all();
  let attempted = 0;
  for (const { request_id } of pending.results || []) {
    try { await dispatchIntake(env, request_id); attempted += 1; }
    catch { logIssue(request_id, "retry_processing_failed"); attempted += 1; }
  }
  const counts = await db.prepare(`SELECT email_status, COUNT(*) AS count FROM workflow_intakes GROUP BY email_status`).all();
  const totals = { pending: 0, queued: 0, needs_review: 0 };
  for (const row of counts.results || []) totals[row.email_status] = Number(row.count);
  const alerts = await db.prepare(`SELECT COUNT(*) AS count FROM workflow_intakes
    WHERE email_status IN ('pending', 'needs_review') AND review_status != 'queued'
      AND (email_status = 'needs_review' OR created_at <= ?)`).bind(now - ALERT_AFTER_MS).first();
  return { attempted, alertsAttempted, ...totals, unalerted: Number(alerts?.count || 0) };
}
