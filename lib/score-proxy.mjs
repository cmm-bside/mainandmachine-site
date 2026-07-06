// lib/score-proxy.mjs
// Reverse-proxy the AI-Ready Score app (Vercel) onto the apex at /score/* and
// /s/* so analytics, cookies, and SEO authority live on mainandmachine.com.
// Pure passthrough: no nav/footer injection, body untouched — the app ships
// standalone-clean (see _headers, which detaches the site CSP for these paths).
//
// Origin defaults to the verified working host below; override with the
// SCORE_ORIGIN env var (Pages → Settings → Environment variables, Production +
// Preview) to point at a dedicated non-redirecting origin later. The fetch is
// tagged `x-mm-proxy: 1` so a later "score.-subdomain -> apex" browser 301 can
// except it and not loop.
const DEFAULT_ORIGIN = "https://score.mainandmachine.com";

export async function proxyScore({ request, env }) {
  const origin = ((env && env.SCORE_ORIGIN) || DEFAULT_ORIGIN).replace(/\/+$/, "");

  const url = new URL(request.url);
  const originHost = new URL(origin).host;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", "https");
  headers.set("x-mm-proxy", "1");

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const upstream = await fetch(origin + url.pathname + url.search, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: "manual",                       // rewrite app redirects onto the apex
    ...(hasBody ? { duplex: "half" } : {}),
  });

  const out = new Headers(upstream.headers);

  // Keep app redirects (e.g. /s/ch05 -> /score?utm=…) on the apex.
  const location = out.get("location");
  if (location) {
    try {
      const loc = new URL(location, origin);
      if (loc.host === originHost) out.set("location", url.origin + loc.pathname + loc.search);
    } catch { /* non-URL Location: leave as-is */ }
  }

  // Bind cookies to the apex: drop any Domain= that scopes them to the origin
  // host, so the browser accepts them on mainandmachine.com (host-only).
  if (out.has("set-cookie")) {
    const esc = originHost.replace(/\./g, "\\.");
    const fixed = out.getSetCookie().map((c) => c.replace(new RegExp(`;\\s*Domain=\\.?${esc}`, "i"), ""));
    out.delete("set-cookie");
    for (const c of fixed) out.append("set-cookie", c);
  }

  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
}
