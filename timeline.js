(() => {
  const timeline = document.querySelector(".personal-timeline");
  if (!timeline) return;
  const items = [...timeline.children];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = null;
  const rank = timeline.querySelector(".timeline-rank");
  let rankAnimations = [];
  rank?.addEventListener("pointerenter", event => {
    if (event.pointerType === "touch" || reducedMotion.matches ||
        rankAnimations.some(animation => animation.playState === "running")) return;
    rankAnimations = [...rank.children].map((digit, index) => {
      const direction = index === 0 ? -1 : 1;
      return digit.animate([0, 4, 0, -4, 0].map(distance => ({
        transform: `translateY(${distance * direction}px)`, easing: "ease-in-out",
      })), { duration: 600, iterations: 3 });
    });
  });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) rankAnimations.forEach(animation => animation.cancel());
  });

  // Focus gives keyboard and touch users the same gentle emphasis as hovering.
  items.forEach(item => { item.tabIndex = 0; });

  const update = () => {
    frame = null;
    const positions = items.map(item => item.getBoundingClientRect());
    timeline.style.setProperty("--timeline-axis-height", `${positions.at(-1).top - positions[0].top}px`);
    timeline.classList.toggle("timeline-animated", !reducedMotion.matches);
    if (reducedMotion.matches) {
      items.forEach(item => item.classList.remove("is-current"));
      return;
    }
    const readingLine = window.innerHeight * 0.45;
    let current = -1;
    positions.forEach((rect, index) => {
      if (rect.top + 10 <= readingLine) current = index;
    });
    // Stop the pulse when the timeline has left the viewport.
    if (positions.at(-1).bottom < 0 || positions[0].top > window.innerHeight) current = -1;
    items.forEach((item, index) => item.classList.toggle("is-current", index === current));
  };
  const schedule = () => {
    if (frame === null) frame = window.requestAnimationFrame(update);
  };
  window.addEventListener("scroll", () => { if (!reducedMotion.matches) schedule(); }, { passive: true });
  window.addEventListener("resize", schedule);
  reducedMotion.addEventListener("change", schedule);
  document.addEventListener("site-language-change", schedule);
  new ResizeObserver(schedule).observe(timeline);
  schedule();
})();
