// Usage: bun bin/preview.ts [file.svg] > output.html
// With no file arg: reads SVG from stdin
import { wrapSvgInHtml } from "../src/html.js";

const filePath = process.argv[2];
let svgInput: string;

if (filePath) {
  svgInput = await Bun.file(filePath).text();
} else {
  const chunks: Uint8Array[] = [];
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(chunk);
  }
  svgInput = Buffer.concat(chunks).toString("utf8");
}

const rawName = filePath
  ? (filePath.replace(/\.svg$/i, "").split("/").at(-1) ?? "gitstory")
  : "gitstory";
process.stdout.write(wrapSvgInHtml(svgInput.trim(), rawName));
