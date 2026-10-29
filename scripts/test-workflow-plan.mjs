// Exercises the production handler with an in-memory provider. Never sends mail.
// Run: node --test scripts/test-workflow-plan.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { findIntake, retryPendingIntakes } from "../functions/_lib/workflow-intake.js";
import { onRequest } from "../functions/api/workflow-plan.js";

const ORIGIN = "https://www.mainandmachine.com";
const ENV = { RESEND_API_KEY: "mock-test-only", LEAD_NOTIFY_TO: "qa-team@example.com,qa-second@example.com", MAIL_FROM: "QA <qa-sender@example.com>" };
const realFetch = globalThis.fetch;
const realError = console.error;
let calls = [];
let logs = [];
let provider;
let sent;
let sqlite;
function binding(database) {
  return { prepare(sql) { return { bind(...args) { return {
    async first() { return database.prepare(sql).get(...args) || null; },
    async all() { return { results: database.prepare(sql).all(...args) }; },
    async run() { return { success: true, meta: { changes: Number(database.prepare(sql).run(...args).changes) } }; },
  }; },
  async first() { return database.prepare(sql).get() || null; },
  async all() { return { results: database.prepare(sql).all() }; },
  async run() { return { success: true, meta: { changes: Number(database.prepare(sql).run().changes) } }; },
  }; } };
}

function input(patch = {}) {
  return {
    requestId: randomUUID(), submittedAt: new Date().toISOString(), startedAt: Date.now() - 60000,
    workflowType: "operations", workflow: "We copy job details from email into our scheduling system each morning.",
    tools: "Email and a spreadsheet", frequency: "Every weekday", name: "QA Owner", email: "qa-owner@example.com",
    company: "Example QA", website: "example.com", companyUrl: "", ...patch,
  };
}

function response(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

function accept(call) {
  const existing = sent.get(call.key);
  if (existing) {
    if (existing.body !== call.body) return response({ name: "invalid_idempotent_request" }, 409);
    return response(existing.result);
  }
  const result = call.single ? { id: "mock-recovery-id" } : { data: [{ id: "mock-team-id" }, { id: "mock-owner-id" }] };
  sent.set(call.key, { body: call.body, result });
  return response(result);
}

async function post(body = input(), { origin = ORIGIN, headers = {}, env = ENV, raw, method = "POST" } = {}) {
  const request = new Request(`${ORIGIN}/api/workflow-plan`, {
    method,
    headers: { "content-type": "application/json", ...(origin === null ? {} : { origin }), ...headers },
    ...(["GET", "HEAD"].includes(method) ? {} : { body: raw ?? JSON.stringify(body) }),
  });
  const result = await onRequest({ request, env: { WORKFLOW_INTAKE: ENV.WORKFLOW_INTAKE, ...env } });
  return { response: result, body: await result.json() };
}

test.beforeEach(() => {
  calls = []; logs = []; sent = new Map(); provider = accept;
  sqlite = new DatabaseSync(":memory:");
  for (const file of ["0001_workflow_intake.sql", "0002_workflow_intake_recovery_alert.sql"]) sqlite.exec(readFileSync(new URL(`../db/migrations/${file}`, import.meta.url), "utf8"));
  ENV.WORKFLOW_INTAKE = binding(sqlite);
  console.error = (...args) => logs.push(args.join(" "));
  globalThis.fetch = async (url, options) => {
    assert.ok(["https://api.resend.com/emails/batch", "https://api.resend.com/emails"].includes(url), "Only the mocked mail provider may be called");
    const single = url.endsWith("/emails");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.authorization, "Bearer mock-test-only");
    if (!single) assert.equal(options.headers["x-batch-validation"], "strict", "The batch must reject invalid messages together");
    assert.ok(options.signal instanceof AbortSignal, "Provider requests must have a timeout signal");
    const call = { single, key: options.headers["Idempotency-Key"], body: options.body, batch: JSON.parse(options.body), signal: options.signal };
    calls.push(call);
    return provider(call);
  };
});
test.afterEach(() => { globalThis.fetch = realFetch; console.error = realError; sqlite.close(); });

test("valid intake queues separate team and owner emails with the same reference and 24-hour deadline", async () => {
  const data = input();
  const result = await post(data);
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.body, { ok: true, accepted: true, storageStatus: "saved", requestId: data.requestId, deadlineAt: new Date(Date.parse(data.submittedAt) + 86400000).toISOString(), emailStatus: "queued" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].key, `website-workflow-plan/${data.requestId}`);
  const [team, owner] = calls[0].batch;
  assert.deepEqual(team.to, ["qa-team@example.com", "qa-second@example.com"]);
  assert.equal(team.reply_to, data.email);
  assert.deepEqual(owner.to, [data.email]);
  assert.equal(owner.reply_to, "qa-team@example.com");
  assert.equal(owner.from, ENV.MAIL_FROM);
  for (const email of [team, owner]) {
    assert.ok(email.text.includes(data.requestId));
    assert.ok(email.text.includes(result.body.deadlineAt));
    assert.ok(email.text.includes(data.workflow));
    assert.ok(email.html.includes(data.requestId));
    assert.ok(email.html.includes(result.body.deadlineAt));
    assert.match(email.text, /24 hours/);
  }
  assert.match(owner.text, /preliminary, based on the facts you supplied/);
  assert.match(owner.text, /No meeting is needed/);
  assert.match(team.text, /Website: https:\/\/example.com\//);
  assert.equal(result.response.headers.get("cache-control"), "no-store");
  assert.equal(result.response.headers.get("access-control-allow-origin"), null);
});

test("existing default sender and the specified single-owner fallback work without optional bindings", async () => {
  assert.equal((await post(input(), { env: { RESEND_API_KEY: "mock-test-only" } })).body.ok, true);
  assert.deepEqual(calls[0].batch[0].to, ["cmyers@mainandmachine.com"]);
  assert.equal(calls[0].batch[1].reply_to, "cmyers@mainandmachine.com");
  assert.equal(calls[0].batch[0].from, "Main & Machine <hello@mainandmachine.com>");
});

test("all advertised workflow categories are accepted; prototype properties are not categories", async () => {
  for (const workflowType of ["leads", "operations", "reporting", "documents", "other"]) assert.equal((await post(input({ workflowType }))).body.ok, true);
  for (const workflowType of ["unknown", "__proto__", "constructor", null]) {
    const result = await post(input({ workflowType }));
    assert.equal(result.response.status, 422);
    assert.ok(result.body.errors.workflowType);
  }
  assert.equal(calls.length, 5);
});

test("HTML is escaped and plain-text workflow summaries survive without executing markup", async () => {
  const data = input({ name: 'QA <img src=x onerror="bad">', company: 'A&B <b>QA</b>', workflow: 'Review <script>alert("QA")</script> and move the results.\nThen notify the owner.' });
  assert.equal((await post(data)).body.ok, true);
  for (const mail of calls[0].batch) {
    assert.ok(!mail.html.includes("<script>"));
    assert.ok(!mail.html.includes("<img"));
    assert.ok(mail.html.includes("&lt;script&gt;"));
    assert.ok(mail.html.includes("<br />Then notify"));
    assert.ok(mail.text.includes(data.workflow));
  }
});

test("foreign origins, missing origins and cross-site requests cannot send mail", async () => {
  for (const options of [{ origin: "https://attacker.example" }, { origin: "https://other.mainandmachine.com" }, { origin: "null" }, { origin: null }, { headers: { "sec-fetch-site": "cross-site" } }]) {
    const result = await post(input(), options);
    assert.equal(result.response.status, 403);
    assert.equal(result.response.headers.get("access-control-allow-origin"), null);
  }
  assert.equal(calls.length, 0);
});

test("only JSON POST is allowed, including preflight requests", async () => {
  for (const method of ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "DELETE"]) {
    const result = await post(input(), { method });
    assert.equal(result.response.status, 405);
    assert.equal(result.response.headers.get("allow"), "POST");
  }
  for (const type of ["text/plain", "application/x-www-form-urlencoded", "application/jsonp"]) assert.equal((await post(input(), { headers: { "content-type": type } })).response.status, 415);
  assert.equal(calls.length, 0);
  assert.equal((await post(input(), { headers: { "content-type": "application/json; charset=utf-8" } })).body.ok, true);
});

test("malformed JSON, wrong top-level types and invalid UTF-8 fail before the provider", async () => {
  for (const raw of ["{", "null", "[]", '"string"', "0", new Uint8Array([0xc3, 0x28])]) assert.equal((await post(input(), { raw })).response.status, 400);
  assert.equal(calls.length, 0);
});

test("the actual body limit applies without Content-Length and with a misleading length", async () => {
  const raw = JSON.stringify(input({ workflow: "x".repeat(33000) }));
  for (const headers of [{}, { "content-length": "1" }, { "content-length": "33000" }, { "content-length": "invalid" }]) assert.equal((await post(input(), { raw, headers })).response.status, 413);
  assert.equal(calls.length, 0);
});

test("required fields, wrong types, maximum lengths and email header injection are rejected", async () => {
  const invalid = [
    ["workflow", "Too short"], ["workflow", "x".repeat(4001)], ["workflow", {}],
    ["tools", "x".repeat(601)], ["frequency", "x".repeat(161)], ["name", "X"], ["name", "x".repeat(121)],
    ["company", "X"], ["company", "x".repeat(161)], ["email", "not-an-email"], ["email", "qa@example.com\nBcc: hidden@example.com"],
    ["name", "QA\nOwner"], ["workflow", "Meaningful workflow text\u0000 with a control"], ["requestId", "not-a-uuid"],
  ];
  for (const [key, value] of invalid) {
    const result = await post(input({ [key]: value }));
    assert.equal(result.response.status, 422, key);
    assert.ok(result.body.errors[key], key);
  }
  assert.equal(calls.length, 0);
});

test("website fields cannot introduce unsafe schemes, credentials or non-text values", async () => {
  for (const website of ["javascript:alert(1)", "ftp://example.com", "https://user:password@example.com", "https://localhost", {}, "x".repeat(301)]) {
    const result = await post(input({ website }));
    assert.equal(result.response.status, 422);
    assert.ok(result.body.errors.website);
  }
  assert.equal(calls.length, 0);
});

test("legacy autofilled companyUrl cannot reject a legitimate request", async () => {
  for (const companyUrl of ["https://example.com", {}, ["https://example.com"]]) {
    const result = await post(input({ companyUrl }));
    assert.equal(result.response.status, 200);
    assert.equal(result.body.accepted, true);
    assert.equal(result.body.emailStatus, "queued");
  }
  assert.equal(calls.length, 3);
});

test("missing, future, invalid and expired timestamps do not bypass replay bounds", async () => {
  for (const submittedAt of [undefined, 1234, "invalid", "2026-02-30T00:00:00.000Z", new Date(Date.now() + 6 * 60000).toISOString(), new Date(Date.now() - 23 * 3600000).toISOString()]) {
    const result = await post(input({ submittedAt }));
    assert.equal(result.response.status, 422);
    assert.ok(result.body.errors.submittedAt);
  }
  for (const startedAt of [undefined, "1234", 0, NaN, Date.now() + 60000]) assert.equal((await post(input({ startedAt }))).response.status, 422);
  assert.equal(calls.length, 0);
});

test("the three-second fill guard can be retried with the unchanged original payload", async () => {
  const now = Date.now();
  const data = input({ startedAt: now, submittedAt: new Date(now).toISOString() });
  const originalNow = Date.now;
  try {
    Date.now = () => now;
    const early = await post(data);
    assert.equal(early.response.status, 429);
    assert.equal(early.body.retryable, true);
    assert.equal(early.response.headers.get("retry-after"), "3");
    assert.equal(calls.length, 0);
    Date.now = () => now + 4000;
    assert.equal((await post(data)).body.ok, true);
  } finally { Date.now = originalNow; }
});

test("an ordinary resend after a lost page response does not create duplicate notifications", async () => {
  const data = input();
  const first = await post(data);
  const second = await post(data);
  assert.deepEqual(second.body, first.body);
  assert.equal(sent.size, 1);
  assert.equal(calls.length, 1);
});

test("provider acceptance followed by a network failure retries identical bytes and sends only once", async () => {
  provider = (call) => {
    const result = accept(call);
    if (calls.length === 1) throw new TypeError("simulated response lost after acceptance");
    return result;
  };
  assert.equal((await post()).body.ok, true);
  assert.equal(calls.length, 2);
  assert.equal(sent.size, 1);
  assert.equal(calls[0].key, calls[1].key);
  assert.equal(calls[0].body, calls[1].body);
});

test("concurrent provider conflict retries the same request instead of changing the key", async () => {
  provider = (call) => calls.length === 1 ? response({ name: "concurrent_idempotent_requests" }, 409) : accept(call);
  assert.equal((await post()).body.ok, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].key, calls[1].key);
});

test("a changed payload under the same UUID fails explicitly and cannot send a second batch", async () => {
  const data = input();
  await post(data);
  const result = await post({ ...data, workflow: "Different information under a previously used request identity." });
  assert.equal(result.response.status, 409);
  assert.equal(result.body.code, "request_conflict");
  assert.equal(result.body.retryable, false);
  assert.equal(calls.length, 1);
  assert.equal(sent.size, 1);
});

test("a partial or malformed provider success saves intake without claiming queued mail", async () => {
  for (const payload of [{}, { data: [{ id: "only-team" }] }, { data: [{ id: "team" }, {}] }, { data: [{ id: "same-id" }, { id: "same-id" }] }, { data: [{ id: "team" }, { id: "owner" }], errors: ["partial failure"] }, { data: [{ id: "team" }, { id: "owner" }], error: "partial failure" }]) {
    provider = () => response(payload);
    const result = await post();
    assert.equal(result.response.status, 200);
    assert.equal(result.body.accepted, true);
    assert.equal(result.body.emailStatus, "pending");
  }
});

test("transient failures are bounded, permanent failures do not retry, and logs contain no submitted data", async () => {
  const data = input();
  provider = () => response({ name: "application_error", message: data.email }, 503);
  const failed = await post(data);
  assert.equal(failed.response.status, 200);
  assert.equal(failed.body.emailStatus, "pending");
  assert.equal(calls.length, 2);
  assert.ok(!logs.join(" ").includes(data.email));
  assert.ok(!logs.join(" ").includes(data.workflow));
  assert.ok(!logs.join(" ").includes(ENV.RESEND_API_KEY));
  provider = () => response({ name: "validation_error" }, 422);
  const permanent = await post();
  assert.equal(permanent.response.status, 200);
  assert.equal(permanent.body.emailStatus, "pending");
  assert.equal(calls.length, 3);
});

test("provider diagnostics trace the reference and status without submitted data or raw errors", async () => {
  const data = input();
  const privateValues = [data.name, data.email, data.company, data.workflow, data.tools, data.website, ENV.RESEND_API_KEY, ENV.LEAD_NOTIFY_TO, ENV.MAIL_FROM];
  const rawError = privateValues.join(" | ");
  provider = () => response({ name: rawError, message: rawError, errors: [rawError] }, 403);
  const result = await post(data);
  assert.equal(result.response.status, 200);
  assert.equal(result.body.emailStatus, "pending");
  assert.deepEqual(logs, [`[workflow-plan] ${JSON.stringify({ reason: "provider_rejected", requestId: data.requestId, providerStatus: 403 })}`]);
  for (const value of privateValues) assert.ok(!logs.join(" ").includes(value), `Diagnostics must exclude ${value}`);
});

test("local rejections identify the validated reference and reason without recording intake fields", async () => {
  const cases = [
    { data: input({ workflow: "short workflow" }), options: {}, reason: "validation_rejected", status: 422 },
    { data: input(), options: { env: {} }, reason: "mail_configuration_unavailable", status: 200 },
  ];
  for (const { data, options, reason, status } of cases) {
    logs = [];
    assert.equal((await post(data, options)).response.status, status);
    assert.deepEqual(logs, [`[workflow-plan] ${JSON.stringify({ reason, requestId: data.requestId })}`]);
  }
  assert.equal(calls.length, 0);
});

test("unvalidated reference values cannot inject private data or extra log lines", async () => {
  for (const requestId of ["qa-owner@example.com\nforged log", { private: "private workflow" }, "11111111-1111-4111-8111-111111111111\n"]) {
    logs = [];
    assert.equal((await post(input({ requestId }))).response.status, 422);
    assert.deepEqual(logs, ['[workflow-plan] {"reason":"validation_rejected"}']);
  }
  assert.equal(calls.length, 0);
});

test("conflicts, incomplete provider replies and interruptions remain traceable without raw errors", async () => {
  const data = input();
  for (const [mock, reason, providerStatus] of [
    [() => response({ name: "invalid_idempotent_request", message: data.email }, 409), "request_conflict", 409],
    [() => response({ data: [{ id: data.email }] }), "provider_response_incomplete", 200],
    [() => { throw new Error(data.email); }, "provider_request_interrupted", undefined],
  ]) {
    logs = [];
    provider = mock;
    assert.equal((await post({ ...data, requestId: randomUUID() })).body.emailStatus, "pending");
    assert.ok(logs.length > 0);
    for (const line of logs) {
      const diagnostic = JSON.parse(line.replace("[workflow-plan] ", ""));
      assert.equal(diagnostic.reason, reason);
      assert.equal(diagnostic.providerStatus, providerStatus);
      assert.ok(!line.includes(data.email));
    }
  }
});

test("provider Retry-After delays recovery without blocking the accepted receipt", async () => {
  provider = () => response({ name: "rate_limit_exceeded" }, 429, { "retry-after": "600" });
  const data = input();
  const result = await post(data);
  assert.equal(result.response.status, 200);
  assert.equal(result.body.emailStatus, "pending");
  const row = await findIntake(ENV, data.requestId);
  assert.ok(row.next_attempt_at >= Date.now() + 599000);
  assert.equal(calls.length, 1);
});

test("timeouts abort outstanding requests and never assert that mail was accepted", async () => {
  const originalTimer = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms, ...args) => originalTimer(fn, Math.min(ms, 1), ...args);
  provider = (call) => new Promise((resolve, reject) => {
    call.signal.addEventListener("abort", () => reject(new DOMException("Test timeout", "AbortError")), { once: true });
  });
  try {
    const result = await post();
    assert.equal(result.response.status, 200);
    assert.equal(result.body.accepted, true);
    assert.equal(result.body.emailStatus, "pending");
    assert.equal(calls.length, 2);
    assert.ok(calls.every((call) => call.signal.aborted));
  } finally { globalThis.setTimeout = originalTimer; }
});

test("missing or invalid mail configuration preserves a recoverable intake without calling provider", async () => {
  for (const env of [{}, { ...ENV, LEAD_NOTIFY_TO: ",," }, { ...ENV, LEAD_NOTIFY_TO: "not-email" }, { ...ENV, MAIL_FROM: "Bad\nBcc:other@example.com" }]) {
    const result = await post(input(), { env });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.emailStatus, "pending");
    assert.equal(result.body.storageStatus, "saved");
  }
  assert.equal(calls.length, 0);
});

test("optional KV rate limiting caps attempts, hashes IPs, and tolerates KV outages", async () => {
  const kv = new Map();
  const binding = { get: async (key) => kv.get(key), put: async (key, value, options) => { assert.equal(options.expirationTtl, 3600); kv.set(key, value); } };
  const options = { env: { ...ENV, RATE_LIMIT: binding }, headers: { "CF-Connecting-IP": "192.0.2.42" } };
  for (let i = 0; i < 10; i += 1) assert.equal((await post(input(), options)).body.ok, true);
  const limited = await post(input(), options);
  assert.equal(limited.response.status, 429);
  assert.equal(limited.response.headers.get("retry-after"), "3600");
  assert.equal(calls.length, 10);
  assert.ok([...kv.keys()].every((key) => !key.includes("192.0.2.42")));
  const outage = { ...ENV, RATE_LIMIT: { get: async () => { throw new Error("mock outage"); } } };
  assert.equal((await post(input(), { ...options, env: outage })).body.ok, true);
});

test("both canonical production origins work while preview origins cannot borrow production permission", async () => {
  assert.equal((await post(input(), { origin: "https://mainandmachine.com", headers: { "sec-fetch-site": "same-site" } })).body.emailStatus, "queued");
  const request = new Request("https://preview.pages.dev/api/workflow-plan", { method: "POST", headers: { origin: ORIGIN, "content-type": "application/json" }, body: JSON.stringify(input()) });
  assert.equal((await onRequest({ request, env: ENV })).status, 403);
});

test("storage is committed before email and a storage outage never produces an accepted receipt", async () => {
  const data = input();
  provider = async call => {
    const row = await findIntake(ENV, data.requestId);
    assert.equal(JSON.parse(row.payload_json).workflow, data.workflow);
    assert.equal(row.email_status, "pending");
    assert.equal(row.batch_json, call.body);
    return accept(call);
  };
  assert.equal((await post(data)).body.emailStatus, "queued");
  for (const WORKFLOW_INTAKE of [null, { prepare() { throw new Error("private database credentials"); } }]) {
    const result = await post(input(), { env: { ...ENV, WORKFLOW_INTAKE } });
    assert.equal(result.response.status, 503);
    assert.equal(result.body.accepted, false);
    assert.equal(result.body.code, "intake_storage_unavailable");
    assert.equal(result.body.retryable, true);
  }
  assert.equal(calls.length, 1);
  assert.ok(!logs.join(" ").includes("private database credentials"));
});

test("simultaneous browser retries share one atomic intake and one provider attempt", async () => {
  const data = input();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let signal;
  const started = new Promise(resolve => { signal = resolve; });
  provider = async call => { signal(); await gate; return accept(call); };
  const first = post(data);
  await started;
  const second = await post(data);
  assert.equal(second.body.emailStatus, "pending");
  release();
  assert.equal((await first).body.emailStatus, "queued");
  assert.equal((await post(data)).body.emailStatus, "queued");
  assert.equal(calls.length, 1);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM workflow_intakes").get().count, 1);
});

test("scheduled recovery resends the immutable batch after failure even when mail settings change", async () => {
  const data = input();
  provider = () => response({ name: "invalid_api_key" }, 401);
  const saved = await post(data);
  assert.equal(saved.body.emailStatus, "pending");
  const originalBody = calls[0].body;
  sqlite.prepare("UPDATE workflow_intakes SET next_attempt_at = 0 WHERE request_id = ?").run(data.requestId);
  provider = accept;
  const counts = await retryPendingIntakes({ ...ENV, MAIL_FROM: "Changed <new@example.com>", LEAD_NOTIFY_TO: "new-team@example.com" });
  assert.equal(counts.queued, 1);
  assert.equal(counts.pending, 0);
  assert.equal(calls[1].body, originalBody);
  assert.equal(calls[1].key, calls[0].key);
  assert.equal((await findIntake(ENV, data.requestId)).email_status, "queued");
  await retryPendingIntakes(ENV);
  assert.equal(calls.length, 2);
});

test("provider acceptance followed by a lost D1 update remains safely recoverable", async () => {
  const data = input();
  let injected = false;
  const native = ENV.WORKFLOW_INTAKE;
  const broken = { prepare(sql) {
    if (!injected && sql.includes("SET email_status = ?")) {
      injected = true;
      return { bind() { return { run: async () => { throw new Error("simulated update outage"); } }; } };
    }
    return native.prepare(sql);
  } };
  const first = await post(data, { env: { ...ENV, WORKFLOW_INTAKE: broken } });
  assert.equal(first.body.emailStatus, "pending");
  assert.equal(sent.size, 1);
  sqlite.prepare("UPDATE workflow_intakes SET lease_until = 0, next_attempt_at = 0 WHERE request_id = ?").run(data.requestId);
  const recovered = await retryPendingIntakes(ENV);
  assert.equal(recovered.queued, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body, calls[1].body);
  assert.equal(sent.size, 1);
});

test("late legacy retries stop at original submittedAt cutoff and alert only internal recipients once", async () => {
  const now = Date.now();
  const data = input({ submittedAt: new Date(now - 22 * 3600000).toISOString(), startedAt: now - 22 * 3600000 - 60000 });
  provider = () => response({ name: "application_error" }, 503);
  assert.equal((await post(data)).body.emailStatus, "pending");
  const batchCalls = calls.length;
  const originalNow = Date.now;
  try {
    Date.now = () => now + 2 * 3600000;
    provider = accept;
    const recovered = await retryPendingIntakes(ENV);
    assert.equal(recovered.needs_review, 1);
    assert.equal(recovered.unalerted, 0);
    assert.equal(calls.length, batchCalls + 1);
    const alert = calls.at(-1);
    assert.equal(alert.single, true);
    assert.equal(alert.key, `website-workflow-plan-review/${data.requestId}`);
    assert.deepEqual(alert.batch.to, ["qa-team@example.com", "qa-second@example.com"]);
    assert.ok(!alert.batch.to.includes(data.email));
    assert.match(alert.batch.subject, /Manual review needed/);
    assert.ok(alert.batch.text.includes(data.workflow));
    assert.equal((await findIntake(ENV, data.requestId)).review_status, "queued");
    await retryPendingIntakes(ENV);
    assert.equal(calls.length, batchCalls + 1);
  } finally { Date.now = originalNow; }
});

test("recovery-alert retries have their own immutable payload and safe dedupe cutoff", async () => {
  const now = Date.now();
  const data = input();
  provider = () => response({ name: "invalid_idempotent_request" }, 409);
  await post(data);
  provider = () => response({ name: "invalid_api_key" }, 401);
  await retryPendingIntakes(ENV);
  const originalAlert = calls.at(-1).body;
  sqlite.prepare("UPDATE workflow_intakes SET review_next_attempt_at = 0 WHERE request_id = ?").run(data.requestId);
  await retryPendingIntakes({ ...ENV, LEAD_NOTIFY_TO: "changed@example.com" });
  assert.equal(calls.at(-1).body, originalAlert);
  const attempts = calls.length;
  const originalNow = Date.now;
  try {
    Date.now = () => now + 24 * 3600000;
    const state = await retryPendingIntakes(ENV);
    assert.equal(state.unalerted, 1);
    assert.equal(calls.length, attempts);
    assert.equal((await findIntake(ENV, data.requestId)).review_status, "expired");
  } finally { Date.now = originalNow; }
});

test("scheduled cleanup removes private intake details after the stated retention window", async () => {
  const data = input();
  await post(data);
  const row = await findIntake(ENV, data.requestId);
  assert.equal(row.expires_at - row.created_at, 90 * 86400000);
  const originalNow = Date.now;
  try {
    Date.now = () => row.expires_at + 1;
    await retryPendingIntakes(ENV);
    assert.equal(await findIntake(ENV, data.requestId), null);
    assert.equal(calls.length, 1);
  } finally { Date.now = originalNow; }
});

test("persistent pending mail alerts the team within thirty minutes using corrected operator settings", async () => {
  const now = Date.now();
  const data = input();
  provider = () => response({ name: "invalid_api_key" }, 401);
  await post(data);
  const originalNow = Date.now;
  try {
    Date.now = () => now + 31 * 60000;
    provider = call => call.single ? accept(call) : response({ name: "invalid_api_key" }, 401);
    const counts = await retryPendingIntakes({ ...ENV, MAIL_FROM: "Fixed <fixed@example.com>", LEAD_NOTIFY_TO: "fixed-team@example.com" });
    const alert = calls.find(call => call.single);
    assert.ok(alert);
    assert.deepEqual(alert.batch.to, ["fixed-team@example.com"]);
    assert.equal(alert.batch.from, "Fixed <fixed@example.com>");
    assert.equal(counts.pending, 1);
    assert.equal(counts.unalerted, 0);
    assert.equal((await findIntake(ENV, data.requestId)).review_status, "queued");
    assert.equal((await findIntake(ENV, data.requestId)).email_status, "pending");
  } finally { Date.now = originalNow; }
});

test("scheduled work shares its send budget fairly between alerts and normal retries", async () => {
  const now = Date.now();
  provider = () => response({ name: "invalid_api_key" }, 401);
  for (let i = 0; i < 8; i += 1) await post(input());
  calls = [];
  const originalNow = Date.now;
  try {
    Date.now = () => now + 31 * 60000;
    const counts = await retryPendingIntakes(ENV, { limit: 5 });
    assert.equal(counts.attempted + counts.alertsAttempted, 5);
    assert.equal(counts.alertsAttempted, 3);
    assert.equal(counts.attempted, 2);
    assert.equal(calls.length, 5);
    assert.equal(calls.filter(call => call.single).length, 3);
  } finally { Date.now = originalNow; }
});
