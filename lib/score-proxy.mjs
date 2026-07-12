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
// proxy owns the SEO head. Canonical form is slash-less (/score): the Next.js
// app 308s /score/ → /score, so /score is what every internal link, the
// sitemap, and this canonical use. Injected only on the /score document —
// assets, sub-routes, and /s/* pass through untouched.
const SCORE_URL = `${COMPANY.origin}/score`;
export const SCORE_TITLE = "The AI-Ready Score: Free 7-Minute AI Assessment | Main & Machine";
const SCORE_DESCRIPTION =
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
      "priceRange": "$3,500–$45,000",
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
      ],
      "name": COMPANY.founder.name,
      "jobTitle": COMPANY.founder.title,
      "worksFor": { "@id": `${COMPANY.origin}/#org` },
    },
    {
      "@type": ["WebPage", "WebApplication"],
      "@id": `${SCORE_URL}#webpage`,
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

const SEO_HEAD_HTML = [
  `<link rel="canonical" href="${SCORE_URL}">`,
  `<script type="application/ld+json">${JSON.stringify(SCORE_GRAPH)}</script>`,
  `<script type="application/ld+json">${JSON.stringify(SCORE_FAQ)}</script>`,
].join("\n");

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
      .on("head", { element(el) { el.append(SEO_HEAD_HTML, { html: true }); } })
      .transform(response);
  }

  return response;
}
