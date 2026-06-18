// Generates app/PWA icons from the vector badge on an opaque dark background.
// Uses the badge paths (no fonts), so rendering is deterministic.
// Run with: npm install --no-save sharp && node scripts/gen-icons.mjs
import fs from "node:fs";
import sharp from "sharp";

const badge = fs.readFileSync("public/brand/logo-full.svg", "utf8");
const inner = badge.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

const BADGE_W = 1195.2;
const BADGE_H = 404.0;
const SIZE = 1024;
const TARGET_W = 900; // badge width within the icon
const scale = TARGET_W / BADGE_W;
const tx = (SIZE - TARGET_W) / 2;
const ty = (SIZE - BADGE_H * scale) / 2;
const BG = "#000000";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${BG}"/>
  <g transform="translate(${tx} ${ty}) scale(${scale})">${inner}</g>
</svg>`;

const base = sharp(Buffer.from(svg));
const out = [
  ["public/icons/icon-1024.png", 1024, true], // App Store / native: no alpha
  ["public/icons/icon-512.png", 512, false],
  ["public/icons/icon-192.png", 192, false],
  ["public/icons/apple-touch-icon.png", 180, true],
];

for (const [file, size, flatten] of out) {
  let img = base.clone().resize(size, size);
  if (flatten) img = img.flatten({ background: BG });
  await img.png().toFile(file);
  console.log("wrote", file);
}
