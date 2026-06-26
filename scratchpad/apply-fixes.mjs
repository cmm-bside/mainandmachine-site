import fs from "node:fs";
process.chdir("/Users/christophermyers/mainandmachine-site");
let fails = 0;
function edit(file, find, repl, label, count = 1) {
  let s = fs.readFileSync(file, "utf8");
  const n = s.split(find).length - 1;
  if (n !== count) { console.log(`FAIL(${n}/${count}) ${label}`); fails++; return; }
  fs.writeFileSync(file, s.split(find).join(repl));
  console.log(`ok ${label}`);
}

const CSS = "styles.css";

// 1+2+3) HERO HEADLINE (capped) + H2 (capped) — split the top tokens off the headings
edit(CSS,
`.h-hero { font-size: clamp(var(--fs-39),7vw,var(--fs-110)); font-weight: 900; letter-spacing: -0.025em; line-height: 0.98; }
.h2     { font-size: clamp(var(--fs-39),4.4vw,var(--fs-76)); letter-spacing: -0.025em; }`,
`.h-hero { font-size: clamp(var(--fs-39),7vw,var(--fs-110)); font-weight: 900; letter-spacing: -0.025em; line-height: 0.98; }
/* hero headline: capped so it can't balloon; max-width holds it to ~3 lines */
.hero__headline { font-size: clamp(46px, 5.4vw, 84px); line-height: 0.95; letter-spacing: -0.025em; max-width: 12ch; }
/* section headings: capped display size + intentional wrap (not ragged) */
.h2     { font-size: clamp(32px, 3.8vw, 60px); line-height: 1.06; letter-spacing: -0.02em; max-width: 18ch; text-wrap: balance; }`,
  "hero__headline + h2 caps");

// 4) STRAY SQUARE — rename hero crop-mark modifiers off the colliding bare `.tl` component.
//    Also harden .hm-crop against any future class collision (no bg / no padding).
edit(CSS,
`.hm-crop{ position:absolute; width:13px; height:13px; border:1.5px solid #B83E22; z-index:1; opacity:0; }
.hm-crop.tl{ top:18px; left:18px; border-right:0; border-bottom:0; }
.hm-crop.tr{ top:18px; right:18px; border-left:0; border-bottom:0; }
.hm-crop.bl{ bottom:18px; left:18px; border-right:0; border-top:0; }
.hm-crop.br{ bottom:18px; right:18px; border-left:0; border-top:0; }`,
`.hm-crop{ position:absolute; box-sizing:border-box; width:13px; height:13px; background:none; padding:0; border:1.5px solid #B83E22; z-index:1; opacity:0; }
.hm-crop--tl{ top:18px; left:18px; border-right:0; border-bottom:0; }
.hm-crop--tr{ top:18px; right:18px; border-left:0; border-bottom:0; }
.hm-crop--bl{ bottom:18px; left:18px; border-right:0; border-top:0; }
.hm-crop--br{ bottom:18px; right:18px; border-left:0; border-top:0; }`,
  "hm-crop rename + harden");

// 4b) WORD-WRAP — keep each word's letters together so "Street." can't break mid-word
edit(CSS,
`.hm-letter{ display:inline-block; transform:translateY(110%) rotate(3deg); opacity:0; will-change:transform,opacity; }`,
`.hm-word{ display:inline-block; white-space:nowrap; }
.hm-letter{ display:inline-block; transform:translateY(110%) rotate(3deg); opacity:0; will-change:transform,opacity; }`,
  "hm-word nowrap");

// 5) VERTICAL RHYTHM — section padding caps at 112 desktop / 72 mobile (one shared value)
edit(CSS, `  --section-pad: clamp(72px, 9vw, 140px);`,
          `  --section-pad: clamp(72px, 9vw, 112px);`, "section-pad cap 112");
// heading -> standfirst gap = 24px when stacked
edit(CSS, `@media (max-width: 820px){ .head-block { grid-template-columns: 1fr; gap: 16px; } }`,
          `@media (max-width: 820px){ .head-block { grid-template-columns: 1fr; gap: 24px; } }`,
  "head-block stacked gap 24");
// body 16px / 1.6
edit(CSS, `  color: var(--tx);
  line-height: 1.5;`,
          `  color: var(--tx);
  line-height: 1.6;`, "body line-height 1.6");

// 6) HTML — apply the renamed crop-mark classes
const HTML = "index.html";
edit(HTML, `<span class="hm-crop tl" aria-hidden="true"></span>`, `<span class="hm-crop hm-crop--tl" aria-hidden="true"></span>`, "html crop tl");
edit(HTML, `<span class="hm-crop tr" aria-hidden="true"></span>`, `<span class="hm-crop hm-crop--tr" aria-hidden="true"></span>`, "html crop tr");
edit(HTML, `<span class="hm-crop bl" aria-hidden="true"></span>`, `<span class="hm-crop hm-crop--bl" aria-hidden="true"></span>`, "html crop bl");
edit(HTML, `<span class="hm-crop br" aria-hidden="true"></span>`, `<span class="hm-crop hm-crop--br" aria-hidden="true"></span>`, "html crop br");

if (fails) { console.log(`\n${fails} FAILED — no partial harm beyond applied edits`); process.exit(1); }
console.log("\nAll style/HTML fixes applied.");
