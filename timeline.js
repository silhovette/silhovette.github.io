(() => {
  "use strict";
  const timeline = document.querySelector(".personal-timeline");
  if (!timeline) return;
  const items = [...timeline.children];
  if (!items.length) return;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let frame = null;
  let previousHeight = null, previousCurrent = null;

  // Scroll and resize events share one scheduled update; there is no continuous loop.
  const update = () => {
    frame = null;
    // offsetTop stays in CSS pixels, including with the site's desktop zoom: 0.9.
    const height = items.at(-1).offsetTop - items[0].offsetTop;
    const positions = items.map(item => item.getBoundingClientRect());
    const zoom = timeline.getBoundingClientRect().width / timeline.offsetWidth;
    const nodeOffset = parseFloat(getComputedStyle(timeline).getPropertyValue("--timeline-node-top")) * zoom;
    const readingLine = innerHeight * 0.45;
    let current = -1;
    positions.forEach((rect, index) => {
      if (rect.top + nodeOffset <= readingLine) current = index;
    });
    if (positions.at(-1).bottom < 0 || positions[0].top > innerHeight) current = -1;
    // Finish geometry reads before writing, and leave unchanged nodes alone.
    if (height !== previousHeight) {
      timeline.style.setProperty("--timeline-axis-height", height + "px");
      previousHeight = height;
    }
    if (current !== previousCurrent) {
      items.forEach((item, index) => {
        const active = index === current;
        item.classList.toggle("is-current", active);
        if (active) item.setAttribute("aria-current", "true");
        else item.removeAttribute("aria-current");
      });
      previousCurrent = current;
    }
  };
  const schedule = () => {
    if (frame === null) frame = requestAnimationFrame(update);
  };

  // The shared reveal system owns opacity and transform; this file owns the axis.
  items.forEach(item => { item.tabIndex = 0; });
  motion.addEventListener("change", schedule);
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  addEventListener("pageshow", schedule);
  document.addEventListener("site-language-change", schedule);
  new ResizeObserver(schedule).observe(timeline);
  schedule();
})();
