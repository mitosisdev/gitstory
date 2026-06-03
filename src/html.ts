export function wrapSvgInHtml(svg: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0b0d10; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  .wrap { padding: 2rem; }
  h1 { color: #ccc; font-family: monospace; font-size: 1rem; margin-bottom: 1rem; text-align: center; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(title)}</h1>
    ${svg}
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
