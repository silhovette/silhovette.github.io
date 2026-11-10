(() => {
  "use strict";

  // Warm destination previews on navigation intent. The current page's native
  // image requests retain priority, and unrelated galleries consume no bandwidth.
  const base = new URL(".", document.currentScript.src);
  const previews = new Map([
    ["photos.html", ["assets/photos/1materia/hero-banner-1800.webp", "assets/photos/webp/avatar.webp"]],
    ["misc.html", ["assets/misc/cover/V2C.webp"]],
    ["works.html", ["assets/projects/octonest-overview.webp"]],
  ]);
  const requested = new Set();
  const pending = new Set();
  const warmLink = (event) => {
    const link = event.target.closest?.("a[href]");
    if (!link) return;
    const url = new URL(link.href, base);
    if (url.origin !== base.origin) return;
    const relative = url.href.slice(base.href.length).split(/[?#]/)[0];
    for (const source of previews.get(relative) || []) {
      if (requested.has(source)) continue;
      requested.add(source);
      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = "low";
      image.onload = image.onerror = () => pending.delete(image);
      pending.add(image);
      image.src = new URL(source, base).href;
    }
  };
  document.addEventListener("pointerover", warmLink, { passive: true });
  document.addEventListener("focusin", warmLink);
})();
