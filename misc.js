(() => {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const hero = document.querySelector(".misc-hero");
  const header = document.querySelector(".portfolio-header");
  const parallaxItems = [...document.querySelectorAll(".misc-hero__image[data-parallax-speed]")];
  if (!hero || !parallaxItems.length) return;

  let frame = null;

  const updateHeroHeight = () => {
    const zoom = Number.parseFloat(getComputedStyle(document.body).zoom) || 1;
    const headerHeight = header?.getBoundingClientRect().height || 0;
    const availableHeight = Math.max(0, innerHeight - headerHeight);
    hero.style.setProperty("--misc-hero-height", `${(availableHeight / zoom).toFixed(2)}px`);
  };

  const update = () => {
    frame = null;
    updateHeroHeight();
    parallaxItems.forEach((item) => {
      if (reducedMotion.matches) {
        item.style.setProperty("--parallax-offset", "0px");
        return;
      }

      const speed = Number(item.dataset.parallaxSpeed) || 0;
      // The image already moves up with its Hero parent at 1x. Add a
      // compensating transform so its net screen movement stays at `speed`.
      const offset = scrollY * (1 - speed);
      item.style.setProperty("--parallax-offset", `${offset.toFixed(2)}px`);
    });
  };

  const schedule = () => {
    if (frame === null) frame = requestAnimationFrame(update);
  };

  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule, { passive: true });
  visualViewport?.addEventListener("resize", schedule, { passive: true });
  reducedMotion.addEventListener("change", schedule);
  update();
})();
