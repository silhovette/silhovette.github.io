(() => {
  "use strict";
  const viewport = document.querySelector("[data-timeline-preview]");
  if (!viewport) return;
  const track = viewport.querySelector(".timeline-preview-track");
  const status = viewport.querySelector(".timeline-preview-status");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const pixelsPerSecond = 12;
  let animation = null;
  let sequence = null;
  let sequenceHeight = 0;
  let duration = 0;
  let visible = false;
  let printing = false;
  let wheelPosition = 0;

  const wrapWheelPosition = value => {
    if (!sequenceHeight || !Number.isFinite(value)) return value;
    // The second list is a visual clone. Once the wheel reaches it, move the
    // scroll position back by one list height so the loop stays continuous.
    const loopOffset = Math.max(0, (viewport.clientHeight || 0) * 0.35);
    const cycle = sequenceHeight;
    while (value >= cycle + loopOffset) value -= cycle;
    while (value < 0) value += cycle;
    return value;
  };

  const scrollWithWheel = value => {
    wheelPosition = wrapWheelPosition(value);
    if (typeof viewport.scrollTo === "function") {
      viewport.scrollTo({ top: wheelPosition, behavior: "smooth" });
    } else {
      // Keeps the behavior deterministic in non-browser test environments.
      viewport.scrollTop = wheelPosition;
    }
  };

  const sync = () => {
    if (!animation) return;
    if (visible && !document.hidden && !motion.matches && !printing) animation.play();
    else animation.pause();
  };
  const measure = () => {
    if (printing) return;
    const height = sequence?.offsetHeight || 0;
    if (!height) return;
    if (motion.matches) {
      animation?.cancel();
      animation = null;
      sequenceHeight = height;
      return;
    }
    if (animation && height === sequenceHeight) return;
    // Preserve the travelled distance when fonts, translations or wrapping change.
    const offset = animation && duration
      ? ((Number(animation.currentTime) || 0) % duration) / duration * sequenceHeight : 0;
    animation?.cancel();
    sequenceHeight = height;
    duration = height / pixelsPerSecond * 1000;
    wheelPosition = wrapWheelPosition(viewport.scrollTop || 0);
    if (!track.animate) return; // The complete static list and full-page link remain available.
    animation = track.animate([
      { transform: "translateY(0)" }, { transform: "translateY(-50%)" },
    ], { duration, iterations: Infinity, easing: "linear" });
    animation.pause();
    animation.currentTime = (offset % height) / pixelsPerSecond * 1000;
    sync();
  };
  const localize = root => {
    root.querySelectorAll("[data-i18n]").forEach(element => {
      window.siteI18n?.setText(element, element.dataset.i18n);
    });
  };

  // Keep the page stationary while the pointer is over the preview. The
  // preview remains animated, and wheel input moves its own scroll container.
  viewport.addEventListener("wheel", event => {
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
    const current = Number.isFinite(wheelPosition) ? wheelPosition : viewport.scrollTop;
    scrollWithWheel(current + event.deltaY * unit);
  }, { passive: false });
  document.addEventListener("visibilitychange", sync);
  addEventListener("pageshow", sync);
  addEventListener("beforeprint", () => { printing = true; animation?.cancel(); });
  addEventListener("afterprint", () => { printing = false; animation = null; measure(); });
  motion.addEventListener("change", () => {
    viewport.scrollTop = 0;
    measure();
    sync();
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }, { threshold: 0.01 }).observe(viewport);
  }

  // Both pages consume the same local data, without a fetch blocked by file://.
  try {
    const source = new DOMParser().parseFromString(
      '<ol>' + window.siteTimelineMarkup + '</ol>', 'text/html'
    ).querySelector('ol');
    if (!window.siteTimelineMarkup || !source?.children.length) throw new Error('Timeline is empty');
    sequence = document.importNode(source, true);
    sequence.className = 'timeline-preview-list';
    // Event headings sit one level below this preview's own heading.
    sequence.querySelectorAll('h3').forEach(heading => {
      const replacement = document.createElement('h4');
      for (const attribute of heading.attributes) replacement.setAttribute(attribute.name, attribute.value);
      replacement.append(...heading.childNodes);
      heading.replaceWith(replacement);
    });
    const duplicate = sequence.cloneNode(true);
    duplicate.setAttribute('aria-hidden', 'true');
    duplicate.inert = true;
    track.append(sequence, duplicate);
    localize(track);
    status.hidden = true;
    measure();
    new ResizeObserver(measure).observe(sequence);
    document.addEventListener('site-language-change', measure);
  } catch (error) {
    status.hidden = true;
    console.error('Unable to initialize timeline preview:', error);
  }
})();
