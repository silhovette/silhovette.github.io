const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const navLinks = Array.from(document.querySelectorAll(".nav-links a"));
const getLocalTarget = (href) => (href && href.startsWith("#") ? document.querySelector(href) : null);
const sections = navLinks
  .map((link) => getLocalTarget(link.getAttribute("href")))
  .filter(Boolean);
const activeLockDuration = 700;
let activeLockUntil = 0;

document.getElementById("year").textContent = new Date().getFullYear();

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const hash = link.getAttribute("href");
    const target = getLocalTarget(hash);

    if (!target) {
      return;
    }

    event.preventDefault();
    activeLockUntil = reduceMotion ? 0 : performance.now() + activeLockDuration;

    if (hash === "#about") {
      setActiveLink("about");
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    } else {
      setActiveLink(target.id);
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }

    history.pushState(null, "", hash);
    window.setTimeout(updateActiveLink, activeLockDuration + 80);
  });
});

const setActiveLink = (id) => {
  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
  });
};

const updateActiveLink = () => {
  if (sections.length === 0) {
    return;
  }

  if (performance.now() < activeLockUntil) {
    return;
  }

  const headerOffset = 104;
  const currentPosition = window.scrollY + headerOffset;
  let activeSection = sections[0];

  sections.forEach((section) => {
    if (section.offsetTop <= currentPosition) {
      activeSection = section;
    }
  });

  setActiveLink(activeSection.id);
};

if (sections.length > 0) {
  setActiveLink(sections[0].id);
  updateActiveLink();
}

window.addEventListener("scroll", updateActiveLink, { passive: true });
window.addEventListener("resize", updateActiveLink);

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

const setupHeroPolyhedron = () => {
  const canvas = document.getElementById("hero-polyhedron");

  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const normalize = ([x, y, z]) => {
    const length = Math.hypot(x, y, z);
    return [x / length, y / length, z / length];
  };

  const createIcosphere = (subdivisions) => {
    const t = (1 + Math.sqrt(5)) / 2;
    let vertices = [
      [-1, t, 0],
      [1, t, 0],
      [-1, -t, 0],
      [1, -t, 0],
      [0, -1, t],
      [0, 1, t],
      [0, -1, -t],
      [0, 1, -t],
      [t, 0, -1],
      [t, 0, 1],
      [-t, 0, -1],
      [-t, 0, 1],
    ].map(normalize);

    let faces = [
      [0, 11, 5],
      [0, 5, 1],
      [0, 1, 7],
      [0, 7, 10],
      [0, 10, 11],
      [1, 5, 9],
      [5, 11, 4],
      [11, 10, 2],
      [10, 7, 6],
      [7, 1, 8],
      [3, 9, 4],
      [3, 4, 2],
      [3, 2, 6],
      [3, 6, 8],
      [3, 8, 9],
      [4, 9, 5],
      [2, 4, 11],
      [6, 2, 10],
      [8, 6, 7],
      [9, 8, 1],
    ];

    const getMidpoint = (cache, first, second) => {
      const key = first < second ? `${first}:${second}` : `${second}:${first}`;

      if (cache.has(key)) {
        return cache.get(key);
      }

      const midpoint = normalize([
        (vertices[first][0] + vertices[second][0]) / 2,
        (vertices[first][1] + vertices[second][1]) / 2,
        (vertices[first][2] + vertices[second][2]) / 2,
      ]);
      const index = vertices.push(midpoint) - 1;
      cache.set(key, index);
      return index;
    };

    for (let step = 0; step < subdivisions; step += 1) {
      const cache = new Map();
      const nextFaces = [];

      faces.forEach(([a, b, c]) => {
        const ab = getMidpoint(cache, a, b);
        const bc = getMidpoint(cache, b, c);
        const ca = getMidpoint(cache, c, a);
        nextFaces.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
      });

      faces = nextFaces;
    }

    const edgeMap = new Map();
    faces.forEach(([a, b, c]) => {
      [
        [a, b],
        [b, c],
        [c, a],
      ].forEach(([first, second]) => {
        const key = first < second ? `${first}:${second}` : `${second}:${first}`;
        edgeMap.set(key, [first, second]);
      });
    });

    return { edges: Array.from(edgeMap.values()), vertices };
  };

  const { edges, vertices } = createIcosphere(2);
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let animationFrame = null;
  let isVisible = true;
  let rotationTime = 0;
  let lastFrameTime = null;
  const maxFrameDelta = 34;
  const opacityBuckets = [0.1, 0.16, 0.22, 0.28];

  const resizeCanvas = () => {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.15, 1400 / Math.max(width, height));
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const rotatePoint = ([x, y, z], time) => {
    const yAngle = time * 0.00005;
    const xAngle = time * 0.00005;
    const zAngle = time * 0.0000;
    const cosY = Math.cos(yAngle);
    const sinY = Math.sin(yAngle);
    const cosX = Math.cos(xAngle);
    const sinX = Math.sin(xAngle);
    const cosZ = Math.cos(zAngle);
    const sinZ = Math.sin(zAngle);
    const yRotatedX = x * cosY + z * sinY;
    const yRotatedZ = -x * sinY + z * cosY;
    const xRotatedY = y * cosX - yRotatedZ * sinX;
    const xRotatedZ = y * sinX + yRotatedZ * cosX;

    return [
      yRotatedX * cosZ - xRotatedY * sinZ,
      yRotatedX * sinZ + xRotatedY * cosZ,
      xRotatedZ,
    ];
  };

  const draw = (timestamp = null) => {
    if (timestamp !== null) {
      if (lastFrameTime !== null) {
        rotationTime += Math.min(timestamp - lastFrameTime, maxFrameDelta);
      }

      lastFrameTime = timestamp;
    }

    context.clearRect(0, 0, width, height);

    const radius = Math.min(width, height) * 0.46;
    const centerX = width * 0.76;
    const centerY = height * 0.26;
    const projected = vertices.map((vertex) => {
      const [x, y, z] = rotatePoint(vertex, rotationTime);
      const perspective = 1.55 / (2.35 - z);

      return {
        x: centerX + x * radius * perspective,
        y: centerY + y * radius * perspective,
        z,
      };
    });

    context.lineWidth = 1.15;
    context.lineCap = "round";
    context.lineJoin = "round";

    opacityBuckets.forEach((opacity) => {
      context.beginPath();
      context.strokeStyle = `rgba(118, 185, 0, ${opacity})`;

      edges.forEach(([first, second]) => {
        const a = projected[first];
        const b = projected[second];
        const depth = (a.z + b.z) / 2;
        const edgeOpacity = 0.08 + ((depth + 1) / 2) * 0.24;
        const bucketIndex = Math.min(opacityBuckets.length - 1, Math.floor(edgeOpacity / 0.08));

        if (opacityBuckets[bucketIndex] !== opacity) {
          return;
        }

        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
      });

      context.stroke();
    });

    if (!reduceMotion && isVisible) {
      animationFrame = window.requestAnimationFrame(draw);
    } else {
      animationFrame = null;
    }
  };

  const startAnimation = () => {
    if (!reduceMotion && animationFrame === null) {
      lastFrameTime = null;
      animationFrame = window.requestAnimationFrame(draw);
    }
  };

  const stopAnimation = () => {
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    lastFrameTime = null;
  };

  resizeCanvas();
  window.addEventListener("resize", () => {
    stopAnimation();
    resizeCanvas();
    draw();
    startAnimation();
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;

        if (isVisible) {
          startAnimation();
        } else {
          stopAnimation();
        }
      },
      { rootMargin: "180px" }
    );

    observer.observe(canvas);
  }

  document.addEventListener("visibilitychange", () => {
    isVisible = !document.hidden;

    if (isVisible) {
      startAnimation();
    } else {
      stopAnimation();
    }
  });

  draw();
};

setupHeroPolyhedron();
setupHoverTooltip();
setupCursorField();
