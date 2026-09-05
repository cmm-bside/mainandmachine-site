// Exercises the production handler with an in-memory provider. Never sends mail.
// Run: node --test scripts/test-workflow-plan.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { onRequest } from "../functions/api/workflow-plan.js";

const ORIGIN = "https://www.mainandmachine.com";
const ENV = { RESEND_API_KEY: "mock-test-only", LEAD_NOTIFY_TO: "qa-team@example.com,qa-second@example.com", MAIL_FROM: "QA <qa-sender@example.com>" };
const realFetch = globalThis.fetch;
const realError = console.error;
let calls = [];
let logs = [];
let provider;
let sent;

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
  const result = { data: [{ id: "mock-team-id" }, { id: "mock-owner-id" }] };
  sent.set(call.key, { body: call.body, result });
  return response(result);
}

async function post(body = input(), { origin = ORIGIN, headers = {}, env = ENV, raw, method = "POST" } = {}) {
  const request = new Request(`${ORIGIN}/api/workflow-plan`, {
    method,
    headers: { "content-type": "application/json", ...(origin === null ? {} : { origin }), ...headers },
    ...(["GET", "HEAD"].includes(method) ? {} : { body: raw ?? JSON.stringify(body) }),
  });
  const result = await onRequest({ request, env });
  return { response: result, body: await result.json() };
}

test.beforeEach(() => {
  calls = []; logs = []; sent = new Map(); provider = accept;
  console.error = (...args) => logs.push(args.join(" "));
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails/batch", "Only the mocked mail provider may be called");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.authorization, "Bearer mock-test-only");
    assert.equal(options.headers["x-batch-validation"], "strict", "The batch must reject invalid messages together");
    assert.ok(options.signal instanceof AbortSignal, "Provider requests must have a timeout signal");
    const call = { key: options.headers["Idempotency-Key"], body: options.body, batch: JSON.parse(options.body), signal: options.signal };
    calls.push(call);
    return provider(call);
  };
});
test.afterEach(() => { globalThis.fetch = realFetch; console.error = realError; });

test("valid intake queues separate team and owner emails with the same reference and 24-hour deadline", async () => {
  const data = input();
  const result = await post(data);
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.body, { ok: true, requestId: data.requestId, deadlineAt: new Date(Date.parse(data.submittedAt) + 86400000).toISOString(), emailStatus: "queued" });
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

test("cross-origin, sibling-origin, missing-origin and cross-site requests cannot send mail", async () => {
  for (const options of [{ origin: "https://attacker.example" }, { origin: "https://mainandmachine.com" }, { origin: "null" }, { origin: null }, { headers: { "sec-fetch-site": "cross-site" } }, { headers: { "sec-fetch-site": "same-site" } }]) {
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

test("honeypots cannot send mail and never produce a false accepted receipt", async () => {
  for (const companyUrl of ["https://spam.example", {}, ["https://spam.example"]]) {
    const result = await post(input({ companyUrl }));
    assert.equal(result.response.status, 422);
    assert.equal(result.body.ok, false);
  }
  assert.equal(calls.length, 0);
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
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body, calls[1].body);
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
  assert.equal(calls.length, 2);
  assert.equal(sent.size, 1);
});

test("a partial or malformed provider success cannot produce a success receipt", async () => {
  for (const payload of [{}, { data: [{ id: "only-team" }] }, { data: [{ id: "team" }, {}] }, { data: [{ id: "same-id" }, { id: "same-id" }] }, { data: [{ id: "team" }, { id: "owner" }], errors: ["partial failure"] }, { data: [{ id: "team" }, { id: "owner" }], error: "partial failure" }]) {
    provider = () => response(payload);
    const result = await post();
    assert.equal(result.response.status, 502);
    assert.equal(result.body.ok, false);
  }
});

test("transient failures are bounded, permanent failures do not retry, and logs contain no submitted data", async () => {
  const data = input();
  provider = () => response({ name: "application_error", message: data.email }, 503);
  const failed = await post(data);
  assert.equal(failed.response.status, 502);
  assert.equal(failed.body.retryable, true);
  assert.equal(calls.length, 2);
  assert.ok(!logs.join(" ").includes(data.email));
  assert.ok(!logs.join(" ").includes(data.workflow));
  assert.ok(!logs.join(" ").includes(ENV.RESEND_API_KEY));
  provider = () => response({ name: "validation_error" }, 422);
  const permanent = await post();
  assert.equal(permanent.response.status, 502);
  assert.equal(permanent.body.retryable, false);
  assert.equal(calls.length, 3);
});

test("provider Retry-After is preserved without blocking the function for a long sleep", async () => {
  provider = () => response({ name: "rate_limit_exceeded" }, 429, { "retry-after": "60" });
  const result = await post();
  assert.equal(result.response.status, 502);
  assert.equal(result.body.retryable, true);
  assert.equal(result.response.headers.get("retry-after"), "60");
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
    assert.equal(result.response.status, 502);
    assert.equal(result.body.ok, false);
    assert.equal(calls.length, 2);
    assert.ok(calls.every((call) => call.signal.aborted));
  } finally { globalThis.setTimeout = originalTimer; }
});

test("missing or invalid mail configuration fails without a provider request", async () => {
  for (const env of [{}, { ...ENV, LEAD_NOTIFY_TO: ",," }, { ...ENV, LEAD_NOTIFY_TO: "not-email" }, { ...ENV, MAIL_FROM: "Bad\nBcc:other@example.com" }]) {
    const result = await post(input(), { env });
    assert.equal(result.response.status, 503);
    assert.equal(result.body.retryable, false);
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
