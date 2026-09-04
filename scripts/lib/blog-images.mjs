import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// Keep diagrams legible while avoiding full-resolution PNGs on small cards.
// Animated/vector assets retain their original format in the caller.
export async function optimizeBlogImage(buffer, { dir, publicDir, hash }) {
  const source = await sharp(buffer).metadata();
  if (!source.width || !source.height || (source.pages || 1) > 1) return null;
  if (!['jpeg', 'png', 'webp', 'avif'].includes(source.format)) return null;
  const width = Math.min(source.width, 1280);
  const sizes = [...new Set([320, 640, width].filter(size => size <= width))].sort((a,b) => a-b);
  const variants = [];
  for (const size of sizes) {
    const file = `${hash}-${size}.webp`;
    const { data, info } = await sharp(buffer).rotate().resize({ width: size, withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer({ resolveWithObject: true });
    fs.writeFileSync(path.join(dir, file), data);
    variants.push({ src: `${publicDir}/${file}`, width: info.width, height: info.height });
  }
  const largest = variants.at(-1);
  return { ...largest, srcset: variants.map(v => `${v.src} ${v.width}w`).join(', ') };
}
