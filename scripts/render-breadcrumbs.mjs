#!/usr/bin/env node
// Stamp the visible breadcrumb AND its BreadcrumbList JSON-LD from one model.
//
//   npm run crumbs:render          write
//   npm run crumbs:check           verify only (in build:static)
//
// Both halves come from scripts/lib/breadcrumbs.mjs, which is the point: they
// were hand-written separately on 39 pages and had drifted apart on 16 of them
// (the guides showed "What it costs" while telling Google "What an AI
// consultant costs"; /privacy/ showed "Main & Machine / Privacy" while its
// JSON-LD said "Home / Privacy Policy").
//
// REWRITES IN PLACE, NEVER INJECTS. Every page below the top level already has
// a crumb — coverage was verified complete before this was written — so there
// is nothing to add, and guessing where a crumb belongs in a hero layout this
// script has never seen is how you end up with one above the nav on some page
// nobody checks. If a new page needs a crumb, add the container and this fills
// it in.
//
// The four class names (.crumb, .bookhero__crumb, .legal__crumb,
// .sechero__crumb) are PRESERVED per page rather than unified: each is
// positioned by its own CSS (and two of them by a page-local <style> block),
// so renaming them would be a layout change wearing an accessibility change's
// clothes. The <nav>/<ol> semantics are identical across all four.
import fs from "node:fs";
import path from "node:path";
import { STATIC_ROUTES, NOINDEX_ROUTES } from "./lib/config.mjs";
import { breadcrumbHtml, breadcrumbJsonLd, trailFor, CRUMB_LABELS } from "./lib/breadcrumbs.mjs";

const ROOT = process.cwd();
const CHECK = process.argv.includes("--check");

let changed = 0, visStamped = 0, ldStamped = 0;
const pending = [];
const report = [];
const problems = [];

// FIVE class names for one component. The fifth, .thankshero__crumb, was found
// only because this script reported /book/thanks/ as having no crumb at all —
// a grep for the four known names had said the coverage was complete. Worth
// remembering when auditing anything "duplicated across the static pages":
// enumerate from the pages, not from the names you already know.
const CRUMB_CLASSES = [
	"crumb", "bookhero__crumb", "legal__crumb", "sechero__crumb", "thankshero__crumb",
];
const CONTAINER_RE = new RegExp(
	`([ \\t]*)<(div|nav)\\s+class="(${CRUMB_CLASSES.join("|")})"([^>]*)>([\\s\\S]*?)</\\2>`,
	"g",
);

const routeToFile = (r) => (r === "/" ? "index.html" : path.join(r.replace(/^\/|\/$/g, ""), "index.html"));

for (const route of [...STATIC_ROUTES, ...NOINDEX_ROUTES]) {
	const rel = routeToFile(route);
	const abs = path.join(ROOT, rel);
	if (!fs.existsSync(abs)) continue;

	const trail = trailFor(route);
	const original = fs.readFileSync(abs, "utf8");
	let html = original;

	if (!CRUMB_LABELS[route]) {
		problems.push(`${rel}: route ${route} has no entry in CRUMB_LABELS (scripts/lib/breadcrumbs.mjs)`);
		continue;
	}

	// --- 1. visible markup ---
	let sawContainer = false;
	html = html.replace(CONTAINER_RE, (whole, indent, tag, cls, attrs, inner) => {
		sawContainer = true;
		if (!trail) return whole; // homepage: leave whatever is there alone
		const rendered = breadcrumbHtml(route, { className: cls });
		// Re-indent to the container's own column so the diff stays local.
		const block = rendered.split("\n").map((l, i) => (i === 0 ? indent + l : indent + l)).join("\n");
		return block;
	});
	if (trail && !sawContainer) {
		problems.push(`${rel}: no crumb container found — add <nav class="crumb"></nav> and re-run`);
	}
	if (html !== original) visStamped++;

	// --- 2. BreadcrumbList JSON-LD, from the same trail ---
	const wantLd = breadcrumbJsonLd(route);
	if (wantLd) {
		let replaced = false;
		html = html.replace(
			/(<script[^>]+application\/ld\+json[^>]*>\n?)([\s\S]*?)(\n?<\/script>)/g,
			(whole, open, body, close) => {
				let graph;
				try { graph = JSON.parse(body); } catch { return whole; }
				const nodes = graph["@graph"] || [graph];
				let dirty = false;
				for (let i = 0; i < nodes.length; i++) {
					const n = nodes[i];
					if (!n || typeof n !== "object") continue;
					if ([].concat(n["@type"] || []).includes("BreadcrumbList")) {
						const before = JSON.stringify(n);
						// Preserve any @id the node carries; replace the trail itself.
						const rebuilt = { ...(n["@id"] ? { "@id": n["@id"] } : {}), ...wantLd };
						nodes[i] = rebuilt;
						if (JSON.stringify(rebuilt) !== before) dirty = true;
						replaced = true;
					}
				}
				if (!dirty) return whole;
				return open + JSON.stringify(graph, null, 2) + close;
			},
		);
		if (!replaced) {
			problems.push(`${rel}: no BreadcrumbList node in any ld+json block`);
		} else if (html !== original) {
			ldStamped++;
		}
	}

	if (html !== original) {
		changed++;
		report.push(rel);
		// Staged, not written yet. A structural problem anywhere aborts the whole
		// pass: the first version wrote each file as it went and THEN exited 1 on
		// a problem found later, which leaves the tree half-stamped and the exit
		// code saying "nothing happened".
		pending.push([abs, html]);
	}
}

if (!CHECK && !problems.length) {
	for (const [abs, html] of pending) fs.writeFileSync(abs, html);
}

if (problems.length) {
	console.error("[crumbs] structural problems:");
	for (const p of problems) console.error("  - " + p);
}

if (CHECK) {
	if (changed || problems.length) {
		console.error(
			`[crumbs:check] FAILED — ${changed} page(s) have a breadcrumb that disagrees with ` +
			`the model in scripts/lib/breadcrumbs.mjs. Run: npm run crumbs:render`,
		);
		for (const r of report.slice(0, 12)) console.error("  - " + r);
		if (report.length > 12) console.error(`  … +${report.length - 12} more`);
		process.exit(1);
	}
	console.log("[crumbs:check] OK — every visible trail and BreadcrumbList matches the model.");
} else {
	if (problems.length) process.exit(1);
	console.log(`[crumbs:render] ${changed} page(s) updated (${visStamped} visible, ${ldStamped} JSON-LD)`);
	for (const r of report) console.log("  - " + r);
}
