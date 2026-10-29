import test from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../functions/api/internal/workflow-plan-retry.js";
import { runRecovery } from "../workers/workflow-plan-retry/index.js";

const secret = "synthetic-recovery-token-".repeat(3);
test("recovery route rejects unauthenticated or foreign tokens without accessing intake records", async () => {
  for (const authorization of [null, "Bearer wrong", "Basic anything"]) {
    let touched = false;
    const env = { WORKFLOW_RETRY_SECRET: secret, get WORKFLOW_INTAKE() { touched = true; throw new Error("must not access"); } };
    const request = new Request("https://www.mainandmachine.com/api/internal/workflow-plan-retry", {
      method: "POST", headers: authorization ? { authorization } : {},
    });
    assert.equal((await onRequest({ request, env })).status, 401);
    assert.equal(touched, false);
  }
});
test("recovery does not accept a missing secret or a GET request", async () => {
  assert.equal((await onRequest({ request: new Request("https://example.test", { method: "POST" }), env: {} })).status, 401);
  assert.equal((await onRequest({ request: new Request("https://example.test"), env: {} })).status, 405);
});
test("scheduled recovery authenticates only to the production endpoint and returns counts only", async () => {
  const counts = await runRecovery({ WORKFLOW_RETRY_SECRET: secret }, async (url, options) => {
    assert.equal(url, "https://www.mainandmachine.com/api/internal/workflow-plan-retry");
    assert.equal(options.headers.authorization, `Bearer ${secret}`);
    assert.equal(options.redirect, "error");
    return Response.json({ ok: true, attempted: 1, queued: 1, pending: 0, needs_review: 0, privateData: "never logged" });
  });
  assert.deepEqual(counts, { attempted: 1, pending: 0, queued: 1, needs_review: 0 });
});
test("failed recovery is reported as an error without returning provider response details", async () => {
  await assert.rejects(runRecovery({ WORKFLOW_RETRY_SECRET: secret }, async () => Response.json({ error: secret }, { status: 503 })), /^Error: Workflow recovery failed \(503\)$/);
});
