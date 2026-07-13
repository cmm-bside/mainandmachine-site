// First-party proxy for Plausible's event ingestion (pairs with
// functions/js/pa.js). Forwards the beacon body untouched and passes the
// real client IP + User-Agent through, which is what Plausible's cookieless
// unique-visitor hashing and geolocation key on. No PII is added: the body
// is the pa script's own payload (event name, URL, props — see
// analytics-events.md for the no-PII props contract).
const UPSTREAM = "https://plausible.io/api/event";

export async function onRequestPost({ request }) {
  const headers = {
    "Content-Type": request.headers.get("content-type") || "text/plain",
    "User-Agent": request.headers.get("user-agent") || "",
  };
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) headers["X-Forwarded-For"] = ip;

  const upstream = await fetch(UPSTREAM, {
    method: "POST",
    headers,
    body: request.body,
  }).catch(() => null);

  // Fire-and-forget semantics: the page never cares beyond a status.
  return new Response(null, { status: upstream ? upstream.status : 202 });
}
