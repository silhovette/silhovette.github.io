const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const navLinks = Array.from(document.querySelectorAll(".nav-links a"));
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

document.getElementById("year").textContent = new Date().getFullYear();

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));

    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    history.pushState(null, "", link.getAttribute("href"));
  });
});

const setActiveLink = (id) => {
  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
  });
};

if ("IntersectionObserver" in window) {
  const activeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveLink(entry.target.id);
        }
      });
    },
    {
      rootMargin: "-36% 0px -52% 0px",
      threshold: 0,
    }
  );

  sections.forEach((section) => activeObserver.observe(section));
} else if (sections.length > 0) {
  setActiveLink(sections[0].id);
}

if (!reduceMotion && "IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
} else {
  document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
}

const setupHoverTooltip = () => {
  const tooltip = document.getElementById("hover-tooltip");
  const triggers = Array.from(document.querySelectorAll("[data-tooltip]"));

  if (!tooltip || triggers.length === 0) {
    return;
  }

  let activeTrigger = null;
  let pointer = { x: 0, y: 0 };
  let frame = null;
  let idleTimer = null;
  const idleDelay = 150;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const placeTooltip = () => {
    frame = null;

    if (!activeTrigger) {
      return;
    }

    const offset = 18;
    const rect = tooltip.getBoundingClientRect();
    const x = clamp(pointer.x + offset, 16, window.innerWidth - rect.width - 16);
    const y = clamp(pointer.y + offset, 16, window.innerHeight - rect.height - 16);

    tooltip.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const requestPlacement = () => {
    if (frame === null) {
      frame = window.requestAnimationFrame(placeTooltip);
    }
  };

  const showTooltip = (trigger) => {
    activeTrigger = trigger;
    tooltip.textContent = trigger.dataset.tooltip;
    tooltip.setAttribute("aria-hidden", "false");
    tooltip.classList.add("is-visible");
    requestPlacement();
  };

  const clearIdleTimer = () => {
    if (idleTimer !== null) {
      window.clearTimeout(idleTimer);
      idleTimer = null;
    }
  };

  const scheduleTooltip = (trigger, x, y) => {
    activeTrigger = trigger;
    pointer = { x, y };
    tooltip.textContent = trigger.dataset.tooltip;
    tooltip.classList.remove("is-visible");
    tooltip.setAttribute("aria-hidden", "true");
    requestPlacement();
    clearIdleTimer();

    idleTimer = window.setTimeout(() => {
      if (activeTrigger === trigger) {
        showTooltip(trigger);
      }
    }, idleDelay);
  };

  const hideTooltip = () => {
    clearIdleTimer();
    activeTrigger = null;
    tooltip.classList.remove("is-visible");
    tooltip.setAttribute("aria-hidden", "true");
  };

  const moveTooltip = (event) => {
    if (!activeTrigger) {
      return;
    }

    scheduleTooltip(activeTrigger, event.clientX, event.clientY);
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("pointerenter", (event) => scheduleTooltip(trigger, event.clientX, event.clientY));
    trigger.addEventListener("pointermove", moveTooltip, { passive: true });
    trigger.addEventListener("pointerleave", hideTooltip);
    trigger.addEventListener("focus", () => {
      const rect = trigger.getBoundingClientRect();
      pointer = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      showTooltip(trigger);
    });
    trigger.addEventListener("blur", hideTooltip);
  });

  window.addEventListener("scroll", hideTooltip, { passive: true });
  window.addEventListener("resize", hideTooltip);
};

const setupCursorField = () => {
  const canvas = document.getElementById("cursor-field");
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  if (!canvas || reduceMotion || !finePointer) {
    return;
  }

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let animationFrame = null;
  let lastPoint = null;
  let particles = [];
  let trail = [];

  const resizeCanvas = () => {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const addParticle = (x, y) => {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28 - 0.05,
      size: 1.2 + Math.random() * 1.6,
      life: 1,
    });

    if (particles.length > 90) {
      particles = particles.slice(-90);
    }
  };

  const addTrailPoint = (x, y) => {
    trail.push({ x, y, life: 1 });

    if (trail.length > 42) {
      trail.shift();
    }
  };

  const drawFrame = () => {
    context.clearRect(0, 0, width, height);

    trail.forEach((point) => {
      point.life -= 0.018;
    });

    for (let index = 1; index < trail.length; index += 1) {
      const previous = trail[index - 1];
      const current = trail[index];
      const opacity = Math.max(0, Math.min(previous.life, current.life)) * 0.1;

      if (opacity <= 0) {
        continue;
      }

      context.beginPath();
      context.moveTo(previous.x, previous.y);
      context.lineTo(current.x, current.y);
      context.strokeStyle = `rgba(118, 185, 0, ${opacity})`;
      context.lineWidth = 1;
      context.stroke();
    }

    particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= 0.015;

      const opacity = Math.max(0, particle.life) * 0.18;

      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fillStyle = `rgba(118, 185, 0, ${opacity})`;
      context.fill();
    });

    trail = trail.filter((point) => point.life > 0);
    particles = particles.filter((particle) => particle.life > 0);

    if (trail.length > 0 || particles.length > 0) {
      animationFrame = window.requestAnimationFrame(drawFrame);
    } else {
      animationFrame = null;
    }
  };

  const requestDraw = () => {
    if (animationFrame === null) {
      animationFrame = window.requestAnimationFrame(drawFrame);
    }
  };

  const handlePointerMove = (event) => {
    const x = event.clientX;
    const y = event.clientY;

    if (!lastPoint) {
      lastPoint = { x, y };
    }

    const distance = Math.hypot(x - lastPoint.x, y - lastPoint.y);

    if (distance < 5) {
      return;
    }

    addTrailPoint(x, y);
    addParticle(x, y);

    if (distance > 18) {
      addParticle((x + lastPoint.x) / 2, (y + lastPoint.y) / 2);
    }

    lastPoint = { x, y };
    requestDraw();
  };

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
};

setupHoverTooltip();
setupCursorField();
