(() => {
  "use strict";
  const viewport = document.querySelector("[data-timeline-preview]");
  if (!viewport) return;
  const region = viewport.closest(".profile-timeline");
  const track = viewport.querySelector(".timeline-preview-track");
  const status = viewport.querySelector(".timeline-preview-status");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const pixelsPerSecond = 12;
  let animation = null;
  let sequence = null;
  let sequenceHeight = 0;
  let duration = 0;
  let visible = false;
  let hovered = false;
  let focused = false;
  let printing = false;

  const sync = () => {
    if (!animation) return;
    if (visible && !document.hidden && !hovered && !focused && !motion.matches && !printing) animation.play();
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

  region.addEventListener("pointerenter", event => {
    if (event.pointerType === "mouse") { hovered = true; sync(); }
  });
  region.addEventListener("pointerleave", () => { hovered = false; sync(); });
  region.addEventListener("focusin", () => { focused = true; sync(); });
  region.addEventListener("focusout", event => {
    focused = region.contains(event.relatedTarget);
    sync();
  });
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
