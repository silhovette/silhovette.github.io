(() => {
  "use strict";
  const root = document.documentElement;
  const ready = () => document.dispatchEvent(new Event("page-fade-ready"));
  const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

  async function prepareFirstScreen() {
    if (root.getAttribute("data-page-fade") !== "pending") return;
    try {
      // Deferred page scripts (including the sculpture) have run by DOMContentLoaded.
      // Let layout discover the used fonts and the current viewport's images.
      await nextFrame();
      const images = [...document.images].filter(image => {
        if (!image.currentSrc && !image.getAttribute("src")) return false;
        const rect = image.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0
          && rect.top < innerHeight && rect.left < innerWidth;
      });
      await Promise.allSettled([
        document.fonts?.ready,
        ...images.map(image => image.decode?.()),
      ]);
      // Commit the initial opacity and give Canvas its first paint before revealing.
      await nextFrame();
      ready();
    } catch {
      ready();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", prepareFirstScreen, { once: true });
  } else {
    prepareFirstScreen();
  }
})();
