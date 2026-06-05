import { GIFEncoder, quantize, applyPalette } from "gifenc";
import type { Commit } from "./parser.js";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 300;
const TIMELINE_Y = 150;
const DOT_RADIUS = 4;
const MARGIN = 50;
const BG_COLOR: [number, number, number] = [0x0b, 0x0d, 0x10];
const FRAME_DELAY = 40; // ms
const FINAL_HOLD = 2000; // ms

const AUTHOR_PALETTE: Array<[number, number, number]> = [
  [0x8a, 0x2b, 0xe2], // purple (original)
  [0x00, 0xbc, 0x8c], // teal
  [0xe7, 0x4c, 0x3c], // red
  [0xf3, 0x9c, 0x12], // orange
  [0x27, 0x9b, 0xff], // blue
  [0xff, 0x6b, 0x6b], // pink
];

/** Build a map from author name to RGB color, assigning palette colors in order of first appearance. */
export function buildAuthorColorMap(
  commits: Commit[],
): Map<string, [number, number, number]> {
  const map = new Map<string, [number, number, number]>();
  for (const commit of commits) {
    if (!map.has(commit.authorName)) {
      const color = AUTHOR_PALETTE[map.size % AUTHOR_PALETTE.length]!;
      map.set(commit.authorName, color);
    }
  }
  return map;
}

/** Fill a pixel buffer (RGBA, row-major) with the background color. */
function fillBackground(rgba: Uint8Array): void {
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = BG_COLOR[0];
    rgba[i + 1] = BG_COLOR[1];
    rgba[i + 2] = BG_COLOR[2];
    rgba[i + 3] = 255;
  }
}

/** Draw a filled circle at (cx, cy) with given radius. */
function drawCircle(
  rgba: Uint8Array,
  cx: number,
  cy: number,
  radius: number,
  color: [number, number, number],
): void {
  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= r2) {
        const px = Math.round(cx + dx);
        const py = Math.round(cy + dy);
        if (px >= 0 && px < CANVAS_WIDTH && py >= 0 && py < CANVAS_HEIGHT) {
          const idx = (py * CANVAS_WIDTH + px) * 4;
          rgba[idx] = color[0];
          rgba[idx + 1] = color[1];
          rgba[idx + 2] = color[2];
          rgba[idx + 3] = 255;
        }
      }
    }
  }
}

export function renderGif(commits: Commit[]): Buffer {
  const gif = GIFEncoder();

  const pixelCount = CANVAS_WIDTH * CANVAS_HEIGHT;
  const rgba = new Uint8Array(pixelCount * 4);

  // Build per-author color map once
  const colorMap = buildAuthorColorMap(commits);

  // Compute dot x-positions (chronological order, left-to-right)
  const count = commits.length;
  const usableWidth = CANVAS_WIDTH - 2 * MARGIN;
  const dotX = commits.map((_, i) =>
    count <= 1 ? CANVAS_WIDTH / 2 : MARGIN + (i / (count - 1)) * usableWidth,
  );

  if (count === 0) {
    // Single blank frame for empty commits
    fillBackground(rgba);
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    gif.writeFrame(index, CANVAS_WIDTH, CANVAS_HEIGHT, {
      palette,
      delay: FINAL_HOLD,
    });
  } else {
    for (let frame = 0; frame < count; frame++) {
      // Each frame: redraw background + all dots up to and including `frame`
      fillBackground(rgba);
      for (let j = 0; j <= frame; j++) {
        const dotColor = colorMap.get(commits[j]!.authorName) ?? AUTHOR_PALETTE[0]!;
        drawCircle(rgba, dotX[j]!, TIMELINE_Y, DOT_RADIUS, dotColor);
      }

      const palette = quantize(rgba, 256);
      const index = applyPalette(rgba, palette);
      const isLastFrame = frame === count - 1;
      gif.writeFrame(index, CANVAS_WIDTH, CANVAS_HEIGHT, {
        palette,
        delay: isLastFrame ? FINAL_HOLD : FRAME_DELAY,
      });
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  return Buffer.from(bytes);
}
