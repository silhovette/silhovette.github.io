(() => {
  "use strict";
  const timeline = document.querySelector(".personal-timeline");
  if (!timeline) return;
  const items = [...timeline.children];
  if (!items.length) return;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let frame = null;

  // Scroll and resize events share one scheduled update; there is no continuous loop.
  const update = () => {
    frame = null;
    // offsetTop stays in CSS pixels, including with the site's desktop zoom: 0.9.
    const height = items.at(-1).offsetTop - items[0].offsetTop;
    timeline.style.setProperty("--timeline-axis-height", height + "px");
    const positions = items.map(item => item.getBoundingClientRect());
    const zoom = timeline.getBoundingClientRect().width / timeline.offsetWidth;
    const nodeOffset = parseFloat(getComputedStyle(timeline).getPropertyValue("--timeline-node-top")) * zoom;
    const readingLine = innerHeight * 0.45;
    let current = -1;
    positions.forEach((rect, index) => {
      if (rect.top + nodeOffset <= readingLine) current = index;
    });
    if (positions.at(-1).bottom < 0 || positions[0].top > innerHeight) current = -1;
    items.forEach((item, index) => {
      const active = index === current;
      item.classList.toggle("is-current", active);
      if (active) item.setAttribute("aria-current", "true");
      else item.removeAttribute("aria-current");
    });
  };
  const schedule = () => {
    if (frame === null) frame = requestAnimationFrame(update);
  };

  // Only entries below the initial viewport receive a restrained, one-time reveal.
  // Without JavaScript, or under reduced motion, every event is already visible.
  const reveal = item => {
    item.classList.remove("timeline-reveal-pending");
    observer?.unobserve(item);
  };
  const observer = !motion.matches && "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
    }, { threshold: 0.12 }) : null;
  items.forEach(item => {
    item.tabIndex = 0;
    if (observer && item.getBoundingClientRect().top > innerHeight) {
      item.classList.add("timeline-reveal-pending");
      observer.observe(item);
    }
  });
  timeline.addEventListener("focusin", event => {
    const item = event.target.closest("li");
    if (item && timeline.contains(item)) reveal(item);
  });
  motion.addEventListener("change", () => {
    if (motion.matches) {
      items.forEach(reveal);
      observer?.disconnect();
    }
    schedule();
  });
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  addEventListener("pageshow", schedule);
  document.addEventListener("site-language-change", schedule);
  new ResizeObserver(schedule).observe(timeline);
  schedule();
})();
