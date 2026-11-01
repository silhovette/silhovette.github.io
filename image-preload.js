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
    "assets/playground/cover/photo_collection.webp",
    "assets/playground/cover/V2C.webp",
    "assets/icons/portfolio.svg",
  ];

  const chapterSizes = '(max-width: 760px) 90vw, (max-width: 1460px) 53vw, 780px';
  for (const chapter of ['1materia', '2terra', '3mechanica']) {
    sources.push({
      src: `assets/photos/${chapter}/hero-banner-1800.webp`,
      srcset: `assets/photos/${chapter}/hero-banner-900.webp 900w, assets/photos/${chapter}/hero-banner-1800.webp 1800w`,
      sizes: chapterSizes,
    });
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
    if (typeof source === "string") {
      image.src = new URL(source, base).href;
    } else {
      image.sizes = source.sizes;
      image.srcset = source.srcset.split(', ').map(candidate => {
        const [url, width] = candidate.split(' ');
        return `${new URL(url, base).href} ${width}`;
      }).join(', ');
      image.src = new URL(source.src, base).href;
    }
  }
})();
