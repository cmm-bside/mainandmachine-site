// Shared config for the build-time blog pipeline (fetch + prerender).
// One source of truth for site identity, paths, and Beehiiv env.
// Business facts come from the canonical facts file — never restate them here.
import path from "node:path";
import { COMPANY } from "../../src/data/company.mjs";

export const ROOT = process.cwd();

// --- Site identity (sourced from src/data/company.mjs) ---
export { COMPANY };
export const SITE_ORIGIN = COMPANY.origin;
export const SITE_HOST = COMPANY.origin.replace(/^https?:\/\//, "");
export const BRAND = COMPANY.name;
export const BLOG_NAME = "The Ampersand";
export const AUTHOR = COMPANY.founder.name;
export const BLOG_DESCRIPTION =
	"Free weekly essays from Christopher Myers on building durable things in a noisy time.";
// Fallback social image when a post has no usable cover. PNG (1200x630) —
// SVG og:images are not rendered by LinkedIn/X/Facebook/iMessage previews.
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

// --- Beehiiv (read from env only; never commit the key) ---
export const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY || "";
export const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID || "";
// Optional explicit subscribe URL; otherwise derived from a post's web_url host.
export const BEEHIIV_SUBSCRIBE_URL = process.env.BEEHIIV_SUBSCRIBE_URL || "";

// --- Generated artifact paths (all gitignored) ---
export const DATA_MODULE_PATH = path.join(ROOT, "src", "data", "blog-posts.js");
export const BLOG_DATA_DIR = path.join(ROOT, "blog-data"); // served at /blog-data/
export const BLOG_INDEX_JSON = path.join(BLOG_DATA_DIR, "index.json");
export const BLOG_DIR = path.join(ROOT, "blog"); // served at /blog/
export const ARCHIVE_DIR = path.join(BLOG_DIR, "archive");
export const RSS_PATH = path.join(BLOG_DIR, "rss.xml");
export const SITEMAP_PATH = path.join(ROOT, "sitemap.xml");

// Static routes that exist outside the blog pipeline (for the sitemap).
export const STATIC_ROUTES = [
	"/",
	"/book/",
	"/pricing/",
	"/method/",
	"/about/",
	"/services/",
	"/services/ai-readiness-audit/",
	"/services/implementation-sprint/",
	"/services/managed-services/",
	"/industries/",
	"/industries/professional-services/",
	"/industries/retail/",
	"/industries/healthcare/",
	"/industries/construction/",
	"/industries/hospitality/",
	"/denver/",
	"/phoenix/",
	"/work/",
	"/work/sample-audit/",
	"/calculator/",
	"/privacy/",
	"/terms/",
];

// Post slugs to exclude from the build entirely (test/placeholder posts that
// exist in beehiiv but should never be indexed, linked, or sitemapped).
export const EXCLUDED_POST_SLUGS = ["test"];

// Display-date overrides keyed by slug. Beehiiv's publish_date drives dates by
// default; an entry here overrides BOTH the shown date and the sort key (and
// the sitemap/RSS/JSON-LD dates that derive from it), so the public timeline
// matches the intended editorial schedule. Date-only (YYYY-MM-DD) — rendered at
// noon UTC so the calendar day is identical in every timezone.
export const POST_DATE_OVERRIDES = {
	"how-to-smell-the-hype": "2026-02-27",
	"the-prediction-engine": "2026-03-06",
	"how-the-machine-learns": "2026-03-13",
	"the-currency-of-the-machine": "2026-03-20",
	"why-everything-happened-at-once": "2026-03-27",
	"the-buildings-behind-the-intelligence": "2026-04-03",
	"sorting-the-vocabulary": "2026-04-10",
	"why-the-machine-makes-things-up": "2026-04-17",
	"how-to-talk-to-the-machine": "2026-04-24",
	"what-an-agent-actually-is": "2026-05-01",
	"teaching-the-machine-your-business": "2026-05-08",
	"open-models-closed-models": "2026-05-15",
	"where-your-data-goes": "2026-05-22",
	"what-the-machine-cannot-do": "2026-05-29",
	"seventy-years-of-overnight-success": "2026-06-05",
};

// Cache-buster shared with index.html's <link>/<script> tags.
export const ASSET_VERSION = "15";
