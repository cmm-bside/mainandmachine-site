// Shared config for the build-time blog pipeline (fetch + prerender).
// One source of truth for site identity, paths, and Beehiiv env.
import path from "node:path";

export const ROOT = process.cwd();

// --- Site identity ---
export const SITE_ORIGIN = "https://www.mainandmachine.com";
export const SITE_HOST = "www.mainandmachine.com";
export const BRAND = "Main & Machine";
export const BLOG_NAME = "The Ampersand";
export const AUTHOR = "Christopher Myers";
export const BLOG_DESCRIPTION =
	"Free weekly essays from Christopher Myers on building durable things in a noisy time.";
// Fallback social image when a post has no usable cover.
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.svg`;

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
export const STATIC_ROUTES = ["/"];

// Cache-buster shared with index.html's <link>/<script> tags.
export const ASSET_VERSION = "12";
