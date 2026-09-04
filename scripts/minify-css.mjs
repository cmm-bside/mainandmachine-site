#!/usr/bin/env node
// Keep committed styles.css readable. Only the disposable Cloudflare Pages
// build checkout is rewritten; local verification requires a separate output.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "styles.css");

export async function minifyCss(source) {
	const result = await transform(source, {
		loader: "css",
		sourcefile: "styles.css",
		minifyWhitespace: true,
		minifyIdentifiers: false,
		minifySyntax: false,
		legalComments: "none",
		charset: "utf8",
		logLevel: "silent",
	});
	if (result.warnings.length) {
		throw new Error(`CSS parser warnings: ${result.warnings.map((item) => item.text).join("; ")}`);
	}
	return result.code;
}

export function resolveOutput(args, env = process.env, root = ROOT) {
	const source = path.join(root, "styles.css");
	if (!args.length) return env.CF_PAGES === "1" ? source : null;
	if (args.length !== 2 || args[0] !== "--output" || !args[1]) {
		throw new Error("Usage: npm run css:build -- --output <separate-file.css>");
	}
	const output = path.resolve(args[1]);
	if (output === source) throw new Error("Explicit output must not replace the readable source styles.css.");
	return output;
}

export async function buildCssFile(sourceFile, outputFile) {
	const source = await fs.readFile(sourceFile, "utf8");
	const minified = await minifyCss(source);
	await fs.mkdir(path.dirname(outputFile), { recursive: true });
	const temporary = `${outputFile}.${process.pid}.tmp`;
	try {
		await fs.writeFile(temporary, minified, "utf8");
		await fs.rename(temporary, outputFile);
	} finally {
		await fs.rm(temporary, { force: true });
	}
	return { inputBytes: Buffer.byteLength(source), outputBytes: Buffer.byteLength(minified) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const output = resolveOutput(process.argv.slice(2));
		if (!output) {
			console.log("[css:build] Local source unchanged. Use --output <separate-file.css> to verify the deployment asset.");
		} else {
			const sizes = await buildCssFile(SOURCE, output);
			console.log(`[css:build] ${sizes.inputBytes} → ${sizes.outputBytes} bytes (${Math.round(100 * (1 - sizes.outputBytes / sizes.inputBytes))}% smaller). ${output}`);
		}
	} catch (error) {
		console.error(`[css:build] ${error.message}`);
		process.exitCode = 1;
	}
}
