(() => {
  const gallery = document.querySelector("[data-photo-gallery]");
  const repository = gallery?.dataset.photoRepository || "silhovette/silhovette.github.io";
  const imagePattern = /\.(jpe?g|png|webp|avif|gif)$/i;

  const preloadPhotoFiles = async (urls) => {
    await Promise.all(urls.map(async (url) => {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      try { await image.decode(); } catch { /* broken files are reported in the gallery */ }
    }));
  };

  const photoBootstrap = {
    ready: null,
    urls: null,
  };

  async function discoverPhotoUrls() {
    if (photoBootstrap.ready) return photoBootstrap.ready;
    photoBootstrap.ready = (async () => {
      if (location.protocol === "file:") throw new Error("Local preview required");
      const hosted = location.hostname === "silhovette.github.io";
      const url = hosted
        ? `https://api.github.com/repos/${repository}/git/trees/main?recursive=1`
        : new URL("assets/photos/index.json", location.href);
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? "Photo library temporarily unavailable" : "Photo library unavailable");
      const data = await response.json();
      if (data.truncated) throw new Error("Photo library index is incomplete");
      const entries = hosted ? data.tree?.filter(entry => entry.type === "blob" && entry.mode !== "120000") : data.photos;
      if (!Array.isArray(entries)) throw new Error("Photo library unavailable");
      const paths = [...new Set(entries.map(entry => entry.path).filter(path =>
        typeof path === "string" && path.startsWith("assets/photos/") && imagePattern.test(path) &&
        !path.includes("\\") && !path.includes("/thumbs/") && path.split("/").every(part => part && !part.startsWith("."))
      ))].sort(new Intl.Collator("en", { numeric: true, sensitivity: "base" }).compare);
      return paths.map(path => new URL(path.split("/").map(encodeURIComponent).join("/"), location.href).href);
    })();
    return photoBootstrap.ready;
  }

  const warmPhotoCache = () => discoverPhotoUrls().then(urls => preloadPhotoFiles(urls.map(url => {
    const file = decodeURIComponent(url.split("/").at(-1));
    return new URL(`assets/photos/thumbs/${encodeURIComponent(file.replace(/\.[^.]+$/i, ".webp"))}`, location.href).href;
  }))).catch(() => {});
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", warmPhotoCache, { once: true });
  else warmPhotoCache();

  if (!gallery) return;
  const dialog = document.getElementById("photo-dialog");
  const strip = gallery.querySelector("[data-photo-strip]");
  const toolbar = gallery.querySelector("[data-photo-toolbar]");
  const empty = gallery.querySelector("[data-photo-empty]");
  const status = gallery.querySelector("[data-photo-status]");
  const retry = gallery.querySelector("[data-photo-retry]");
  const play = gallery.querySelector("[data-photo-autoplay]");
  const stripPrev = gallery.querySelector("[data-strip-prev]");
  const stripNext = gallery.querySelector("[data-strip-next]");
  const library = dialog.querySelector("[data-photo-library]");
  const viewer = dialog.querySelector("[data-photo-viewer]");
  const fullImage = dialog.querySelector("[data-photo-full]");
  const viewerStatus = dialog.querySelector("[data-photo-viewer-status]");
  const position = dialog.querySelector("[data-photo-position]");
  const original = dialog.querySelector("[data-photo-original]");
  const close = dialog.querySelector("[data-photo-close]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let photos = [];
  let selected = 0;
  let mode = "grid";
  let playing = !reducedMotion;
  let visible = false;
  let hovered = false;
  let touching = false;
  let animationFrame = null;
  let lastFrame = null;
  let continuousSpeed = 180;
  let scrollPosition = 0;
  let loopWidth = 0;
  let lastFocus = null;
  let previousOverflow = "";
  let closeAnimation = null;
  let imageRequest = 0;
  let loadRequest = 0;

  function updatePlayback() {
    if (!playing || !visible || touching || dialog.open || document.hidden ||
        strip.contains(document.activeElement) || !loopWidth) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
      lastFrame = null;
      return;
    }
    if (animationFrame !== null) return;
    scrollPosition = strip.scrollLeft;
    const tick = (timestamp) => {
      if (lastFrame === null) lastFrame = timestamp;
      const delta = Math.min(50, timestamp - lastFrame);
      lastFrame = timestamp;
      const targetSpeed = hovered ? 90 : 180;
      // Integrate an exponential easing curve so speed is independent of frame rate.
      const easing = Math.exp(-delta / 220);
      const distance = targetSpeed * delta / 1000 +
        (continuousSpeed - targetSpeed) * 0.22 * (1 - easing);
      continuousSpeed = targetSpeed + (continuousSpeed - targetSpeed) * easing;
      advanceStrip(distance);
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
  }

  function measureLoop() {
    const first = strip.firstElementChild;
    const repeated = strip.children[photos.length];
    loopWidth = first && repeated
      ? repeated.getBoundingClientRect().left - first.getBoundingClientRect().left
      : 0;
    scrollPosition = loopWidth ? strip.scrollLeft % loopWidth : 0;
    strip.scrollLeft = scrollPosition;
  }

  function advanceStrip(distance) {
    if (!loopWidth) return;
    scrollPosition = (scrollPosition + distance) % loopWidth;
    strip.scrollLeft = scrollPosition;
  }

  function updateStripButtons() {
    stripPrev.hidden = true;
    stripNext.hidden = true;
  }

  function stepStrip() {
    const card = strip.firstElementChild;
    if (!card) return;
    const distance = card.getBoundingClientRect().width + 16;
    advanceStrip(distance);
  }

  function shuffled(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function createCard(photo, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "photo-card";
    button.setAttribute("aria-label", `Open photo: ${photo.title}`);
    const image = document.createElement("img");
    image.src = photo.thumbUrl || photo.url;
    image.alt = photo.title;
    image.width = 600;
    image.height = 450;
    image.loading = "eager";
    image.decoding = "async";
    image.addEventListener("error", () => {
      image.hidden = true;
      button.classList.add("is-broken");
      button.setAttribute("aria-label", `Unavailable photo: ${photo.title}`);
    });
    button.append(image);
    button.addEventListener("click", () => openDialog(index));
    return button;
  }

  function prepareDialog() {
    if (closeAnimation) {
      closeAnimation.cancel();
      closeAnimation = null;
    }
    if (dialog.open) return;
    lastFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    if (!reducedMotion) dialog.animate(
      [{ opacity: 0, transform: "translateY(10px) scale(0.99)" }, { opacity: 1, transform: "none" }],
      { duration: 240, easing: "ease-out" }
    );
    close.focus();
    updatePlayback();
  }

  function showGrid() {
    mode = "grid";
    imageRequest += 1;
    viewer.hidden = true;
    library.hidden = false;
    original.hidden = true;
    position.textContent = `${photos.length} photos`;
    dialog.querySelector("[data-photo-grid]").setAttribute("aria-pressed", "true");
    if (!library.childElementCount) library.replaceChildren(...photos.map(createCard));
    if (!reducedMotion) library.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
  }

  async function showPhoto(index) {
    selected = (index + photos.length) % photos.length;
    const photo = photos[selected];
    const request = ++imageRequest;
    mode = "single";
    library.hidden = true;
    viewer.hidden = false;
    if (library.contains(document.activeElement)) close.focus();
    original.hidden = false;
    original.href = photo.url;
    dialog.querySelector("[data-photo-grid]").setAttribute("aria-pressed", "false");
    position.textContent = `${selected + 1} / ${photos.length}`;
    fullImage.hidden = true;
    viewerStatus.hidden = false;
    viewerStatus.textContent = "Loading photo...";
    dialog.querySelectorAll("[data-photo-prev], [data-photo-next]").forEach(button => {
      button.disabled = photos.length < 2;
    });
    const image = new Image();
    image.src = photo.url;
    try {
      await image.decode();
      if (request !== imageRequest || !dialog.open) return;
      fullImage.src = photo.url;
      fullImage.alt = photo.title;
      fullImage.hidden = false;
      viewerStatus.hidden = true;
      if (!reducedMotion) fullImage.animate(
        [{ opacity: 0, transform: "scale(0.985)" }, { opacity: 1, transform: "scale(1)" }],
        { duration: 260, easing: "ease-out" }
      );
    } catch {
      if (request === imageRequest) viewerStatus.textContent = "Photo unavailable";
    }
  }

  function openDialog(index = null) {
    if (!photos.length) return;
    prepareDialog();
    if (index === null) showGrid();
    else showPhoto(index);
  }

  function closeDialog() {
    if (!dialog.open || closeAnimation) return;
    if (reducedMotion) { dialog.close(); return; }
    closeAnimation = dialog.animate(
      [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(8px) scale(0.99)" }],
      { duration: 180, easing: "ease-in" }
    );
    closeAnimation.onfinish = () => { closeAnimation = null; dialog.close(); };
  }

  async function loadPhotos() {
    const request = ++loadRequest;
    status.textContent = "Loading photos...";
    retry.hidden = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const paths = await discoverPhotoUrls();
      if (request !== loadRequest) return;
      photos = shuffled(paths).map(url => ({
        url,
        thumbUrl: new URL(`assets/photos/thumbs/${encodeURIComponent(decodeURIComponent(url.split("/").at(-1)).replace(/\.[^.]+$/i, ".webp"))}`, location.href).href,
        title: decodeURIComponent(url.split("/").at(-1)).replace(imagePattern, "").replace(/[_-]+/g, " "),
      }));
      status.textContent = `Preparing ${photos.length} photos...`;
      const loaded = await Promise.all(photos.map(async (photo) => {
        const image = new Image();
        image.decoding = "async";
        image.src = photo.thumbUrl;
        await image.decode();
        return image;
      }));
      if (request !== loadRequest) return;
      strip.replaceChildren(...photos.map(createCard));
      strip.querySelectorAll("img").forEach((image, index) => {
        image.src = photos[index].thumbUrl || loaded[index].src;
        image.loading = "eager";
      });
      // Repeat enough cards to cover the widest (three-card) viewport at the seam.
      // The duplicates stay clickable but do not repeat keyboard/screen-reader entries.
      if (photos.length > 1) {
        for (let i = 0; i < 4; i += 1) {
          const index = i % photos.length;
          const card = createCard(photos[index], index);
          card.tabIndex = -1;
          card.setAttribute("aria-hidden", "true");
          strip.append(card);
        }
      }
      library.replaceChildren();
      empty.hidden = photos.length > 0;
      strip.hidden = !photos.length;
      toolbar.hidden = !photos.length;
      measureLoop();
      status.textContent = `${photos.length} photos ready`;
      gallery.querySelector("[data-photo-count]").textContent = `${photos.length} ${photos.length === 1 ? "photo" : "photos"}`;
      updateStripButtons();
      updatePlayback();
    } catch (error) {
      if (request !== loadRequest) return;
      status.textContent = error.name === "AbortError" ? "Photo library timed out" : error.message;
      retry.hidden = false;
      empty.hidden = false;
      strip.hidden = true;
      toolbar.hidden = true;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  stripPrev.addEventListener("click", () => { stepStrip(); updatePlayback(); });
  stripNext.addEventListener("click", () => { stepStrip(); updatePlayback(); });
  strip.addEventListener("wheel", event => {
    event.preventDefault();
    const sign = event.deltaY || event.deltaX;
    if (Math.abs(sign) < 1) return;
    advanceStrip(Math.max(1, Math.round(strip.clientWidth * 0.7)));
  }, { passive: false });
  strip.addEventListener("scroll", updateStripButtons, { passive: true });
  strip.addEventListener("pointerenter", event => { if (event.pointerType !== "touch") { hovered = true; updatePlayback(); } });
  strip.addEventListener("pointerleave", () => { hovered = false; updatePlayback(); });
  strip.addEventListener("pointerdown", event => { if (event.pointerType === "touch") { touching = true; updatePlayback(); } });
  const endTouch = () => { if (touching) { touching = false; updatePlayback(); } };
  window.addEventListener("pointerup", endTouch);
  window.addEventListener("pointercancel", endTouch);
  strip.addEventListener("focusin", updatePlayback);
  strip.addEventListener("focusout", () => window.setTimeout(updatePlayback, 0));
  play.addEventListener("click", () => { playing = !playing; updatePlayback(); });
  retry.addEventListener("click", loadPhotos);
  gallery.querySelector("[data-photo-all]").addEventListener("click", () => openDialog());
  dialog.querySelector("[data-photo-grid]").addEventListener("click", showGrid);
  dialog.querySelector("[data-photo-prev]").addEventListener("click", () => showPhoto(selected - 1));
  dialog.querySelector("[data-photo-next]").addEventListener("click", () => showPhoto(selected + 1));
  close.addEventListener("click", closeDialog);
  dialog.addEventListener("cancel", event => { event.preventDefault(); closeDialog(); });
  dialog.addEventListener("close", () => {
    imageRequest += 1;
    document.body.style.overflow = previousOverflow;
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
    updatePlayback();
  });
  let backdropPressed = false;
  const onBackdrop = event => {
    const rect = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
  };
  dialog.addEventListener("pointerdown", event => { backdropPressed = onBackdrop(event); });
  dialog.addEventListener("click", event => { if (backdropPressed && onBackdrop(event)) closeDialog(); backdropPressed = false; });
  dialog.addEventListener("keydown", event => {
    if (mode === "single" && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      showPhoto(selected + (event.key === "ArrowRight" ? 1 : -1));
    }
    if (event.key !== "Tab") return;
    const controls = [...dialog.querySelectorAll("button, a[href]")].filter(element => !element.disabled && element.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; updatePlayback(); }, { threshold: 0.2 }).observe(strip);
  new ResizeObserver(() => { measureLoop(); updateStripButtons(); updatePlayback(); }).observe(strip);
  document.addEventListener("visibilitychange", updatePlayback);
  loadPhotos();
})();
