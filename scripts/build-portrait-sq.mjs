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

// Crop window into the 768x768 source. Square, so the 1/1 aspect-ratio in CSS
// never distorts.
//
// MEASURED, not eyeballed. Thresholding the source at paper-luminance minus 55
// puts the ink of the hair at y=33, the head (hair + ear) at x=195..554, and the
// beard's bottom edge at y~530. The first crop here — {155, 30, 460} — started
// 3px above the hair and ended at y=490, i.e. it clipped the crown flat and ran
// the beard off the bottom edge. At a 72px slot that reads as a badly framed
// mugshot next to /about/'s full-frame engraving.
//
// The frame is now 600px centred on the head (x 74..674 leaves 121/120px of
// margin), with the hair 60px below the top edge (10% air) and the beard 43px
// above the bottom (7% clearance), so the collar reads and the chin never
// touches an edge.
//
// PAD is why the top number is reachable at all. The SOURCE has only 33px of
// paper above the hair — 4.3% of its own height — so no crop of it can give 10%
// air without either clipping the ears or adding canvas. 27 rows of the source's
// own top band are mirrored above row 0 to make up the difference. Mirroring
// keeps the paper's grain and its horizontal vignette exactly, and the seam is
// invisible because row 0 maps to itself.
//
// **PAD MUST STAY BELOW 33.** Mirror more than that and the band picks up the
// top of the hair, which lands as a dark blob floating above the head — tried at
// 43 and it is unmistakable. If the source portrait is ever replaced, re-measure
// where its first ink row is before touching this number.
const CROP = { x: 74, y: -27, size: 600 };
const PAD = 27;
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
	async ({ dataUri, CROP, PAD, OUT_SIZE }) => {
		const img = new Image();
		img.src = dataUri;
		await img.decode();

		// Source plus PAD rows of its own top band, mirrored, so CROP.y may be
		// negative. Everything downstream works in ORIGINAL source coordinates.
		const src = document.createElement("canvas");
		src.width = img.width;
		src.height = img.height + PAD;
		const sg = src.getContext("2d");
		sg.drawImage(img, 0, PAD);
		if (PAD > 0) {
			sg.save();
			sg.translate(0, PAD);
			sg.scale(1, -1);
			sg.drawImage(img, 0, 0, img.width, PAD, 0, 0, img.width, PAD);
			sg.restore();
		}

		const c = document.createElement("canvas");
		c.width = c.height = OUT_SIZE;
		const g = c.getContext("2d");
		g.imageSmoothingQuality = "high";
		g.drawImage(src, CROP.x, CROP.y + PAD, CROP.size, CROP.size, 0, 0, OUT_SIZE, OUT_SIZE);
		return {
			png: c.toDataURL("image/png").split(",")[1],
			webp: c.toDataURL("image/webp", 0.92).split(",")[1],
		};
	},
	{ dataUri, CROP, PAD, OUT_SIZE },
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
