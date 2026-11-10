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

  });
})();
