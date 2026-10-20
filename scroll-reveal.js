(() => {
  "use strict";
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const units = [...document.querySelectorAll([
    ".portfolio-section > .section-top", ".about-statement", ".about-signature", ".about-body",
    ".interest-item", ".project-card", ".paper-row", ".honors-title", ".honor-row", ".profile-timeline",
    ".play-card", ".contact-top", ".contact-main", ".contact-bottom", ".secondary-footer-inner",
    ".archive-heading", ".research-copy", ".research-figure", ".archive-section-title", ".other-projects-list > li",
    ".timeline-section > .section-top", ".personal-timeline > li",
    "#playground-intro > .section-heading", ".playground-summary", ".photo-toolbar", ".photo-strip",
    ".playground-details > .work-detail", "#games-and-more > .section-link",
  ].join(","))];
  const pending = new Set();
  const animations = new Map();
  let observer;
  let frame = null;
  let heroObserver;
  const distance = () => matchMedia("(max-width: 760px)").matches ? 8 : 12;
  const inView = element => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight
      && rect.right > 0 && rect.left < innerWidth;
  };
  const finish = element => {
    pending.delete(element);
    observer?.unobserve(element);
    element.classList.remove("is-reveal-pending");
  };
  const play = (element, delay = 0, positionOnly = false) => {
    if (motion.matches || !element.animate) return;
    const start = { transform: `translateY(${distance()}px)` };
    const end = { transform: "none" };
    if (!positionOnly) { start.opacity = 0; end.opacity = 1; }
    const animation = element.animate([start, end], {
      duration: 600, delay, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards",
    });
    animations.set(element, animation);
    // No persistent transform, layer hints or filled animation after completion.
    const cleanup = () => {
      if (animations.get(element) === animation) animations.delete(element);
    };
    animation.finished.then(cleanup, cleanup);
  };
  const show = (element, immediate = false) => {
    if (!pending.has(element)) return;
    finish(element);
    // Delay only the figure itself, never a whole section or a global queue.
    if (!immediate) play(element, element.matches(".research-figure") ? 70 : 0);
  };
  const showViewport = () => {
    frame = null;
    [...pending].filter(inView).forEach(element => show(element, true));
  };
  const scheduleViewport = () => {
    if (frame === null) frame = requestAnimationFrame(showViewport);
  };
  const showTarget = target => {
    if (!(target instanceof Element)) return;
    for (const element of pending) {
      if (element === target || element.contains(target)) show(element, true);
    }
    for (const [element, animation] of animations) {
      if (element === target || element.contains(target)) animation.cancel();
    }
  };
  const finishAll = () => {
    heroObserver?.disconnect();
    [...pending].forEach(finish);
    animations.forEach(animation => animation.cancel());
    animations.clear();
    observer?.disconnect();
  };

  try {
    // Install escape paths before hiding anything. Missing JS / IO leaves normal HTML.
    window.siteReveal = { show: showTarget };
    document.addEventListener("focusin", event => showTarget(event.target));
    const showHash = () => {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      if (id) showTarget(document.getElementById(id));
      scheduleViewport();
    };
    addEventListener("hashchange", showHash);
    addEventListener("pageshow", scheduleViewport);
    addEventListener("resize", scheduleViewport, { passive: true });
    document.addEventListener("beforematch", event => showTarget(event.target));
    addEventListener("beforeprint", finishAll);
    motion.addEventListener("change", () => { if (motion.matches) finishAll(); });
    if (motion.matches || !("IntersectionObserver" in window)) return;

    observer = new IntersectionObserver(entries => {
      try {
        for (const entry of entries) {
          if (entry.isIntersecting) show(entry.target);
        }
      } catch { finishAll(); }
    }, { threshold: 0.08, rootMargin: "0px 0px -12px 0px" });
    for (const element of units) {
      element.setAttribute("data-scroll-reveal", "");
      if (inView(element)) continue; // The first screen already has the page fade.
      pending.add(element);
      observer.observe(element);
      element.classList.add("is-reveal-pending");
    }

    const hero = [...document.querySelectorAll(".intro-line, .cover h1, .cover-tagline, .cover-description, .cover-actions")];
    const revealHero = () => {
      heroObserver?.disconnect();
      if (motion.matches || (location.hash && location.hash !== "#hero") || scrollY > 80) return;
      const pageFading = document.documentElement.getAttribute("data-page-fade") === "revealing";
      hero.filter(inView).forEach((element, index) => {
        // During the global fade, animate position only to avoid doubled opacity fades.
        play(element, index * (distance() === 8 ? 45 : 65), pageFading);
      });
    };
    if (document.documentElement.getAttribute("data-page-fade") === "pending") {
      heroObserver = new MutationObserver(() => {
        if (document.documentElement.getAttribute("data-page-fade") !== "pending") {
          try { revealHero(); } catch { finishAll(); }
        }
      });
      heroObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-page-fade"] });
    } else revealHero();
  } catch { finishAll(); }
})();
