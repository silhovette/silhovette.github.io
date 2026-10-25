(() => {
  const STORAGE_KEY = "silhovette-theme";
  const THEMES = new Set(["original", "inverse", "legacy"]);
  const root = document.documentElement;
  const path = window.location.pathname.replace(/\\/g, "/");
  const isLegacyPage = /\/legacy(?:\/|$)/i.test(path);

  const readStoredTheme = () => {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      return THEMES.has(value) ? value : "original";
    } catch {
      return "original";
    }
  };

  const storeTheme = (theme) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Private browsing modes can deny storage; the current page still works.
    }
  };

  const storedTheme = readStoredTheme();
  if (!isLegacyPage && storedTheme === "legacy") {
    window.location.replace(new URL("legacy/index.html", window.location.href).href);
    return;
  }
  const initialTheme = isLegacyPage ? "legacy" : storedTheme;
  root.dataset.theme = initialTheme;

  const setThemeColorMeta = () => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const color = getComputedStyle(root).getPropertyValue("--paper").trim();
    if (color) meta.setAttribute("content", color);
  };

  const updateControls = (theme) => {
    document.querySelectorAll("[data-theme-switcher]").forEach((switcher) => {
      const trigger = switcher.querySelector(".theme-trigger");
      const menu = switcher.querySelector(".theme-menu");
      trigger?.setAttribute("aria-label", `Choose theme (current: ${theme})`);
      switcher.querySelectorAll("[data-theme-choice]").forEach((choice) => {
        const selected = choice.dataset.themeChoice === theme;
        choice.setAttribute("aria-checked", String(selected));
      });
      if (menu) menu.setAttribute("aria-hidden", String(!switcher.classList.contains("is-open")));
    });
    setThemeColorMeta();
  };

  const closeMenus = () => {
    document.querySelectorAll("[data-theme-switcher].is-open").forEach((switcher) => {
      switcher.classList.remove("is-open");
      switcher.querySelector(".theme-trigger")?.setAttribute("aria-expanded", "false");
      const menu = switcher.querySelector(".theme-menu");
      if (menu) menu.setAttribute("aria-hidden", "true");
    });
  };

  const navigateToLegacy = () => {
    window.location.href = new URL("legacy/index.html", window.location.href).href;
  };

  const navigateToModern = () => {
    window.location.href = new URL("../index.html", window.location.href).href;
  };

  const applyTheme = (theme) => {
    if (!THEMES.has(theme)) return;
    storeTheme(theme);
    if (theme === "legacy" && !isLegacyPage) {
      navigateToLegacy();
      return;
    }
    if (theme !== "legacy" && isLegacyPage) {
      navigateToModern();
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reducedMotion) {
      root.classList.add("theme-transition");
      window.setTimeout(() => root.classList.remove("theme-transition"), 340);
    }
    root.dataset.theme = theme;
    updateControls(theme);
    document.dispatchEvent(new CustomEvent("site-theme-change", { detail: { theme } }));
  };

  const setupControls = () => {
    updateControls(root.dataset.theme || initialTheme);
    document.querySelectorAll("[data-theme-switcher]").forEach((switcher) => {
      const trigger = switcher.querySelector(".theme-trigger");
      const menu = switcher.querySelector(".theme-menu");
      if (!trigger || !menu) return;
      menu.setAttribute("aria-hidden", "true");
      trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        const open = !switcher.classList.contains("is-open");
        closeMenus();
        switcher.classList.toggle("is-open", open);
        trigger.setAttribute("aria-expanded", String(open));
        menu.setAttribute("aria-hidden", String(!open));
      });
      switcher.querySelectorAll("[data-theme-choice]").forEach((choice) => {
        choice.addEventListener("click", () => {
          applyTheme(choice.dataset.themeChoice);
          closeMenus();
        });
      });
      trigger.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          trigger.click();
          switcher.querySelector('[aria-checked="true"]')?.focus();
        }
      });
      menu.addEventListener("keydown", (event) => {
        const choices = [...menu.querySelectorAll("[data-theme-choice]")];
        const index = choices.indexOf(document.activeElement);
        if (event.key === "Escape") {
          event.preventDefault();
          closeMenus();
          trigger.focus();
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const delta = event.key === "ArrowDown" ? 1 : -1;
          choices[(index + delta + choices.length) % choices.length]?.focus();
        }
      });
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-theme-switcher]")) closeMenus();
    });
  };

  window.siteTheme = {
    rgba(variable, alpha) {
      const value = getComputedStyle(root).getPropertyValue(variable).trim();
      return value ? `rgba(${value}, ${alpha})` : `rgba(185, 71, 44, ${alpha})`;
    },
    get() {
      return root.dataset.theme || initialTheme;
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupControls, { once: true });
  } else {
    setupControls();
  }
})();
