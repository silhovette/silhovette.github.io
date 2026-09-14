(() => {
  const gallery = document.querySelector("[data-photo-gallery]");
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
  const caption = dialog.querySelector("[data-photo-caption]");
  const position = dialog.querySelector("[data-photo-position]");
  const original = dialog.querySelector("[data-photo-original]");
  const close = dialog.querySelector("[data-photo-close]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const imagePattern = /\.(jpe?g|png|webp|avif|gif)$/i;
  let photos = [];
  let selected = 0;
  let mode = "grid";
  let playing = !reducedMotion;
  let visible = false;
  let hovered = false;
  let touching = false;
  let timer = null;
  let direction = 1;
  let lastFocus = null;
  let previousOverflow = "";
  let closeAnimation = null;
  let imageRequest = 0;
  let loadRequest = 0;

  function updatePlayback() {
    window.clearInterval(timer);
    timer = null;
    play.setAttribute("aria-pressed", String(playing));
    play.setAttribute("aria-label", playing ? "Pause slideshow" : "Play slideshow");
    play.title = playing ? "Pause slideshow" : "Play slideshow";
    play.querySelector("use").setAttribute("href", `assets/icons/gallery.svg#${playing ? "pause" : "play"}`);
    const maxScroll = strip.scrollWidth - strip.clientWidth;
    if (!playing || !visible || hovered || touching || dialog.open || document.hidden ||
        strip.contains(document.activeElement) || maxScroll < 2) return;
    timer = window.setInterval(() => {
      const max = strip.scrollWidth - strip.clientWidth;
      if (strip.scrollLeft >= max - 2) direction = -1;
      if (strip.scrollLeft <= 2) direction = 1;
      stepStrip(direction);
    }, 3600);
  }

  function updateStripButtons() {
    stripPrev.disabled = strip.scrollLeft <= 2;
    stripNext.disabled = strip.scrollLeft >= strip.scrollWidth - strip.clientWidth - 2;
  }

  function stepStrip(sign) {
    const card = strip.firstElementChild;
    if (!card) return;
    const distance = card.getBoundingClientRect().width + 16;
    strip.scrollTo({ left: strip.scrollLeft + sign * distance, behavior: reducedMotion ? "auto" : "smooth" });
  }

  function createCard(photo, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "photo-card";
    button.setAttribute("aria-label", `Open photo: ${photo.title}`);
    const image = document.createElement("img");
    image.src = photo.url;
    image.alt = photo.title;
    image.width = 600;
    image.height = 450;
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
      image.hidden = true;
      button.classList.add("is-broken");
      button.setAttribute("aria-label", `Unavailable photo: ${photo.title}`);
    });
    const label = document.createElement("span");
    label.textContent = photo.title;
    label.title = photo.title;
    button.append(image, label);
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
    caption.textContent = photo.title;
    caption.title = photo.title;
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
      if (location.protocol === "file:") throw new Error("Local preview required");
      const hosted = location.hostname === "silhovette.github.io";
      const url = hosted
        ? `https://api.github.com/repos/${gallery.dataset.photoRepository}/git/trees/main?recursive=1`
        : new URL("assets/photos/index.json", location.href);
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? "Photo library temporarily unavailable" : "Photo library unavailable");
      const data = await response.json();
      if (data.truncated) throw new Error("Photo library index is incomplete");
      const entries = hosted ? data.tree?.filter(entry => entry.type === "blob" && entry.mode !== "120000") : data.photos;
      if (!Array.isArray(entries)) throw new Error("Photo library unavailable");
      const paths = [...new Set(entries.map(entry => entry.path).filter(path =>
        typeof path === "string" && path.startsWith("assets/photos/") && imagePattern.test(path) &&
        !path.includes("\\") && path.split("/").every(part => part && !part.startsWith("."))
      ))].sort(new Intl.Collator("en", { numeric: true, sensitivity: "base" }).compare);
      if (request !== loadRequest) return;
      photos = paths.map(path => ({
        url: new URL(path.split("/").map(encodeURIComponent).join("/"), location.href).href,
        title: path.split("/").at(-1).replace(imagePattern, "").replace(/[_-]+/g, " "),
      }));
      strip.replaceChildren(...photos.map(createCard));
      library.replaceChildren();
      empty.hidden = photos.length > 0;
      strip.hidden = !photos.length;
      toolbar.hidden = !photos.length;
      status.textContent = "No photos yet";
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

  stripPrev.addEventListener("click", () => { stepStrip(-1); updatePlayback(); });
  stripNext.addEventListener("click", () => { stepStrip(1); updatePlayback(); });
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
  new ResizeObserver(() => { updateStripButtons(); updatePlayback(); }).observe(strip);
  document.addEventListener("visibilitychange", updatePlayback);
  loadPhotos();
})();
