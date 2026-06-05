// src/gif.ts — animated GIF export.
//
// Renders one SVG frame per commit slice (commits[0..i]) using the existing
// renderer, rasterizes each SVG to RGBA pixels via @resvg/resvg-js, then
// encodes all frames into an animated GIF with gifenc.
//
// Entry point: exportGif(commits, outputPath)

import { writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import type { Commit } from "./parser.js";
import { renderTimeline } from "./renderer.js";

/** Delay per frame in centiseconds (gifenc uses cs, not ms). 100ms = 10cs. */
const FRAME_DELAY_CS = 10; // 100ms

/**
 * Render one SVG frame per commit slice and encode all frames into an
 * animated GIF, written to `outputPath`.
 *
 * @param commits  Ordered commits (chronological, oldest first).
 * @param outputPath  Destination file path (e.g. "timeline.gif").
 */
export async function exportGif(
  commits: Commit[],
  outputPath: string,
): Promise<void> {
  if (commits.length === 0) {
    // Write a minimal valid empty GIF (1x1 transparent)
    writeFileSync(outputPath, buildEmptyGif());
    return;
  }

  const encoder = GIFEncoder();

  let width = 0;
  let height = 0;

  for (let i = 1; i <= commits.length; i++) {
    const slice = commits.slice(0, i);
    const svg = renderTimeline(slice);

    // Rasterize SVG → RGBA pixel buffer
    const resvg = new Resvg(svg, { logLevel: "off" });
    const rendered = resvg.render();
    const rgba = rendered.pixels; // Buffer of RGBA bytes (Uint8Array-compatible)
    width = rendered.width;
    height = rendered.height;

    // Quantize RGBA → indexed palette frame
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);

    // Last frame holds for 2 seconds (200cs) so the final state is visible
    const delay = i === commits.length ? 200 : FRAME_DELAY_CS;

    encoder.writeFrame(index, width, height, {
      palette,
      delay,
      repeat: 0, // 0 = loop forever
    });
  }

  const bytes = encoder.bytes();
  writeFileSync(outputPath, Buffer.from(bytes));
}

/** Build a minimal 1×1 GIF for the empty-commits edge case. */
function buildEmptyGif(): Buffer {
  const encoder = GIFEncoder();
  // 1×1 black pixel
  const rgba = new Uint8Array([0, 0, 0, 255]);
  const palette = quantize(rgba, 2);
  const index = applyPalette(rgba, palette);
  encoder.writeFrame(index, 1, 1, { palette, delay: FRAME_DELAY_CS, repeat: 0 });
  return Buffer.from(encoder.bytes());
}
