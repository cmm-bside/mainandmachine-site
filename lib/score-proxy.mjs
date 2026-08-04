// lib/score-proxy.mjs
// Reverse-proxy the AI-Ready Score app (Vercel) onto the apex at /score/* and
// /s/* so analytics, cookies, and SEO authority live on mainandmachine.com.
// Passthrough for everything except the /score landing document, which gets
// the site's SEO head injected below (canonical, title, JSON-LD) — the app
// ships standalone-clean otherwise (see _headers, which detaches the site CSP
// for these paths).
//
// Origin defaults to the verified working host below; override with the
// SCORE_ORIGIN env var (Pages → Settings → Environment variables, Production +
// Preview) to point at a dedicated non-redirecting origin later. The fetch is
// tagged `x-mm-proxy: 1` so a later "score.-subdomain -> apex" browser 301 can
// except it and not loop.
import { COMPANY } from "../src/data/company.mjs";

const DEFAULT_ORIGIN = "https://score.mainandmachine.com";

// --- SEO head for the landing page ------------------------------------------
// The app serves the HTML, but the apex URL belongs to this proxy, so the
// proxy owns the SEO head. Canonical form is TRAILING-SLASH (/score/), matching
// the rest of the site: the proxy 301s bare /score → /score/, serves the
// /score/ document by fetching the app's slash-less route directly (the Next
// app itself still 308s /score/ → /score — that redirect never reaches the
// browser), and normalizes app-issued Locations so nothing chains. Injected
// only on the landing document — assets, sub-routes, and /s/* untouched.
const SCORE_URL = `${COMPANY.origin}/score/`;
// 60 characters exactly — the SERP truncation limit check-meta.mjs enforces
// and head:check has always enforced on the static pages. This one sat at 64
// because it lives in the proxy, where no guard could see it; only "The" was
// dropped, so every keyword survives.
export const SCORE_TITLE = "AI-Ready Score: Free 7-Minute AI Assessment | Main & Machine";
export const SCORE_DESCRIPTION =
  "A 0–100 readiness score, your phase (Map, Prove, or Expand), and the one constraint to fix first. Free, seven minutes, no login.";

// Same @graph shape as the static pages (see calculator/index.html), plus a
// WebPage/WebApplication node for the assessment itself.
export const SCORE_GRAPH = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfessionalService",
      "@id": `${COMPANY.origin}/#org`,
      "sameAs": [
        "https://www.linkedin.com/company/main-and-machine/",
        "https://x.com/mainandmachine",
      ],
      "name": COMPANY.name,
      "url": `${COMPANY.origin}/`,
      "logo": `${COMPANY.origin}/icon-512.png`,
      "image": `${COMPANY.origin}/og-image.png`,
      "email": COMPANY.email,
      "telephone": COMPANY.phoneE164,
      "priceRange": "$3,500–$60,000",
      "areaServed": "US",
      "slogan": COMPANY.slogan,
      "address": [
        { "@type": "PostalAddress", "addressLocality": "Denver", "addressRegion": "CO", "addressCountry": "US" },
        { "@type": "PostalAddress", "addressLocality": "Phoenix", "addressRegion": "AZ", "addressCountry": "US" },
      ],
      "founder": { "@id": `${COMPANY.origin}/#person-cmyers` },
    },
    {
      "@type": "WebSite",
      "@id": `${COMPANY.origin}/#website`,
      "name": COMPANY.name,
      "url": `${COMPANY.origin}/`,
    },
    {
      "@type": "Person",
      "@id": `${COMPANY.origin}/#person-cmyers`,
      "sameAs": [
        "https://www.linkedin.com/in/cmyers85/",
        "https://x.com/Chris_myers",
        "https://www.entrepreneur.com/author/christopher-myers",
        "https://search.asu.edu/profile/559969",
        "https://www.amazon.com/stores/author/B01LBGCKWM/about",
        "https://www.bside.org",
      ],
      "name": COMPANY.founder.name,
      "jobTitle": COMPANY.founder.title,
      "worksFor": { "@id": `${COMPANY.origin}/#org` },
    },
    {
      "@type": ["WebPage", "WebApplication"],
      "@id": `${SCORE_URL}#webpage`.replace("/#", "#"),
      "url": SCORE_URL,
      "name": "The AI-Ready Score",
      "description": SCORE_DESCRIPTION,
      "isAccessibleForFree": true,
      "applicationCategory": "BusinessApplication",
      "provider": { "@id": `${COMPANY.origin}/#org` },
      "isPartOf": { "@id": `${COMPANY.origin}/#website` },
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": COMPANY.name, "item": `${COMPANY.origin}/` },
        { "@type": "ListItem", "position": 2, "name": "The AI-Ready Score", "item": SCORE_URL },
      ],
    },
  ],
};

// FAQPage ships as its own ld+json block, matching the site convention
// (scripts/inject-faq.mjs). Answers restate the on-page copy — keep them in
// step with the app's landing copy if that changes.
export const SCORE_FAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is the AI-Ready Score?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A free self-assessment for small and mid-size businesses: fourteen questions across three phases — Map, Prove, Expand — that measure how ready your business is for AI. Built by Main & Machine.",
      },
    },
    {
      "@type": "Question",
      "name": "How long does it take?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "About seven minutes. Fourteen questions, no login.",
      },
    },
    {
      "@type": "Question",
      "name": "Is it free?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. It costs $0, and there is no sales call.",
      },
    },
    {
      "@type": "Question",
      "name": "What do I get at the end?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A 0–100 readiness score, your phase (Map, Prove, or Expand), and the one constraint holding you back — with what to do about it first.",
      },
    },
  ],
};

// Social cards. The Score app ships NO og:* or twitter:* tags of its own —
// verified against the live document, which carries only <title>, description
// and a favicon — so /score/ was the one route on the domain that shared as a
// bare link with no card at all. The proxy already owns this head, so the whole
// set is injected here rather than added upstream: the apex URL is what gets
// shared, the canonical and JSON-LD already live here, and keeping them in one
// place means the app can be redeployed without silently dropping the card.
//
// The image is a real committed file in this repo (scripts/build-og.mjs renders
// it from the EXPLICIT map — /score/ has no HTML here to derive one from), and
// it is referenced ABSOLUTELY: an OG consumer is a bot on another host, and a
// root-relative path is not resolvable to it.
// Exported so scripts/check-meta.mjs can hold this route to the same rules as
// every other page — it has no HTML file to walk, so without this it would be
// the one route the meta lint cannot see.
export const SCORE_OG_IMAGE = `${COMPANY.origin}/images/og/score.png`;
const SCORE_OG_ALT = "The AI-Ready Score — 14 questions · 7 minutes · $0 · No sales call";

// These strings go into ATTRIBUTE values via HTMLRewriter's html:true append,
// which inserts raw markup and escapes nothing. SCORE_TITLE ends in
// "| Main & Machine" — a bare & inside an attribute is invalid HTML and is
// exactly the kind of thing a strict OG parser trips on.
const attr = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const SEO_HEAD_HTML = [
  `<link rel="canonical" href="${attr(SCORE_URL)}">`,
  `<meta property="og:type" content="website">`,
  `<meta property="og:site_name" content="${attr(COMPANY.name)}">`,
  `<meta property="og:title" content="${attr(SCORE_TITLE)}">`,
  `<meta property="og:description" content="${attr(SCORE_DESCRIPTION)}">`,
  `<meta property="og:url" content="${attr(SCORE_URL)}">`,
  `<meta property="og:image" content="${attr(SCORE_OG_IMAGE)}">`,
  `<meta property="og:image:type" content="image/png">`,
  `<meta property="og:image:width" content="1200">`,
  `<meta property="og:image:height" content="630">`,
  `<meta property="og:image:alt" content="${attr(SCORE_OG_ALT)}">`,
  `<meta name="twitter:card" content="summary_large_image">`,
  `<meta name="twitter:title" content="${attr(SCORE_TITLE)}">`,
  `<meta name="twitter:description" content="${attr(SCORE_DESCRIPTION)}">`,
  `<meta name="twitter:image" content="${attr(SCORE_OG_IMAGE)}">`,
  `<meta name="twitter:image:alt" content="${attr(SCORE_OG_ALT)}">`,
  `<script type="application/ld+json">${JSON.stringify(SCORE_GRAPH)}</script>`,
  `<script type="application/ld+json">${JSON.stringify(SCORE_FAQ)}</script>`,
].join("\n");

export async function proxyScore({ request, env }) {
  const origin = ((env && env.SCORE_ORIGIN) || DEFAULT_ORIGIN).replace(/\/+$/, "");

  const url = new URL(request.url);
  const originHost = new URL(origin).host;

  // Canonical is /score/ (site-wide trailing-slash convention). Bare /score
  // gets one permanent hop; the query string rides along (QR/utm links).
  if (url.pathname === "/score") {
    return new Response(null, {
      status: 301,
      headers: { Location: url.origin + "/score/" + url.search, "Cache-Control": "public, max-age=3600" },
    });
  }

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", "https");
  headers.set("x-mm-proxy", "1");

  // The app ships with basePath /score — every route (pages, /_next assets,
  // API) lives under /score/* at the origin. Two bare apex namespaces still
  // map onto it: /s/* (the printed QR contract — permanent) and /_next/*
  // (stale-cached-HTML asset compat — removable once functions/_next is).
  // The canonical /score/ document maps onto the app's slash-less route (the
  // app would 308 /score/ → /score; fetching /score directly avoids the hop).
  const upstreamPath = /^\/(s(\/|$)|_next\/)/.test(url.pathname)
    ? "/score" + url.pathname
    : url.pathname === "/score/"
      ? "/score"
      : url.pathname;

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const upstream = await fetch(origin + upstreamPath + url.search, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: "manual",                       // rewrite app redirects onto the apex
    ...(hasBody ? { duplex: "half" } : {}),
  });

  const out = new Headers(upstream.headers);

  // Keep app redirects (e.g. /s/ch05 -> /score?utm=…) on the apex, and
  // normalize any app-issued /score Location to the canonical /score/ so a
  // QR scan resolves in ONE hop instead of chaining through the 301 above.
  const location = out.get("location");
  if (location) {
    try {
      const loc = new URL(location, origin);
      if (loc.host === originHost) {
        const p = loc.pathname === "/score" ? "/score/" : loc.pathname;
        out.set("location", url.origin + p + loc.search);
      }
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

  const response = new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });

  // SEO head injection — the /score landing document only (query strings from
  // /s/* UTM redirects included; the canonical collapses them). HTMLRewriter
  // is a Workers global; the guard keeps this module importable in Node tests.
  if (
    (url.pathname === "/score" || url.pathname === "/score/") &&
    upstream.status === 200 &&
    (out.get("content-type") || "").includes("text/html") &&
    typeof HTMLRewriter !== "undefined"
  ) {
    return new HTMLRewriter()
      .on("head > title", { element(el) { el.setInnerContent(SCORE_TITLE); } })
      // Drop any social/canonical tags the APP emits before appending ours.
      // It ships none today (verified against the live document), but it lives
      // in a separate repo and deploys on its own schedule — the day someone
      // adds a Next.js `metadata` export, this head would carry two og:image
      // values and consumers pick between them unpredictably. Removing first
      // makes the proxy's set authoritative rather than merely last.
      .on('head meta[property^="og:"]', { element(el) { el.remove(); } })
      .on('head meta[name^="twitter:"]', { element(el) { el.remove(); } })
      .on('head link[rel="canonical"]', { element(el) { el.remove(); } })
      .on("head", { element(el) { el.append(SEO_HEAD_HTML, { html: true }); } })
      .transform(response);
  }

  return response;
}
