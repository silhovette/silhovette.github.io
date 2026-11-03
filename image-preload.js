(() => {
  "use strict";

  // Resolve from this shared script so nested pages and file:// entry points work too.
  const base = new URL(".", document.currentScript.src);
  // Images used by the live pages, with their exact query strings for cache reuse.
  // Add new site images here when they are introduced in HTML, CSS, or JavaScript.
  const sources = [
    "assets/avatar/IMG_9119-optimized.webp",
    "assets/photos/webp/avatar.webp",
    "assets/projects/octonest-overview.webp",
    "assets/projects/chainlora-overview.webp",
    "assets/projects/sict-overview.webp",
    "assets/projects/racp-overview.webp",
    "assets/papers/RELAY1.webp",
    "assets/papers/RELAY2.webp",
    "assets/papers/RELAY3.webp",
    "assets/papers/Visual2Craft.webp?v=3",
    "assets/playground/cover/V2C.webp",
    "assets/icons/portfolio.svg",
    "assets/photos/1materia/02-display-600.webp",
    "assets/photos/1materia/02-display-1200.webp",
    "assets/photos/1materia/01-display-720.webp",
    "assets/photos/1materia/01-display-1440.webp",
    "assets/photos/1materia/frame-01.webp",
    "assets/photos/1materia/frame-02.webp",
    "assets/photos/1materia/frame-03.webp",
    "assets/photos/1materia/frame-05.webp",
    "assets/photos/1materia/frame-06.webp",
    "assets/photos/1materia/frame-07.webp",
    "assets/photos/2terra/left1.webp",
    "assets/photos/2terra/right1.webp",
    "assets/photos/3mechanica/left1.webp",
    "assets/photos/3mechanica/right1.webp",
  ];

  for (const chapter of ['1materia', '2terra', '3mechanica']) {
    sources.push(`assets/photos/${chapter}/hero-banner-1800.webp`);
    if (chapter !== '3mechanica') {
      sources.push(`assets/photos/${chapter}/hero-banner-900.webp`);
    }
  }
  for (let index = 1; index <= 8; index++) {
    sources.push(`assets/photos/2terra/${index}.webp`);
  }

  // Warm the browser's normal image/HTTP cache immediately, without adding DOM nodes
  // or making the page's entry animation wait for other pages' images.
  const pending = new Set();
  for (const source of sources) {
    const image = new Image();
    image.loading = "eager";
    image.decoding = "async";
    image.fetchPriority = "low";
    image.onload = image.onerror = () => pending.delete(image);
    pending.add(image);
    image.src = new URL(source, base).href;
  }
})();
