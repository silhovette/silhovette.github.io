(() => {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  // Paint only a viewport of the document-aligned grid; keep the mask near the pointer.
  const grid = document.createElement("div");
  grid.className = "page-grid";
  grid.setAttribute("aria-hidden", "true");
  document.body.prepend(grid);
  const gridPointer = matchMedia("(hover: hover) and (pointer: fine)");
  let gridFrame = null;
  let gridBounds = null;
  let gridPosition = null;
  let gridTarget = null;
  const measureGrid = () => {
    const rect = grid.getBoundingClientRect();
    gridBounds = { left: rect.left, top: rect.top, x: grid.clientWidth / rect.width, y: grid.clientHeight / rect.height };
  };
  const scrollGrid = () => {
    if (!gridBounds) measureGrid();
    grid.style.setProperty("--grid-scroll-y", `${-window.scrollY * gridBounds.y}px`);
  };
  scrollGrid();
  window.addEventListener("scroll", scrollGrid, { passive: true });
  const clearGrid = () => {
    grid.classList.remove("is-active");
    if (gridFrame !== null) cancelAnimationFrame(gridFrame);
    gridFrame = null;
    gridPosition = gridTarget = null;
  };
  const drawGrid = () => {
    gridFrame = null;
    if (!gridTarget) return;
    gridPosition.x += (gridTarget.x - gridPosition.x) * 0.2;
    gridPosition.y += (gridTarget.y - gridPosition.y) * 0.2;
    grid.style.setProperty("--grid-x", `${gridPosition.x}px`);
    grid.style.setProperty("--grid-y", `${gridPosition.y}px`);
    if (Math.hypot(gridTarget.x - gridPosition.x, gridTarget.y - gridPosition.y) > 0.2)
      gridFrame = requestAnimationFrame(drawGrid);
  };
  window.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || reducedMotion.matches || !gridPointer.matches || document.hidden) return;
    if (!gridBounds) measureGrid();
    gridTarget = { x: (event.clientX - gridBounds.left) * gridBounds.x, y: (event.clientY - gridBounds.top) * gridBounds.y };
    if (!gridPosition) gridPosition = { ...gridTarget };
    grid.classList.add("is-active");
    if (gridFrame === null) gridFrame = requestAnimationFrame(drawGrid);
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", clearGrid);
  window.addEventListener("blur", clearGrid);
  window.addEventListener("resize", () => { gridBounds = null; clearGrid(); scrollGrid(); }, { passive: true });
  document.addEventListener("visibilitychange", () => { if (document.hidden) clearGrid(); });
  reducedMotion.addEventListener("change", clearGrid);
  gridPointer.addEventListener("change", clearGrid);
  const menu = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".portfolio-nav");
  const closeMenu = () => {
    nav?.classList.remove("is-open");
    menu?.setAttribute("aria-expanded", "false");
  };
  menu?.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  });
  nav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      menu?.getAttribute("aria-expanded") === "true"
    ) {
      closeMenu();
      menu.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".portfolio-header")) closeMenu();
  });
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
  const clock = document.querySelector("[data-shanghai-time]");
  const updateTime = () => {
    if (clock)
      clock.textContent = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Shanghai",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
  };
  updateTime();
  if (clock) setInterval(updateTime, 60000);

  // Shared search shell; each page keeps its existing result index and navigation.
  const searchShell = document.querySelector(".header-search");
  const searchToggle = searchShell?.querySelector(".search-toggle");
  const searchPanel = searchShell?.querySelector(".header-search-panel");
  const panelInput = searchPanel?.querySelector("input");
  const compactSearch = matchMedia("(max-width: 600px)");
  const closeSearchPanel = (restoreFocus = false) => {
    if (!searchPanel) return;
    if (restoreFocus) (compactSearch.matches ? searchToggle : panelInput).focus({ preventScroll: true });
    searchPanel.classList.remove("is-open");
    searchShell.classList.remove("is-searching");
    searchToggle.setAttribute("aria-expanded", "false");
    panelInput.setAttribute("aria-expanded", "false");
  };
  const openSearchPanel = () => {
    if (!searchPanel) return;
    closeMenu();
    searchPanel.classList.add("is-open");
    searchShell.classList.add("is-searching");
    searchToggle.setAttribute("aria-expanded", "true");
    if (document.activeElement === panelInput) panelInput.dispatchEvent(new Event("input", { bubbles: true }));
    else panelInput.focus({ preventScroll: true });
  };
  searchToggle?.addEventListener("click", () => {
    if (compactSearch.matches && searchPanel.classList.contains("is-open")) closeSearchPanel(true);
    else openSearchPanel();
  });
  panelInput?.addEventListener("focus", () => {
    searchShell.classList.add("is-searching");
    panelInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
  panelInput?.addEventListener("input", () => searchShell.classList.add("is-searching"));
  compactSearch.addEventListener("change", () => closeSearchPanel(searchShell.contains(document.activeElement)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && searchShell?.classList.contains("is-searching")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeSearchPanel(true);
    } else if ((event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey &&
      !event.target.matches('input,textarea,[contenteditable="true"]')) ||
      (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey))) {
      if (!searchPanel || document.querySelector("dialog[open]")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openSearchPanel();
    }
  }, true);
  document.addEventListener("click", (event) => {
    if (!searchShell?.contains(event.target)) closeSearchPanel();
    else if (event.target.closest(".site-search__result, .search-matches a")) closeSearchPanel();
  });
  searchShell?.addEventListener("focusout", (event) => {
    if (!searchShell.contains(event.relatedTarget)) closeSearchPanel();
  });
  searchShell?.addEventListener("keydown", (event) => {
    if (!searchShell.classList.contains("is-searching") || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
    const items = [...searchShell.querySelectorAll(".site-search__result, .search-matches a")];
    if (!items.length) return;
    const index = items.indexOf(document.activeElement);
    const next = event.key === "ArrowDown" ? Math.min(index + 1, items.length - 1) : index - 1;
    event.preventDefault();
    event.stopImmediatePropagation();
    const target = next < 0 ? panelInput : items[next];
    target.focus({ preventScroll: true });
    if (next >= 0) {
      // Reveal the focused result inside its list without scrolling the document.
      const list = searchShell.querySelector(".site-search__results");
      const bounds = list.getBoundingClientRect();
      const itemBounds = target.getBoundingClientRect();
      const scale = bounds.height / list.offsetHeight || 1;
      if (itemBounds.top < bounds.top) list.scrollTop += (itemBounds.top - bounds.top) / scale;
      else if (itemBounds.bottom > bounds.bottom) list.scrollTop += (itemBounds.bottom - bounds.bottom) / scale;
    }
  });

  const progress = document.querySelector(".page-progress");
  const backToTop = document.createElement("button");
  backToTop.type = "button";
  backToTop.className = "back-to-top";
  backToTop.setAttribute("aria-label", "Back to top");
  backToTop.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M6 12l6-6 6 6M12 6v13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.append(backToTop);
  window.siteI18n?.setAttribute(backToTop, "aria-label", "back_to_top");
  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "instant" : "smooth" });
  });
  const links = [...document.querySelectorAll('.portfolio-nav a[href^="#"]')];
  let scrollFrame = 0;
  const updateScroll = () => {
    scrollFrame = 0;
    const showBackToTop = scrollY > 400;
    backToTop.classList.toggle("is-visible", showBackToTop);
    backToTop.inert = !showBackToTop;
    const length = document.documentElement.scrollHeight - innerHeight;
    if (progress)
      progress.style.transform = `scaleX(${length > 0 ? scrollY / length : 0})`;
    let active;
    links.forEach((link) => {
      const section = document.querySelector(link.getAttribute("href"));
      if (section?.getBoundingClientRect().top <= 180) active = link;
    });
    links.forEach((link) => {
      if (link === active) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  };
  addEventListener(
    "scroll",
    () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
    },
    { passive: true },
  );
  updateScroll();
  addEventListener("pageshow", updateScroll);
  const figureDialog = document.getElementById("figure-dialog");
  document.querySelectorAll("[data-figure]").forEach((button) =>
    button.addEventListener("click", () => {
      const img = figureDialog.querySelector("img");
      img.src = button.dataset.figure;
      img.alt = button.dataset.figureTitle;
      figureDialog.querySelector("h2").textContent = button.dataset.figureTitle;
      figureDialog.showModal();
    }),
  );
  figureDialog
    ?.querySelector(".dialog-close")
    .addEventListener("click", () => figureDialog.close());
  figureDialog?.addEventListener("click", (event) => {
    if (event.target === figureDialog) {
      const r = figureDialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        figureDialog.close();
    }
  });
  const playgroundEntries = document.querySelectorAll("[data-playground-paused]");
  if (playgroundEntries.length) {
    const notice = document.createElement("div");
    notice.className = "construction-notice";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    notice.setAttribute("aria-atomic", "true");
    document.body.append(notice);
    let noticeTimer;
    const showConstructionNotice = (event) => {
      if (event.type === "auxclick" && event.button !== 1) return;
      event.preventDefault();
      notice.textContent = "Currently under construction.";
      notice.classList.add("is-visible");
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => notice.classList.remove("is-visible"), reducedMotion.matches ? 3000 : 3280);
    };
    playgroundEntries.forEach((entry) => {
      entry.addEventListener("click", showConstructionNotice);
      entry.addEventListener("auxclick", showConstructionNotice);
    });
  }

  const toast = document.querySelector(".toast");
  let toastTimer;
  document
    .querySelector("[data-copy-email]")
    ?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText("silhovette@sjtu.edu.cn");
        toast.textContent =
          window.siteI18n?.t("portfolio_copied") || "Email copied";
      } catch {
        toast.textContent = "silhovette@sjtu.edu.cn";
      }
      toast.classList.add("visible");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
    });

  const searchInput = document.getElementById("portfolio-search");
  const results = document.getElementById("portfolio-search-results");
  const searchField = searchInput?.closest(".header-search");
  const closeSearch = () => {
    if (!results) return;
    results.hidden = true;
    searchInput.setAttribute("aria-expanded", "false");
  };
  const searchItems = [
    ...document.querySelectorAll(
      "main section[id] h2, main section[id] h3, main section[id] p",
    ),
  ];
  const renderSearch = () => {
    if (!results) return;
    const query = searchInput.value.trim().toLocaleLowerCase();
    if (!query) {
      closeSearch();
      return;
    }
    results.replaceChildren();
    results.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
    const matches = searchItems
      .filter(
        (item) =>
          !item.closest("[hidden], [inert], [aria-hidden=\"true\"], [data-timeline-preview]") &&
          (query
            ? item.textContent.toLocaleLowerCase().includes(query)
            : item.tagName === "H2"),
      )
      .slice(0, 10);
    matches.forEach((item) => {
      const link = document.createElement("a");
      link.href = "#" + item.closest("section[id]").id;
      link.textContent = item.textContent.trim().slice(0, 140);
      link.addEventListener("click", (event) => {
        event.preventDefault();
        closeSearch();
        searchInput.value = "";
        searchInput.blur();
        history.pushState(null, "", link.getAttribute("href"));
        window.siteReveal?.show(item);
        item.scrollIntoView({
          behavior: reducedMotion.matches ? "instant" : "smooth",
          block: "center",
        });
      });
      results.append(link);
    });
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.textContent =
        window.siteI18n?.t("no_matching_section") || "No matching section";
      results.append(empty);
    }
  };
  searchInput?.addEventListener("input", renderSearch);
  searchInput?.addEventListener("focus", renderSearch);
  document.addEventListener("click", (event) => {
    if (searchField && !searchField.contains(event.target)) closeSearch();
  });
  searchField?.addEventListener("focusout", (event) => {
    if (!searchField.contains(event.relatedTarget)) closeSearch();
  });
  document.addEventListener("site-language-change", renderSearch);

  const relayCarousel = document.querySelector("[data-relay-carousel]");
  if (relayCarousel) {
    const relayImages = [...relayCarousel.querySelectorAll("img")];
    let relayIndex = 0;
    let relayTimer;
    const showNextRelayImage = () => {
      relayImages[relayIndex].style.opacity = "0";
      relayIndex = (relayIndex + 1) % relayImages.length;
      relayImages[relayIndex].style.opacity = "1";
    };
    const startRelayCarousel = () => {
      if (document.hidden || relayImages.length < 2) return;
      clearInterval(relayTimer);
      relayTimer = setInterval(showNextRelayImage, 3500);
    };
    const stopRelayCarousel = () => clearInterval(relayTimer);
    startRelayCarousel();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopRelayCarousel();
      else startRelayCarousel();
    });
  }


})();
