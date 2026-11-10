(() => {
  const hero = document.querySelector('.misc-hero');
  const header = document.querySelector('.portfolio-header');
  if (!hero) return;
  let frame = null;
  const update = () => {
    frame = null;
    const zoom = Number.parseFloat(getComputedStyle(document.body).zoom) || 1;
    const available = Math.max(0, innerHeight - (header?.getBoundingClientRect().height || 0));
    hero.style.setProperty('--misc-hero-height', `${(available / zoom).toFixed(2)}px`);
  };
  const schedule = () => { if (frame === null) frame = requestAnimationFrame(update); };
  addEventListener('resize', schedule, {passive:true});
  visualViewport?.addEventListener('resize', schedule, {passive:true});
  update();
})();

(() => {
  const viewers = [...document.querySelectorAll('.mc-viewer')];
  const localPreview = location.protocol === 'file:';
  const targetOrigin = localPreview ? '*' : location.origin;
  const acceptsOrigin = origin => localPreview
    ? origin === 'null' || origin === 'file://'
    : origin === location.origin;
  const visible = new Set();
  const notify = frame => frame.contentWindow?.postMessage({
    type: 'mc-viewer-visibility', active: visible.has(frame) && !document.hidden
  }, targetOrigin);
  const preload = new IntersectionObserver(entries => entries.forEach(({target, isIntersecting}) => {
    if (!isIntersecting) return;
    target.src = target.dataset.src;
    preload.unobserve(target);
  }), {rootMargin:'300px'});
  const visibility = new IntersectionObserver(entries => entries.forEach(({target,isIntersecting}) => {
    if (isIntersecting) visible.add(target); else visible.delete(target);
    notify(target);
  }));
  viewers.forEach(frame => {
    preload.observe(frame);
    visibility.observe(frame);
    frame.addEventListener('load', () => notify(frame));
  });
  document.addEventListener('visibilitychange', () => viewers.forEach(notify));
  addEventListener('message', event => {
    if (!acceptsOrigin(event.origin)) return;
    const frame = viewers.find(item => item.contentWindow === event.source);
    if (!frame) return;
    if (event.data?.type === 'mc-viewer-ready') notify(frame);
    if (event.data?.type === 'mc-viewer-painted' && frame.matches('.misc-hero__viewer')) {
      document.dispatchEvent(new Event('misc-hero-ready'));
    }

  });
})();

// Opacity-only entry effects. The first viewport shares the body's single fade;
// units replay only after fully leaving the viewport in either scroll direction.
(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const units = [...document.querySelectorAll([
    '.misc-hero__stage', '.misc-hero h1', '.misc-hero__summary',
    '.misc-section > .section-top', '.mc-feature__copy > *', '.mc-video',
    '.mc-weapon__viewer', '.mc-weapon__copy > *', '.mc-interaction-note',
    '.mc-atlas__viewer', '.mc-atlas__title', '.mc-atlas__copy > *',
    '.misc-work-list .paper-row > *'
  ].join(','))];
  const visible = new Set();
  const animations = new Map();
  let observer;
  const show = element => {
    animations.get(element)?.cancel();
    animations.delete(element);
    element.classList.remove('misc-fade-pending');
  };
  const reset = () => {
    observer?.disconnect();
    units.forEach(show);
    visible.clear();
  };
  const start = () => {
    reset();
    if (motion.matches || !('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(entries => {
      for (const {target, isIntersecting} of entries) {
        if (!isIntersecting) {
          visible.delete(target);
          show(target);
          target.classList.add('misc-fade-pending');
          continue;
        }
        if (visible.has(target)) continue;
        visible.add(target);
        show(target);
        if (document.documentElement.dataset.pageFade !== 'complete') continue;
        const animation = target.animate([{opacity:0}, {opacity:1}], {
          duration:650, easing:'cubic-bezier(0.22, 1, 0.36, 1)'
        });
        animations.set(target, animation);
        const cleanup = () => { if (animations.get(target) === animation) animations.delete(target); };
        animation.finished.then(cleanup, cleanup);
      }
    });
    for (const element of units) {
      const rect = element.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth) {
        visible.add(element);
      } else element.classList.add('misc-fade-pending');
      observer.observe(element);
    }
  };
  document.addEventListener('focusin', event => {
    for (const element of units) if (element.contains(event.target)) {
      visible.add(element);
      show(element);
    }
  });
  motion.addEventListener('change', start);
  addEventListener('beforeprint', reset);
  addEventListener('afterprint', start);
  addEventListener('pageshow', event => { if (event.persisted) start(); });
  start();
})();
