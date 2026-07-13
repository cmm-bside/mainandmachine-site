// Serves /js/pa (Pages Functions strip the .js extension from this file's
// route). First-party proxy for the Plausible tracker script, so ad-blockers that
// blanket-block plausible.io don't blind analytics. Serves the site-specific
// pa-* build (which pins domain=mainandmachine.com internally) from our own
// origin; pages point plausible.init() at the /api/event proxy next door.
// Edge-cached for 6h — Plausible ships script updates rarely and the pa
// build is versioned server-side.
const UPSTREAM = "https://plausible.io/js/pa-Yipfpj7KIiywp6RYmahGL.js";

export async function onRequestGet() {
  const upstream = await fetch(UPSTREAM, {
    cf: { cacheTtl: 21600, cacheEverything: true },
  });
  if (!upstream.ok) {
    // Never break pages over analytics: return an empty no-op script.
    return new Response("/* plausible upstream unavailable */", {
      status: 200,
      headers: { "Content-Type": "application/javascript", "Cache-Control": "public, max-age=300" },
    });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=21600",
    },
  });
}
