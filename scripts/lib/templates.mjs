// HTML templates for the prerendered blog pages. Framework-free string
// builders that reuse the site's existing design-system classes (styles.css).
import {
	SITE_ORIGIN,
	BRAND,
	BLOG_NAME,
	ASSET_VERSION,
	DEFAULT_OG_IMAGE,
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
	// We only know the dimensions of the brand default (1200x630).
	const imgIsDefault = img === DEFAULT_OG_IMAGE;
	const imgAlt = imgIsDefault ? `${BRAND} — The machine belongs to Main Street.` : title;
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
${imgIsDefault ? `<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
` : ""}<meta property="og:image:alt" content="${attr(imgAlt)}" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${attr(title)}" />
<meta name="twitter:description" content="${attr(description)}" />
<meta name="twitter:image" content="${attr(img)}" />
<meta name="twitter:image:alt" content="${attr(imgAlt)}" />

<link rel="alternate" type="application/rss+xml" title="${esc(BLOG_NAME)}" href="${SITE_ORIGIN}/blog/rss.xml" />
<link rel="stylesheet" href="/styles.css?v=${ASSET_VERSION}" />
<link rel="icon" href="${FAVICON}" />
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
${extraHead}
${ld}
</head>`;
}

export function topbar() {
	return `<div class="topbar">
  <div class="wrap topbar__in">
    <span class="left"><span class="dot"></span>${esc(BLOG_NAME)} — free weekly essays</span>
    <span class="right"><span class="hide-sm">Human-centric AI for Main Street</span><span>Denver · Phoenix · Remote</span></span>
  </div>
</div>`;
}

export function nav() {
	return `<header class="nav">
  <div class="wrap nav__inner">
    <a class="logo" href="/" aria-label="Main and Machine home">
      <span class="logo__plate">M<span class="amp">&amp;</span>M</span>
      <span class="logo__word">Main <span class="amp">&amp;</span> Machine</span>
    </a>
    <nav class="nav__links">
      <a href="/#work">The Work</a>
      <a href="/#pricing">Pricing</a>
      <a href="/#method">Method</a>
      <a href="/#about">Who We Are</a>
      <a href="/blog" aria-current="page">Blog</a>
    </nav>
    <div class="nav__right">
      <a class="btn btn--accent" href="/#assessment">Book an assessment</a>
    </div>
  </div>
</header>`;
}

export function footer() {
	return `<footer class="foot">
  <div class="wrap">
    <div class="foot__top">
      <div class="foot__brand">
        <a class="logo ink" href="/" aria-label="Main and Machine home" style="background:transparent;">
          <span class="logo__plate">M<span class="amp">&amp;</span>M</span>
          <span class="logo__word" style="color:var(--dtx);">Main <span class="amp">&amp;</span> Machine</span>
        </a>
        <p>Where Main Street meets the machine. Human-centric AI for small and mid-size business.</p>
      </div>
      <div class="foot__col">
        <h5>Company</h5>
        <ul>
          <li><a href="/#work">The work</a></li>
          <li><a href="/#method">The method</a></li>
          <li><a href="/#about">Who we are</a></li>
          <li><a href="/#assessment">Book an assessment</a></li>
        </ul>
      </div>
      <div class="foot__col">
        <h5>The work</h5>
        <ul>
          <li><a href="/#pricing">AI Readiness Audit</a></li>
          <li><a href="/#pricing">Implementation Sprint</a></li>
          <li><a href="/#pricing">Managed Services</a></li>
          <li><a href="/#method">The method</a></li>
        </ul>
      </div>
      <div class="foot__col">
        <h5>More</h5>
        <ul>
          <li><a href="/blog">The Ampersand</a></li>
          <li><a href="/blog/archive">Archive</a></li>
          <li><a href="/#about">Why us</a></li>
          <li><a href="/#paths">Where are you?</a></li>
        </ul>
      </div>
      <div class="foot__col">
        <h5>Contact</h5>
        <ul>
          <li><a href="/#assessment">Book an assessment</a></li>
          <li><a href="mailto:cmyers@mainandmachine.com">cmyers@mainandmachine.com</a></li>
          <li><a href="tel:+14803605128">480-360-5128</a></li>
          <li><a href="/">Denver and Phoenix</a></li>
        </ul>
      </div>
    </div>
    <div class="foot__bottom">
      <span>© 2026 mainandmachine.com · Human-centric AI for small and mid-size business</span>
      <span class="links"><a href="/">Home</a><a href="/blog">Writing</a><a href="/blog/rss.xml">RSS</a></span>
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
          <button class="btn btn--accent" type="submit">Subscribe</button>
        </form>
        <p style="font-family:var(--mono);font-size:11px;color:var(--dtx-faint);margin-top:14px;line-height:1.6;">Delivered by beehiiv. No spam, unsubscribe anytime.</p>
      </div>
      <div class="subnote">
        <span class="kicker kicker--plain">Why subscribe</span>
        <ul>
          <li>Short essays you can read in one sitting</li>
          <li>How we actually think about AI on Main Street</li>
          <li>No pitches, no funnels — leave whenever it stops paying</li>
        </ul>
        <a class="feed__archive" href="/blog/archive">Browse the full archive →</a>
      </div>
    </div>
  </div>
</section>`;
}

// Scripts shared by every blog page: subscribe enhancement + search.
export function pageScripts() {
	return `<script src="/blog.js?v=${ASSET_VERSION}"></script>`;
}
