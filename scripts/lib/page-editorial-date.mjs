// Sitemap dates describe page content, not the latest shared navigation or
// stylesheet-cache edit. Guide review dates remain separately authoritative.
import { execFileSync } from "node:child_process";

export function editorialSignature(html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || "";
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  // Conservatively retain the body on old pages without a main landmark.
  const content = main ?? html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const metadata = [
    ...head.matchAll(/<title\b[^>]*>[\s\S]*?<\/title>|<meta\b[^>]*(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>|<link\b[^>]*rel=["']canonical["'][^>]*>|<script\b[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi),
  ].map((match) => match[0]);
  return JSON.stringify([...metadata, content.replace(/<!--[\s\S]*?-->|<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, "")].map((part) => part
    // These two labels describe the same existing offer; the Sept 5 shared
    // CTA wording update is not a new review of every supporting article.
    .replace(/\bGet (?:a free workflow|my free) plan\b/g, "Request a free workflow plan")
    .replace(/\s+/g, " ").trim()));
}

export function lastEditorialCommitDate(root, file) {
  const git = (args) => {
    try { return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
    catch { return null; }
  };
  const history = git(["log", "--format=%H %cs", "--", file]);
  if (!history) return null;
  for (const entry of history.trim().split("\n")) {
    const [hash, date] = entry.split(" ");
    const current = git(["show", `${hash}:${file}`]);
    if (current === null) continue;
    const previous = git(["show", `${hash}^:${file}`]);
    if (previous === null || editorialSignature(current) !== editorialSignature(previous)) return date;
  }
  return null;
}
