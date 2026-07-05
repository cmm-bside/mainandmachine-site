// HTML templates for the prerendered blog pages. Framework-free string
// builders that reuse the site's existing design-system classes (styles.css).
import {
	SITE_ORIGIN,
	BRAND,
	BLOG_NAME,
	ASSET_VERSION,
	DEFAULT_OG_IMAGE,
	COMPANY,
} from "./config.mjs";

const FAVICON =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%2314110c'/%3E%3Ctext x='50' y='70' font-family='monospace' font-size='52' font-weight='700' text-anchor='middle' fill='%23f3ede0'%3EM%3Ctspan fill='%23bd451f'%3E%26amp;%3C/tspan%3EM%3C/text%3E%3C/svg%3E";

// --- escaping -------------------------------------------------------------
export function esc(s) {
	return String(s == null ? "" : s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
export function attr(s) {
	return esc(s);
}

// --- dates ----------------------------------------------------------------
export function formatDate(iso) {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	});
}
export function monthLabel(iso) {
	if (!iso) return "Undated";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "Undated";
	return d.toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
}

// --- document shell -------------------------------------------------------
export function head({ title, description, canonical, ogImage, ogType = "website", jsonLd = [], extraHead = "" }) {
	const img = ogImage || DEFAULT_OG_IMAGE;
	// Derive the MIME type from the extension so social scrapers get it right
	// (the brand default is PNG; beehiiv hero covers are usually JPEG).
	const imgType = /\.png(\?|$)/i.test(img) ? "image/png"
		: /\.webp(\?|$)/i.test(img) ? "image/webp"
		: /\.svg(\?|$)/i.test(img) ? "image/svg+xml"
		: "image/jpeg";
	// We know the dimensions of the brand default and our generated OG cards (1200x630).
	const imgIsDefault = img === DEFAULT_OG_IMAGE;
	const imgKnownSize = imgIsDefault || img.includes("/images/og/");
	const imgAlt = imgIsDefault ? `${BRAND}: The machine belongs to Main Street.` : title;
	const ld = jsonLd
		.filter(Boolean)
		.map((obj) => `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`)
		.join("\n");
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${attr(description)}" />
<link rel="canonical" href="${attr(canonical)}" />

<!-- Open Graph -->
<meta property="og:type" content="${attr(ogType)}" />
<meta property="og:site_name" content="${esc(BRAND)}" />
<meta property="og:title" content="${attr(title)}" />
<meta property="og:description" content="${attr(description)}" />
<meta property="og:url" content="${attr(canonical)}" />
<meta property="og:image" content="${attr(img)}" />
<meta property="og:image:type" content="${imgType}" />
${imgKnownSize ? `<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
` : ""}<meta property="og:image:alt" content="${attr(imgAlt)}" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${attr(title)}" />
<meta name="twitter:description" content="${attr(description)}" />
<meta name="twitter:image" content="${attr(img)}" />
<meta name="twitter:image:alt" content="${attr(imgAlt)}" />

<link rel="alternate" type="application/rss+xml" title="${esc(BLOG_NAME)}" href="${SITE_ORIGIN}/blog/rss.xml" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap" />
<link rel="stylesheet" href="/styles.css?v=${ASSET_VERSION}" />
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" />
<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
<link rel="icon" type="image/svg+xml" href="${FAVICON}" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<!-- Privacy-friendly analytics by Plausible -->
<script async src="https://plausible.io/js/pa-Yipfpj7KIiywp6RYmahGL.js"></script>
<script>
  window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
  plausible.init()
</script>
${extraHead}
${ld}
</head>`;
}

export function topbar() {
	return `<div class="ticker" role="region" aria-label="Announcements">
  <div class="ticker__track">
    <div class="ticker__group">
      <span class="ticker__item"><span class="dot">●</span> ${esc(BLOG_NAME)}: free weekly essays</span>
      <span class="ticker__item">Every engagement starts with the free assessment</span>
      <span class="ticker__item">Human-centric AI for Main Street</span>
      <span class="ticker__item">Denver · Phoenix · Remote</span>
    </div>
    <div class="ticker__group" aria-hidden="true">
      <span class="ticker__item"><span class="dot">●</span> ${esc(BLOG_NAME)}: free weekly essays</span>
      <span class="ticker__item">Every engagement starts with the free assessment</span>
      <span class="ticker__item">Human-centric AI for Main Street</span>
      <span class="ticker__item">Denver · Phoenix · Remote</span>
    </div>
  </div>
</div>`;
}

// Shared JSON-LD entities — every page's graph connects to the same @ids.
// Facts come from src/data/company.mjs; never restate them here.
// sameAs = verified official profiles only (do not invent). Add GitHub org /
// Crunchbase / author-speaker profiles here when real URLs exist.
const ORG_SAMEAS = [
	"https://www.linkedin.com/company/main-and-machine/",
	"https://x.com/mainandmachine",
];
const PERSON_SAMEAS = [
	"https://www.linkedin.com/in/cmyers85/",
	"https://x.com/Chris_myers",
	"https://www.entrepreneur.com/author/christopher-myers",
];
export function orgJsonLd() {
	const origin = COMPANY.origin;
	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "Organization",
				"@id": `${origin}/#org`,
				name: COMPANY.name,
				url: `${origin}/`,
				logo: `${origin}/icon-512.png`,
				email: COMPANY.email,
				telephone: COMPANY.phoneE164,
				areaServed: "US",
				founder: { "@id": `${origin}/#person-cmyers` },
				sameAs: ORG_SAMEAS,
			},
			{ "@type": "WebSite", "@id": `${origin}/#website`, name: COMPANY.name, url: `${origin}/` },
			{
				"@type": "Person",
				"@id": `${origin}/#person-cmyers`,
				name: COMPANY.founder.name,
				jobTitle: "Founder & Chairman",
				worksFor: { "@id": `${origin}/#org` },
				sameAs: PERSON_SAMEAS,
			},
		],
	};
}

export function nav() {
	return `<header class="nav">
  <div class="wrap nav__inner">
    <a class="logo" href="/" aria-label="Main &amp; Machine home">
      <span class="logo__plate" aria-hidden="true">M<span class="amp">&amp;</span>M</span>
      <span class="logo__word">Main <span class="amp">&amp;</span> Machine</span>
    </a>
    <nav class="nav__links" id="nav-links">
      <span class="nav__item nav__item--menu">
        <a href="/services/">Services</a>
        <button type="button" class="nav__caret" aria-expanded="false" aria-controls="nav-services-menu" aria-label="Services menu"><span class="nav__caret-glyph" aria-hidden="true"></span></button>
        <div class="nav__menu" id="nav-services-menu">
          <a href="/services/">Compare all three</a>
          <a href="/services/#audit">AI Readiness Audit</a>
          <a href="/services/#sprint">Implementation Sprint</a>
          <a href="/services/#managed">Managed Services</a>
        </div>
      </span>
      <a href="/work/">Proof</a>
      <a href="/pricing/">Pricing</a>
      <a href="/method/">Method</a>
      <a href="/about/">Who We Are</a>
      <a href="/blog/" class="is-active" aria-current="page">Blog</a>
      <a href="/contact/">Contact</a>
    </nav>
    <div class="nav__right">
      <a class="btn btn--primary" href="/book/">Book a free assessment</a>
      <button class="nav__toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav-links">
        <span class="nav__toggle-box" aria-hidden="true"><span class="nav__toggle-bar"></span></span>
      </button>
    </div>
  </div>
</header>`;
}

export function footer() {
	return `<footer class="foot">
  <div class="wrap">
      <div class="foot__top">
      <div class="foot__brand">
        <a class="logo ink" href="/" aria-label="Main &amp; Machine home" style="background:transparent;">
          <span class="logo__plate" aria-hidden="true">M<span class="amp">&amp;</span>M</span>
          <span class="logo__word" style="color:var(--dtx);">Main <span class="amp">&amp;</span> Machine</span>
        </a>
        <p>Where Main Street meets the machine. Human-centric AI for small and mid-size business.</p>
      </div>
      <div class="foot__col">
        <h2>Company</h2>
        <ul>
          <li><a href="/about/">Who We Are</a></li>
          <li><a href="/method/">Method</a></li>
          <li><a href="/work/">Proof</a></li>
          <li><a href="/blog/">Blog</a></li>
          <li><a href="/careers/">Careers</a></li>
        </ul>
      </div>
      <div class="foot__col">
        <h2>Services</h2>
        <ul>
          <li><a href="/services/">Compare all three</a></li>
          <li><a href="/services/#audit">AI Readiness Audit</a></li>
          <li><a href="/services/#sprint">Implementation Sprint</a></li>
          <li><a href="/services/#managed">Managed Services</a></li>
          <li><a href="/pricing/">Pricing</a></li>
        </ul>
      </div>
      <div class="foot__col">
        <h2>More</h2>
        <ul>
          <li><a href="/industries/">Who this is for</a></li>
          <li><a href="/calculator/">ROI calculator</a></li>
          <li><a href="/blog/archive/">Archive</a></li>
          <li><a href="/#paths">Where are you?</a></li>
        </ul>
      </div>
      <div class="foot__col">
        <h2>Contact</h2>
        <ul>
          <li><a href="/book/">Book a free assessment</a></li>
          <li><a href="mailto:${attr(COMPANY.email)}">${esc(COMPANY.email)}</a></li>
          <li><a href="${attr(COMPANY.phoneHref)}">${esc(COMPANY.phone)}</a></li>
          <li><a href="/denver/">Denver</a> and <a href="/phoenix/">Phoenix</a></li>
        </ul>
      </div>
    </div>
    <div class="foot__bottom">
      <span class="press-list"><span>© 2026 mainandmachine.com</span><span>Human-centric AI for small and mid-size business</span></span>
      <span class="links"><a href="/">Home</a><a href="/blog/">Writing</a><a href="/blog/rss.xml">RSS</a></span>
    </div>
  </div>
</footer>`;
}

// Subscribe band (ink). subscribeUrl is wired into the form action; blog.js
// enhances submit to carry the email. Falls back to "#" when unconfigured.
export function subscribeBand(subscribeUrl, publicationUrl) {
	const action = subscribeUrl || "#";
	const archive = publicationUrl || subscribeUrl || "#";
	return `<section class="section ink" data-screen-label="Subscribe">
  <div class="wrap">
    <div class="news">
      <div class="subcard crop">
        <div class="tick-lbl"><span>${esc(BLOG_NAME)} / free</span><span>Weekly</span></div>
        <h3>Read before you ever pick up the phone.</h3>
        <p class="lead" style="font-size:15px;">Free weekly essays. One field. No sales pitches.</p>
        <form class="subform" data-beehiiv-subscribe action="${attr(action)}" method="get" target="_blank">
          <input type="email" name="email" placeholder="Email address" aria-label="Email address" required />
          <button class="btn btn--primary" type="submit">Get the weekly essay →</button>
        </form>
        <p style="font-family:var(--mono);font-size:11px;color:var(--dtx-faint);margin-top:14px;line-height:1.6;">Delivered by beehiiv. No spam, unsubscribe anytime.</p>
      </div>
      <div class="subnote">
        <span class="kicker kicker--plain">Why subscribe</span>
        <ul>
          <li>Short essays you can read in one sitting</li>
          <li>How we actually think about AI on Main Street</li>
          <li>No pitches, no funnels. Leave whenever it stops paying</li>
        </ul>
        <a class="feed__archive" href="/blog/archive/">Full archive →</a>
      </div>
    </div>
  </div>
</section>`;
}

// Scripts shared by every blog page: mobile nav + subscribe enhancement + search.
export function pageScripts() {
	return `<script src="/js/nav.js?v=3"></script>
<script src="/blog.js?v=${ASSET_VERSION}"></script>`;
}
