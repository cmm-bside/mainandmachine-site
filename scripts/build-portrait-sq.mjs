#!/usr/bin/env node
// Derive the small square founder portrait from the canonical engraving.
//
//   npm run portrait:sq
//
// WHY THIS EXISTS. /book/'s "Who you'll talk to" card needs a 72px portrait,
// and it used to point at a separately-produced asset — a soft, colour-tinted
// engraving 160px square. Desaturating it in CSS (the card already carries the
// same `filter: saturate(0); mix-blend-mode: multiply` as .bio__portrait) turns
// it grey but cannot turn a tonal image into line art, so it read as the only
// photographic portrait on the site while / and /about/ showed a crisp
// pen-and-ink hedcut. One portrait, two treatments.
//
// The fix is not CSS, it is the source: crop the head out of the SAME 768px
// monochrome engraving the big card uses, so there is one portrait asset lineage
// and the small one inherits the treatment by construction.
//
// Output is COMMITTED, like the OG cards, and for the same reason — a deploy
// must never need a browser. This is not part of build:static; run it by hand if
// the source portrait is ever replaced.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "images", "christopher-myers-hedcut.png");
const OUT = path.join(ROOT, "images", "christopher-myers-hedcut-sq.png");

// Crop window into the 768x768 source, chosen to frame hair-top to collar the
// way the old asset did. Square, so the 1/1 aspect-ratio in CSS never distorts.
const CROP = { x: 155, y: 30, size: 460 };
// 3x the 72px slot, so the engraving's stipple survives on a retina screen.
const OUT_SIZE = 216;

if (!fs.existsSync(SRC)) {
	console.error(`[portrait:sq] missing source ${path.relative(ROOT, SRC)}`);
	process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
const dataUri = "data:image/png;base64," + fs.readFileSync(SRC).toString("base64");

// PNG plus WebP, the same pair .bio__portrait ships. Stipple is the worst case
// for PNG — every dot is an edge — so the WebP is worth having at this size.
const out = await page.evaluate(
	async ({ dataUri, CROP, OUT_SIZE }) => {
		const img = new Image();
		img.src = dataUri;
		await img.decode();
		const c = document.createElement("canvas");
		c.width = c.height = OUT_SIZE;
		const g = c.getContext("2d");
		g.imageSmoothingQuality = "high";
		g.drawImage(img, CROP.x, CROP.y, CROP.size, CROP.size, 0, 0, OUT_SIZE, OUT_SIZE);
		return {
			png: c.toDataURL("image/png").split(",")[1],
			webp: c.toDataURL("image/webp", 0.92).split(",")[1],
		};
	},
	{ dataUri, CROP, OUT_SIZE },
);

await browser.close();
for (const [ext, b64] of [["png", out.png], ["webp", out.webp]]) {
	const file = OUT.replace(/\.png$/, "." + ext);
	const buf = Buffer.from(b64, "base64");
	const prev = fs.existsSync(file) ? fs.statSync(file).size : 0;
	fs.writeFileSync(file, buf);
	console.log(
		`[portrait:sq] ${path.relative(ROOT, file)} — ${OUT_SIZE}x${OUT_SIZE}, ` +
			`${(buf.length / 1024).toFixed(1)}KB (was ${(prev / 1024).toFixed(1)}KB)`,
	);
}
