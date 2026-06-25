// Reading architecture for /blog/<slug>/ — turn a flat beehiiv-sanitized
// article body into a structured, chaptered long-form layout.
//
// Post bodies arrive as a flat run of <p>/<h2>/<h3>/<blockquote>/<figure>…
// with no ids and no section wrappers. structureArticle() splits that stream
// on its top-level <h2> boundaries into { intro, chapters[] }; the renderers
// below turn that structure into the TOC rail + chaptered prose. Everything is
// DERIVED from the content — nothing about the sections is hardcoded.
import { esc } from "./templates.mjs";

// --- text helpers ---------------------------------------------------------
const STOPWORDS = new Set([
	"the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for", "with",
	"is", "are", "be", "by", "at", "as", "it", "its", "your", "you", "we", "our",
	"this", "that", "what", "why", "how", "when", "from", "about", "into",
]);

function stripTags(html) {
	return String(html || "")
		.replace(/<[^>]+>/g, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&nbsp;/gi, " ")
		.replace(/&#39;|&apos;/gi, "'")
		.replace(/&quot;/gi, '"')
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/\s+/g, " ")
		.trim();
}

function slugify(text) {
	const base = stripTags(text)
		.toLowerCase()
		.replace(/&/g, " and ")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60)
		.replace(/-+$/g, "");
	return base || "section";
}

function uniqueSlug(text, used) {
	const base = slugify(text);
	let slug = base;
	let n = 2;
	while (used.has(slug)) slug = `${base}-${n++}`;
	used.add(slug);
	return slug;
}

// A one- or two-word uppercase chapter label derived from the heading: drop
// stopwords, keep the first couple of meaningful words. Falls back to the
// first words if a heading is all stopwords (rare).
function kickerFrom(headingText) {
	const words = stripTags(headingText)
		.split(/\s+/)
		.map((w) => w.replace(/[^A-Za-z0-9'-]/g, "")) // drop punctuation/symbol tokens
		.filter(Boolean);
	const meaningful = words.filter((w) => !STOPWORDS.has(w.toLowerCase()));
	const pick = (meaningful.length ? meaningful : words).slice(0, 2);
	return pick.join(" ").toUpperCase() || "SECTION";
}

// --- structurer -----------------------------------------------------------
// flat bodyHtml -> { intro: html, chapters: [{ id, num, kicker, headingHtml,
// headingText, bodyHtml }] }. intro is everything before the first <h2>
// (it carries the drop-cap paragraph). When a body has no <h2> at all the
// whole thing is the intro and there are no chapters (single-column render).
export function structureArticle(bodyHtml) {
	const html = String(bodyHtml || "").trim();
	if (!html) return { intro: "", chapters: [] };

	const open = /<h2\b[^>]*>/gi;
	const marks = [];
	let m;
	while ((m = open.exec(html))) marks.push(m.index);
	if (!marks.length) return { intro: html, chapters: [] };

	const intro = html.slice(0, marks[0]).trim();
	const used = new Set();
	const chapters = [];
	for (let i = 0; i < marks.length; i++) {
		const start = marks[i];
		const end = i + 1 < marks.length ? marks[i + 1] : html.length;
		const segment = html.slice(start, end);
		const hm = segment.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
		const headingHtml = (hm ? hm[1] : "").trim();
		const headingText = stripTags(headingHtml) || `Section ${i + 1}`;
		const body = (hm ? segment.slice(hm.index + hm[0].length) : segment).trim();
		chapters.push({
			id: uniqueSlug(headingText, used),
			num: String(i + 1).padStart(2, "0"),
			kicker: kickerFrom(headingText),
			headingHtml: headingHtml || esc(headingText),
			headingText,
			bodyHtml: body,
		});
	}
	return { intro, chapters };
}

// --- renderers ------------------------------------------------------------
// The sticky left rail. Built from the chapter list; rendered only when there
// are >=2 chapters to navigate (otherwise the layout collapses to one column).
export function renderToc(chapters) {
	if (!chapters || chapters.length < 2) return "";
	const items = chapters
		.map(
			(c) => `      <li><a href="#${c.id}" data-toc="${c.id}">
        <span class="essay__toc-num">${c.num}</span>
        <span class="essay__toc-txt">${c.headingHtml}</span>
      </a></li>`,
		)
		.join("\n");
	return `<nav class="essay__toc" aria-label="On this page">
  <span class="essay__toc-lbl tick-lbl">On this page</span>
  <ol class="essay__toc-list">
${items}
  </ol>
</nav>`;
}

// The prose column: intro (with drop-cap) first, then each chapter wrapped in
// a <section> with a chapter marker (number + accent tick + kicker), a hairline
// rule (drawn in CSS), and the <h2>. The section carries the anchor id and its
// own scroll-margin so the sticky header never covers a jumped-to heading.
export function renderArticleBody({ intro, chapters }) {
	let out = "";
	if (intro) out += `${intro}\n`;
	for (const c of chapters) {
		out += `<section class="essay__section" id="${c.id}" aria-labelledby="${c.id}-h">
<div class="chap"><span class="chap__num">${c.num}</span><span class="chap__tick" aria-hidden="true"></span><span class="chap__kicker">${esc(c.kicker)}</span></div>
<h2 class="essay__h2" id="${c.id}-h">${c.headingHtml}</h2>
${c.bodyHtml}
</section>\n`;
	}
	return out;
}
