(() => {
  "use strict";
  const viewport = document.querySelector("[data-timeline-preview]");
  if (!viewport) return;
  const track = viewport.querySelector(".timeline-preview-track");
  const status = viewport.querySelector(".timeline-preview-status");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const pixelsPerSecond = 12;
  let sequence = null;
  let cycle = 0;
  let position = 0;
  let wheelRemaining = 0;
  let quietRemaining = 0;
  let autoSpeed = pixelsPerSecond;
  let visible = !("IntersectionObserver" in window);
  let printing = false;
  let frame = null;
  let previousTime = null;

  const wrap = value => ((value % cycle) + cycle) % cycle;
  const running = () => cycle > 0 && visible && !document.hidden && !motion.matches && !printing;
  const paint = () => {
    // The middle copy is canonical. Copies on both sides make either wrap
    // visually identical, even when the viewport falls entirely in the gap.
    track.style.transform = motion.matches || printing || !cycle
      ? "" : `translate3d(0, ${-(cycle + position)}px, 0)`;
  };
  const tick = now => {
    frame = null;
    if (!running()) { previousTime = null; return; }
    const dt = previousTime === null ? 0 : Math.min(50, Math.max(0, now - previousTime));
    previousTime = now;
    const wheelStep = wheelRemaining * (1 - Math.exp(-dt / 85));
    wheelRemaining -= wheelStep;
    let movement = wheelStep;
    if (Math.abs(wheelRemaining) < 0.01) {
      movement += wheelRemaining;
      wheelRemaining = 0;
    }
    if (quietRemaining > 0) {
      quietRemaining = Math.max(0, quietRemaining - dt);
      autoSpeed = 0;
    } else {
      autoSpeed += (pixelsPerSecond - autoSpeed) * (1 - Math.exp(-dt / 350));
      movement += autoSpeed * dt / 1000;
    }
    position = wrap(position + movement);
    paint();
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previousTime = null;
    paint();
    if (running()) frame = requestAnimationFrame(tick);
  };
  const measure = () => {
    if (!sequence || printing) return;
    // offsetHeight rounds to whole pixels. Measure fractional CSS pixels so
    // wrapping at a copy boundary is exact, including under the page's zoom.
    const scale = viewport.getBoundingClientRect().height / viewport.offsetHeight || 1;
    const bounds = sequence.getBoundingClientRect();
    const height = bounds.height / scale;
    const gap = viewport.clientHeight * 1.2;
    if (!height || !viewport.clientHeight) return;
    track.style.gap = `${gap}px`;
    // Use the actual copy spacing, including the browser's fractional layout
    // rounding of the gap, rather than accumulating a tiny error each wrap.
    const nextCycle = motion.matches ? height + gap
      : (sequence.nextElementSibling.getBoundingClientRect().top - sequence.getBoundingClientRect().top) / scale;
    if (nextCycle === cycle) return;
    // Keep the fractional progress through the list and trailing gap when
    // wrapping, language, viewport dimensions or font metrics change.
    const ratio = cycle ? nextCycle / cycle : 1;
    position *= ratio;
    wheelRemaining *= ratio;
    cycle = nextCycle;
    sync();
  };
  const localize = () => {
    track.querySelectorAll("[data-i18n]").forEach(element => {
      window.siteI18n?.setText(element, element.dataset.i18n);
    });
  };

  viewport.addEventListener("wheel", event => {
    // Reduced motion retains one ordinary, manually scrollable list.
    if (motion.matches || printing || !cycle || event.ctrlKey) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
    const delta = event.deltaY * unit;
    if (!Number.isFinite(delta) || !delta) return;
    wheelRemaining += delta;
    quietRemaining = 700;
    autoSpeed = 0;
  }, { passive: false });
  document.addEventListener("visibilitychange", sync);
  addEventListener("pageshow", sync);
  addEventListener("resize", measure, { passive: true });
  addEventListener("beforeprint", () => { printing = true; sync(); });
  addEventListener("afterprint", () => { printing = false; measure(); sync(); });
  motion.addEventListener("change", () => {
    wheelRemaining = 0;
    quietRemaining = 0;
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

  try {
    const source = new DOMParser().parseFromString(
      '<ol>' + window.siteTimelineMarkup + '</ol>', 'text/html'
    ).querySelector('ol');
    if (!window.siteTimelineMarkup || !source?.children.length) throw new Error('Timeline is empty');
    sequence = document.importNode(source, true);
    sequence.className = 'timeline-preview-list';
    sequence.querySelectorAll('h3').forEach(heading => {
      const replacement = document.createElement('h4');
      for (const attribute of heading.attributes) replacement.setAttribute(attribute.name, attribute.value);
      replacement.append(...heading.childNodes);
      heading.replaceWith(replacement);
    });
    const clone = () => {
      const duplicate = sequence.cloneNode(true);
      duplicate.setAttribute('aria-hidden', 'true');
      duplicate.inert = true;
      return duplicate;
    };
    track.append(clone(), sequence, clone());
    localize();
    status.hidden = true;
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(sequence);
    resizeObserver.observe(viewport);
    document.addEventListener('site-language-change', () => { localize(); measure(); });
    document.fonts?.ready.then(measure);
    document.fonts?.addEventListener('loadingdone', measure);
  } catch (error) {
    status.hidden = true;
    console.error('Unable to initialize timeline preview:', error);
  }
})();
