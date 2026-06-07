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
  #gs-tooltip {
    position: fixed;
    background: #1e2030;
    color: #e2e8f0;
    border-radius: 6px;
    padding: 8px 12px;
    font-family: monospace;
    font-size: 13px;
    line-height: 1.5;
    pointer-events: none;
    z-index: 9999;
    max-width: 320px;
    word-break: break-word;
    display: none;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  }
</style>
</head>
<body>
  <div id="gs-tooltip"></div>
  <div class="wrap">
    <h1>${escapeHtml(title)}</h1>
    ${svg}
  </div>
<script>
(function () {
  var tip = document.getElementById('gs-tooltip');
  var circles = document.querySelectorAll('circle[data-sha]');
  circles.forEach(function (circle) {
    circle.style.cursor = 'pointer';
    circle.addEventListener('mouseenter', function (e) {
      var msg    = circle.getAttribute('data-message') || '';
      var author = circle.getAttribute('data-author')  || '';
      var date   = circle.getAttribute('data-date')    || '';
      var sha    = circle.getAttribute('data-sha')     || '';
      tip.innerHTML =
        '<strong>' + escTip(msg) + '</strong><br>' +
        escTip(author) + '<br>' +
        escTip(date.slice(0, 10)) + ' &nbsp;<span style="opacity:0.5">' + escTip(sha.slice(0, 7)) + '</span>';
      tip.style.display = 'block';
      positionTip(e);
    });
    circle.addEventListener('mousemove', function (e) {
      positionTip(e);
    });
    circle.addEventListener('mouseleave', function () {
      tip.style.display = 'none';
    });
  });
  function positionTip(e) {
    var pad = 14;
    var tw  = tip.offsetWidth  || 320;
    var th  = tip.offsetHeight || 60;
    var x = e.clientX + pad;
    var y = e.clientY + pad;
    if (x + tw > window.innerWidth  - pad) { x = e.clientX - tw - pad; }
    if (y + th > window.innerHeight - pad) { y = e.clientY - th - pad; }
    tip.style.left = x + 'px';
    tip.style.top  = y + 'px';
  }
  function escTip(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
})();
</script>
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
