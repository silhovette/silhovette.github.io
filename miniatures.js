(() => {
  const gallery = document.querySelector('.miniature-gallery');
  const dialog = document.getElementById('miniature-dialog');
  if (!gallery || !dialog) return;

  const cards = [...gallery.querySelectorAll('.miniature-card')];
  const stage = dialog.querySelector('.miniature-stage');
  const image = stage.querySelector('img');
  const status = stage.querySelector('[role="status"]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let selected = 0;
  let request = 0;
  let opener;
  let previousOverflow;

  // Reveal the pixels only once they are decoded, including cached images.
  cards.forEach(card => {
    const thumbnail = card.querySelector('img');
    let revealing = false;
    const reveal = async () => {
      if (revealing || !thumbnail.naturalWidth) return;
      revealing = true;
      try { await thumbnail.decode(); } catch { /* Loaded images can still be displayed. */ }
      requestAnimationFrame(() => requestAnimationFrame(() => {
        thumbnail.classList.add('is-loaded');
      }));
    };
    thumbnail.addEventListener('load', reveal, { once: true });
    if (thumbnail.complete && thumbnail.naturalWidth) reveal();
  });

  const more = document.querySelector('[data-miniature-more]');
  let visibleCount = cards.filter(card => !card.hidden).length;
  more.addEventListener('click', () => {
    const batch = cards.slice(visibleCount, visibleCount + 6);
    batch.forEach(card => {
      const thumbnail = card.querySelector('img');
      thumbnail.srcset = thumbnail.dataset.srcset;
      thumbnail.src = thumbnail.dataset.src;
      delete thumbnail.dataset.src;
      delete thumbnail.dataset.srcset;
      card.hidden = false;
    });
    visibleCount += batch.length;
    if (visibleCount === cards.length) {
      batch[0]?.focus({ preventScroll: true });
      more.parentElement.hidden = true;
    }
    // Reserve the new rows once. Each decoded image fades in independently,
    // without relaying out the entire growing grid on every animation frame.
  });

  const show = index => {
    selected = (index + cards.length) % cards.length;
    const currentRequest = ++request;
    image.getAnimations().forEach(animation => animation.cancel());
    image.hidden = true;
    status.hidden = false;
    window.siteI18n.setText(status, 'loading_photos');
    const next = new Image();
    next.onload = async () => {
      if (currentRequest !== request || !dialog.open) return;
      image.src = next.src;
      try { await image.decode(); } catch { /* The load event already confirmed a usable image. */ }
      if (currentRequest !== request || !dialog.open) return;
      image.alt = cards[selected].querySelector('img').alt;
      image.hidden = false;
      status.hidden = true;
      if (!reducedMotion.matches) image.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
    };
    next.onerror = () => {
      if (currentRequest === request && dialog.open) window.siteI18n.setText(status, 'image_unavailable');
    };
    next.src = cards[selected].href;
  };

  gallery.addEventListener('click', event => {
    const card = event.target.closest('.miniature-card');
    if (!card || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = card;
    previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    show(cards.indexOf(card));
  });
  dialog.querySelector('[data-miniature-close]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-miniature-prev]').addEventListener('click', () => show(selected - 1));
  dialog.querySelector('[data-miniature-next]').addEventListener('click', () => show(selected + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(selected + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('close', () => {
    request++;
    document.body.style.overflow = previousOverflow;
    opener?.focus({ preventScroll: true });
  });
  const isBackdrop = event => {
    const rect = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
  };
  let backdropPressed = false;
  dialog.addEventListener('pointerdown', event => { backdropPressed = isBackdrop(event); });
  dialog.addEventListener('click', event => {
    if (backdropPressed && isBackdrop(event)) dialog.close();
    backdropPressed = false;
  });
  let touchStart;
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') touchStart = { x: event.clientX, y: event.clientY };
  });
  stage.addEventListener('pointerup', event => {
    if (!touchStart) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) show(selected + (dx < 0 ? 1 : -1));
    touchStart = null;
  });
  stage.addEventListener('pointercancel', () => { touchStart = null; });
})();
