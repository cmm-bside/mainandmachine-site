import { retryPendingIntakes } from "../../_lib/workflow-intake.js";

const reply = (value, status = 200) => Response.json(value, {
  status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
});

async function authorized(request, secret) {
  if (typeof secret !== "string" || secret.length < 32) return false;
  const token = request.headers.get("authorization") || "";
  if (!token.startsWith("Bearer ") || token.length > 256) return false;
  const encoder = new TextEncoder();
  const [actual, expected] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(token.slice(7))),
    crypto.subtle.digest("SHA-256", encoder.encode(secret)),
  ]);
  const left = new Uint8Array(actual), right = new Uint8Array(expected);
  let difference = 0;
  for (let i = 0; i < left.length; i += 1) difference |= left[i] ^ right[i];
  return difference === 0;
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return reply({ ok: false }, 405);
  if (!await authorized(request, env.WORKFLOW_RETRY_SECRET)) return reply({ ok: false }, 401);
  try {
    const result = await retryPendingIntakes(env, { limit: 5 });
    return reply({ ok: true, ...result });
  } catch {
    console.error('[workflow-plan] {"reason":"recovery_job_failed"}');
    return reply({ ok: false }, 503);
  }
}
