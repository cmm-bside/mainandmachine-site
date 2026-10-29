// Scheduled recovery only. No public endpoint or intake data is exposed.
export default {
  async scheduled(_controller, env, context) {
    context.waitUntil(runRecovery(env));
  },
};

export async function runRecovery(env, fetchImpl = fetch) {
  if (typeof env.WORKFLOW_RETRY_SECRET !== "string" || env.WORKFLOW_RETRY_SECRET.length < 32) {
    throw new Error("Workflow recovery secret is unavailable");
  }
  const response = await fetchImpl("https://www.mainandmachine.com/api/internal/workflow-plan-retry", {
    method: "POST",
    headers: { authorization: `Bearer ${env.WORKFLOW_RETRY_SECRET}` },
    signal: AbortSignal.timeout(120000),
    redirect: "error",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.ok !== true) throw new Error(`Workflow recovery failed (${response.status})`);
  const counts = {};
  for (const name of ["attempted", "alertsAttempted", "pending", "queued", "needs_review", "unalerted"]) {
    if (Number.isSafeInteger(result[name]) && result[name] >= 0) counts[name] = result[name];
  }
  const line = JSON.stringify({ event: "workflow_recovery", ...counts });
  if (counts.needs_review > 0 || counts.unalerted > 0) console.error(line); else console.log(line);
  return counts;
}
