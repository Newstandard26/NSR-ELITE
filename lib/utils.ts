import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Returns black or white for best contrast against a hex background.
// Used for disposition badges whose colors are user-defined.
export function contrastText(hex: string): "#000000" | "#FFFFFF" {
  const c = hex.replace("#", "");
  if (c.length !== 6) return "#FFFFFF";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  // Perceived luminance (YIQ).
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? "#000000" : "#FFFFFF";
}

// Maps a hex color to the nearest standard colored-circle emoji, so a pin's
// dropdown glyph stays consistent with its color (color is the single source
// of truth for a disposition).
const EMOJI_PALETTE: [string, [number, number, number]][] = [
  ["🔴", [239, 68, 68]],
  ["🟠", [249, 115, 22]],
  ["🟡", [234, 179, 8]],
  ["🟢", [34, 197, 94]],
  ["🔵", [59, 130, 246]],
  ["🟣", [168, 85, 247]],
  ["🟤", [120, 72, 40]],
  ["⚪", [244, 244, 245]],
  ["⚫", [24, 24, 27]],
];

export function colorToEmoji(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length !== 6) return "🔵";
  const rgb: [number, number, number] = [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ];
  let best = "🔵";
  let bestD = Infinity;
  for (const [emoji, p] of EMOJI_PALETTE) {
    const d = (p[0] - rgb[0]) ** 2 + (p[1] - rgb[1]) ** 2 + (p[2] - rgb[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = emoji;
    }
  }
  return best;
}
