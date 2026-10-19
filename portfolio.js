(() => {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
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

  const progress = document.querySelector(".page-progress");
  const links = [...document.querySelectorAll('.portfolio-nav a[href^="#"]')];
  let scrollFrame = 0;
  const updateScroll = () => {
    scrollFrame = 0;
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
  const reveal = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.remove("await-reveal");
          reveal.unobserve(entry.target);
        }
      }),
    { threshold: 0.07 },
  );
  document.querySelectorAll(".reveal-item").forEach((item) => {
    if (
      !reducedMotion.matches &&
      item.getBoundingClientRect().top > innerHeight
    ) {
      item.classList.add("await-reveal");
      reveal.observe(item);
    }
  });

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
    results.replaceChildren();
    const query = searchInput.value.trim().toLocaleLowerCase();
    if (!query) {
      closeSearch();
      return;
    }
    results.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
    const matches = searchItems
      .filter(
        (item) =>
          !item.closest("[hidden]") &&
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
        item.closest(".reveal-item")?.classList.remove("await-reveal");
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
  const openSearch = () => {
    renderSearch();
    searchInput.focus();
  };
  searchInput?.addEventListener("input", renderSearch);
  searchInput?.addEventListener("focus", renderSearch);
  searchField?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSearch();
      searchInput.focus();
    }
    if (event.key === "ArrowDown" && event.target === searchInput) {
      const first = results.querySelector("a");
      if (!results.hidden && first) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  document.addEventListener("click", (event) => {
    if (searchField && !searchField.contains(event.target)) closeSearch();
  });
  searchField?.addEventListener("focusout", (event) => {
    if (!searchField.contains(event.relatedTarget)) closeSearch();
  });
  document.addEventListener("site-language-change", renderSearch);
  document.addEventListener("keydown", (event) => {
    if (
      searchInput &&
      event.key === "/" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.target.matches('input,textarea,[contenteditable="true"]') &&
      !document.querySelector("dialog[open]")
    ) {
      event.preventDefault();
      openSearch();
    }
  });

})();
