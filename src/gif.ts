import { GIFEncoder, quantize, applyPalette } from "gifenc";
import type { Commit } from "./parser.js";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 300;
const TIMELINE_Y = 150;
const DOT_RADIUS = 4;
const MARGIN = 50;
const BG_COLOR: [number, number, number] = [0x0b, 0x0d, 0x10];
const DOT_COLOR: [number, number, number] = [0x8a, 0x2b, 0xe2];
const FRAME_DELAY = 40; // ms
const FINAL_HOLD = 2000; // ms

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
        drawCircle(rgba, dotX[j]!, TIMELINE_Y, DOT_RADIUS, DOT_COLOR);
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
