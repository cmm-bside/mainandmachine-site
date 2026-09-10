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
// The footer brand block carries the audit floor. The static pages stamp it as
// a data-fact span; a generated surface derives it from the same single
// definition instead, so the two can never disagree.
import { factValues } from "./fact-values.mjs";

const FAVICON =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231A1511'/%3E%3Ctext x='50' y='70' font-family='monospace' font-size='52' font-weight='700' text-anchor='middle' fill='%23EFE8D9'%3EM%3Ctspan fill='%23C86953'%3E%26amp;%3C/tspan%3EM%3C/text%3E%3C/svg%3E";

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

<link rel="alternate" type="text/markdown" href="/llms.txt" title="Plain-text facts for AI systems" />
<link rel="alternate" type="application/rss+xml" title="${esc(BLOG_NAME)}" href="${SITE_ORIGIN}/blog/rss.xml" />
<link rel="preload" as="font" type="font/woff2" href="/fonts/archivo-latin-var.woff2" crossorigin />
<link rel="preload" as="font" type="font/woff2" href="/fonts/spacemono-latin-400.woff2" crossorigin />
<link rel="stylesheet" href="/styles.css?v=${ASSET_VERSION}" />
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" />
<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
<link rel="icon" type="image/svg+xml" href="${FAVICON}" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<!-- Privacy-friendly analytics by Plausible -->
<script async src="/js/pa"></script>
<script>
  window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
  plausible.init({ endpoint: "/api/event", formSubmissions: false })
</script>
${extraHead}
<style>
/* Editorial surfaces: unfiltered vector artwork and a quieter reading finish. */
.ampersand-title{font-size:clamp(38px,5vw,52px);line-height:1.05;letter-spacing:-.04em}
.feed__featured-img img,.feed__card-img img,.essay__hero img{filter:none!important;mix-blend-mode:normal;object-fit:contain;background:var(--paper)}
.feed__featured-img{aspect-ratio:3/2;background:var(--paper)}
.feed__card-img{aspect-ratio:3/2;background:var(--paper)}
.feed__card-img img{width:100%;height:100%}
.essay__hero{max-width:900px;margin-left:auto;margin-right:auto;border:0}
.essay__hero img{display:block;width:100%;height:auto;aspect-ratio:3/2}
.essay__cap{font-size:12px;padding:12px 0;border-top:1px solid var(--rule);color:var(--ink-muted)}
.essay__meta{font-size:13px;line-height:1.6;gap:8px 18px}
.essay__head .essay__dek{font-size:20px;line-height:1.55;max-width:65ch}
.essay__cta--quiet{display:block;background:none;border:0;border-top:1px solid var(--rule);padding:28px 0 0;max-width:900px;margin:0 auto;box-shadow:none}
.essay__cta--quiet h2{font-size:28px;line-height:1.2}.essay__cta--quiet p{font-size:17px;line-height:1.6;color:var(--ink-muted);margin-top:12px;max-width:65ch}
.essay__cta--quiet .essay__cta-actions{margin-top:20px}
.ampersand-subscribe.section{padding-top:40px;padding-bottom:48px}
.ampersand-subscribe__inner{display:grid;grid-template-columns:1fr 1fr;gap:64px;padding-top:32px;border-top:1px solid var(--rule);align-items:center}
.ampersand-subscribe h2{font-size:25px;line-height:1.2;margin:14px 0 10px}.ampersand-subscribe p{font-size:15px;line-height:1.6;color:var(--ink-muted)}
.ampersand-subscribe__inner>div>a{display:inline-flex;align-items:center;min-height:44px;margin-top:12px;color:var(--ink);font-size:14px;text-underline-offset:4px}
.ampersand-subscribe .subform{margin-top:0}.ampersand-subscribe .subform input{background:var(--paper);color:var(--ink);border:1px solid var(--ink-muted);min-width:0}
.ampersand-subscribe .subform input::placeholder{color:var(--ink-muted)}
.ampersand-subscribe .ampersand-subscribe__fine{font-size:12px;margin-top:12px}
@media(max-width:760px){.ampersand-subscribe__inner{grid-template-columns:1fr;gap:24px}.essay__head .essay__dek{font-size:18px}.essay__cta--quiet h2{font-size:25px}.feed__featured-img{min-height:0}}
@media(max-width:480px){.ampersand-subscribe .subform{display:flex;flex-direction:column;align-items:stretch}.ampersand-subscribe .subform>*{width:100%}}
</style>
${ld}
</head>`;
}

// Top utility bar. Must stay byte-identical to the hand-written copy in the
// static pages (see the .ticker block in styles.css) — blog pages sit under the
// same chrome, so a change here needs the same change there and vice versa.
export function topbar() {
	return `<div class="ticker" role="region" aria-label="Announcements">
  <div class="wrap ticker__inner">
    <span class="ticker__left">
      <span class="ticker__clause">Booking <span data-fact="booking-quarter">Q4</span> delivery</span><span class="ticker__clause ticker__clause--alt">start with a <a data-cta="ticker" class="ticker__link" href="/plan/">free workflow plan</a></span>
    </span>
    <span class="ticker__right">Denver &middot; Phoenix &middot; Remote</span>
  </div>
</div>`;
}

// Shared JSON-LD entities — every page's graph connects to the same @ids.
// Facts come from src/data/company.mjs; never restate them here.
// sameAs = verified official profiles only (do not invent). Add GitHub org /
// Crunchbase / author-speaker profiles here when real URLs exist.
// MOVED to src/data/site-facts.json (`sameAs.org` / `sameAs.person`)
// 2026-08-08. These were array literals here — a profile list is a claim about
// an entity, so it belongs with the other canonical facts rather than in a
// template module that only the blog pipeline imports. The rules that governed
// them are unchanged and now live in `_sameAs_note` beside the data: verified
// profile pages only, never invented, order is significant.
const ORG_SAMEAS = COMPANY.sameAs.org;
// Exported so check-facts.mjs can hold every hand-embedded Person block to it.
// One entity, one claim set: if you add a profile to site-facts.json,
// `npm run facts:check` fails every static page until it carries the same list
// in the same order. Re-exported (rather than having callers read COMPANY
// directly) so the ~40-page consistency guard keeps its single import site.
export const PERSON_SAMEAS = COMPANY.sameAs.person;
// Pass { searchAction: true } on pages whose search honors ?q= (the blog
// index) to emit a WebSite SearchAction (sitelinks searchbox).
export function orgJsonLd({ searchAction = false } = {}) {
	const origin = COMPANY.origin;
	const website = { "@type": "WebSite", "@id": `${origin}/#website`, name: COMPANY.name, url: `${origin}/` };
	if (searchAction) {
		website.potentialAction = {
			"@type": "SearchAction",
			target: { "@type": "EntryPoint", urlTemplate: `${origin}/blog/?q={search_term_string}` },
			"query-input": "required name=search_term_string",
		};
	}
	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "ProfessionalService",
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
			website,
			{
				"@type": "Person",
				"@id": `${origin}/#person-cmyers`,
				name: COMPANY.founder.name,
				jobTitle: "Founder & Chairman",
				image: `${origin}/images/christopher-myers-hedcut.png`,
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
    <nav class="nav__links" id="nav-links" aria-label="Main navigation">
      <a href="/services/">Services</a>
      <a href="/services/builds/">Workflows</a>
      <a href="/work/">Results</a>
      <a href="/pricing/">Pricing</a>
      <a href="/guides/">Guides</a>
      <a href="/blog/">Blog</a>
    </nav>
    <div class="nav__right">
      <a data-cta="nav" aria-label="Get my free plan" class="btn btn--primary" href="/plan/"><span class="btn__full">Get my free plan</span><span class="btn__short" aria-hidden="true">Free plan</span> <span class="arr" aria-hidden="true">&#8594;</span></a>
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
      <div class="foot__signup">
        <div class="foot__signup-copy">
          <span class="kicker kicker--plain">${esc(BLOG_NAME)} · free, a few times a month</span>
          <h2>Plain-English AI for Main Street.</h2>
          <p>Short essays on building durable things in a noisy time. Read the latest or explore the archive.</p>
        </div>
        <div>
          <a class="btn btn--primary" href="/blog/">Read The Ampersand <span class="arr">&#8594;</span></a>
          <p class="signup__note"><a href="/blog/rss.xml">Follow the RSS feed</a> · Free to read, no signup needed.</p>
        </div>
    </div>
    <div class="foot__top">
      <div class="foot__brand">
        <a class="logo ink" href="/" aria-label="Main &amp; Machine home">
          <span class="logo__plate" aria-hidden="true">M<span class="amp">&amp;</span>M</span>
          <span class="logo__word">Main <span class="amp">&amp;</span> Machine</span>
        </a>
        <p>Where Main Street meets the machine. Human-centric AI for small and mid-size business.</p>
        <div class="entity__stats">
          <div><span class="tick-lbl">Scope</span><b>Fixed</b></div>
          <div><span class="tick-lbl">Audits</span><b>${esc(factValues(COMPANY)["audit-floor"])}</b></div>
        </div>
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
          <li><a href="/services/ai-readiness-audit/">AI Readiness Audit</a></li>
          <li><a href="/services/ai-implementation/">Implementation Sprint</a></li>
          <li><a href="/services/managed-ai-services/">Managed Services</a></li>
          <li><a href="/pricing/">Pricing</a></li>
        </ul>
      </div>
      <div class="foot__col">
        <h2>More</h2>
        <ul>
          <li><a href="/score/">AI-Ready Score</a></li>
          <li><a href="/industries/">Who this is for</a></li>
          <li><a href="/calculator/">ROI calculator</a></li>
          <li><a href="/guides/">The Field Guide</a></li>
          <li><a href="/blog/archive/">Archive</a></li>
          <li><a href="/#paths">Where are you?</a></li>
        </ul>
      </div>
      <div class="foot__col">
        <h2>Contact</h2>
        <ul>
          <li><a data-cta="footer" href="/plan/">Get my free plan</a></li>
          <li><a data-cta="footer" href="/book/">Book a free assessment</a></li>
          <li><a href="mailto:${attr(COMPANY.email)}">${esc(COMPANY.email)}</a></li>
          <li><a href="${attr(COMPANY.phoneHref)}">${esc(COMPANY.phone)}</a></li>
          <li><a href="/denver/">Denver</a> and <a href="/phoenix/">Phoenix</a></li>
        </ul>
      </div>
    </div>
    <div class="foot__bottom">
      <span class="press-list"><span>© 2026 mainandmachine.com</span><span>Human-centric AI for small and mid-size business</span></span>
      <span class="links"><a href="/security/">Security</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><span>Built in Denver &amp; Phoenix</span></span>
    </div>
  </div>
</footer>`;
}

// Blog reading band, shared by the archive and article pages.
export function subscribeBand() {
	return `<section class="section paper ampersand-subscribe">
  <div class="wrap ampersand-subscribe__inner">
    <div><span class="tick-lbl">${esc(BLOG_NAME)}</span><h2>Keep a place for good judgment.</h2><p>Free essays on building durable things in a noisy time.</p><a href="/blog/archive/">Browse the archive <span aria-hidden="true">→</span></a></div>
    <div><a class="btn btn--primary" href="/blog/">Read the latest <span class="arr">&#8594;</span></a><p class="ampersand-subscribe__fine"><a href="/blog/rss.xml">Follow the RSS feed</a> · No signup needed.</p></div>
  </div>
</section>`;
}

// Scripts shared by every blog page: mobile nav and search.
export function pageScripts() {
	return `<script defer src="/js/nav.js?v=11"></script>
<script defer src="/js/analytics.js?v=10"></script>
<script src="/blog.js?v=${ASSET_VERSION}"></script>`;
}
