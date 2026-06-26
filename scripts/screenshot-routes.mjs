// scripts/screenshot-routes.mjs — full-page 1440px screenshots of the 10
// primary routes (the nav() set), saved to /audit/<bucket>/.
//
//   node scripts/screenshot-routes.mjs before     -> /audit/before/*.png
//   node scripts/screenshot-routes.mjs after      -> /audit/after/*.png
//
// Serves the repo over a local http server (so absolute /asset paths resolve)
// and drives the system Chrome via playwright-core (channel: 'chrome' — no
// browser download). Captures full-page at a 1440px-wide viewport.

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bucket = process.argv[2] || "before";
const OUT = path.join(ROOT, "audit", bucket);
const PORT = 8123;
const WIDTH = 1440;

// The 10 primary routes = the canonical nav() set in scripts/lib/templates.mjs
const ROUTES = [
  ["/", "01-home"],
  ["/services/", "02-services"],
  ["/method/", "03-method"],
  ["/pricing/", "04-pricing"],
  ["/work/", "05-work"],
  ["/about/", "06-about"],
  ["/blog/", "07-blog"],
  ["/contact/", "08-contact"],
  ["/careers/", "09-careers"],
  ["/book/", "10-book"],
];

const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2",
  ".woff": "font/woff", ".xml": "application/xml", ".txt": "text/plain",
};

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent(req.url.split("?")[0]);
      let file = path.join(ROOT, urlPath);
      if (urlPath.endsWith("/")) file = path.join(file, "index.html");
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end("not found"); return;
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function loadChromium() {
  try { return (await import("playwright-core")).chromium; }
  catch { console.error("playwright-core not found. Run: npm i -D playwright-core"); process.exit(1); }
}

const server = await serve();
fs.mkdirSync(OUT, { recursive: true });
const chromium = await loadChromium();

let browser;
try { browser = await chromium.launch({ channel: "chrome" }); }
catch { browser = await chromium.launch(); } // fall back to bundled if no system Chrome

const page = await browser.newPage({ viewport: { width: WIDTH, height: 900 }, deviceScaleFactor: 2 });

let ok = 0;
for (const [route, name] of ROUTES) {
  const url = `http://localhost:${PORT}${route}`;
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(400); // let webfonts settle
    const out = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: out, fullPage: true });
    console.log(`  ✓ ${route.padEnd(22)} -> audit/${bucket}/${name}.png`);
    ok++;
  } catch (err) {
    console.error(`  ✗ ${route.padEnd(22)} ${err.message}`);
  }
}

await browser.close();
server.close();
console.log(`\n${ok}/${ROUTES.length} routes captured to audit/${bucket}/`);
process.exit(ok === ROUTES.length ? 0 : 1);
