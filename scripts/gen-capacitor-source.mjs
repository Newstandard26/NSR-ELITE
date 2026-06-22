// Generates the Capacitor source assets (assets/icon.png 1024², assets/splash.png 2732²)
// from the brand lockup on the app's dark background. @capacitor/assets then
// derives all per-platform icon/splash sizes from these two files.
// Run: npm install --no-save sharp && node scripts/gen-capacitor-source.mjs
import fs from "node:fs";
import sharp from "sharp";

const BG = "#0d0d0d";
const logo = fs.readFileSync("public/brand/logo-full.svg", "utf8");
const inner = logo.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const LOGO_W = 1195.2;
const LOGO_H = 404.0;

fs.mkdirSync("assets", { recursive: true });

function compose(size, logoWidthRatio, file) {
  const targetW = size * logoWidthRatio;
  const scale = targetW / LOGO_W;
  const tx = (size - targetW) / 2;
  const ty = (size - LOGO_H * scale) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${BG}"/>
    <g transform="translate(${tx} ${ty}) scale(${scale})">${inner}</g>
  </svg>`;
  return sharp(Buffer.from(svg)).flatten({ background: BG }).png().toFile(file);
}

await compose(1024, 0.84, "assets/icon.png"); // app icon: lockup fills ~84% width
await compose(2732, 0.46, "assets/splash.png"); // splash: smaller, centered
console.log("wrote assets/icon.png and assets/splash.png");
