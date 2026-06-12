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
  let ripples = [];

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

  const addRipple = (x, y) => {
    ripples.push({ x, y, life: 1 });

    if (ripples.length > 8) {
      ripples.shift();
    }
  };

  const drawFrame = () => {
    context.clearRect(0, 0, width, height);

    ripples.forEach((ripple) => {
      ripple.life -= 0.0225;

      const eased = 1 - ripple.life;
      const radius = 5 + eased * 15;
      const opacity = Math.max(0, ripple.life) * 0.72;

      context.beginPath();
      context.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      context.strokeStyle = `rgba(118, 185, 0, ${opacity})`;
      context.lineWidth = 1.9;
      context.stroke();
    });

    ripples = ripples.filter((ripple) => ripple.life > 0);

    if (ripples.length > 0) {
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

  const handlePointerDown = (event) => {
    addRipple(event.clientX, event.clientY);
    requestDraw();
  };

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("pointerdown", handlePointerDown, { passive: true });
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
  let speedMultiplier = 1;
  let opacityMultiplier = 1;
  let targetSpeedMultiplier = 1;
  let targetOpacityMultiplier = 1;
  let currentSegments = [];
  let pulses = [];
  const interactionEase = 0.075;
  const hoverDistance = 16;
  const hitDistance = 18;
  const hitDepthLimit = -0.24;
  const pulseLifetime = 1000;
  const maxEdgeOpacity = 0.9;
  const edgeData = edges.map(([first, second]) => {
    const a = vertices[first];
    const b = vertices[second];

    return {
      first,
      second,
      length: Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
    };
  });
  const graph = vertices.map(() => []);

  edgeData.forEach(({ first, second, length }) => {
    graph[first].push({ index: second, length });
    graph[second].push({ index: first, length });
  });

  const resizeCanvas = () => {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.1, 2160 / Math.max(width, height));
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const rotatePoint = ([x, y, z], time) => {
    const yAngle = time * 0.00005;
    const xAngle = time * 0.00008;
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

  const smoothstep = (edge0, edge1, value) => {
    const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));

    return x * x * (3 - 2 * x);
  };

  const getCanvasPoint = (event) => {
    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const setInteractionActive = (isActive) => {
    if (reduceMotion) {
      return;
    }

    targetSpeedMultiplier = isActive ? 0.6 : 1;
    targetOpacityMultiplier = isActive ? 1.5 : 1;
    startAnimation();
  };

  const isPointNearPolyhedron = (point) =>
    currentSegments.some((segment) => {
      if (segment.depth <= hitDepthLimit && segment.frontDepth <= 0) {
        return false;
      }

      return distanceToSegment(point, segment).distance <= hoverDistance;
    });

  const distanceToSegment = (point, segment) => {
    const dx = segment.x2 - segment.x1;
    const dy = segment.y2 - segment.y1;
    const lengthSquared = dx * dx + dy * dy;
    const rawT =
      lengthSquared === 0
        ? 0
        : ((point.x - segment.x1) * dx + (point.y - segment.y1) * dy) / lengthSquared;
    const t = Math.max(0, Math.min(1, rawT));
    const x = segment.x1 + dx * t;
    const y = segment.y1 + dy * t;

    return {
      distance: Math.hypot(point.x - x, point.y - y),
      t,
    };
  };

  const getPulseDistances = (seeds) => {
    const distances = new Array(vertices.length).fill(Infinity);
    const visited = new Array(vertices.length).fill(false);

    seeds.forEach(({ index, distance }) => {
      distances[index] = Math.min(distances[index], distance);
    });

    for (let step = 0; step < vertices.length; step += 1) {
      let current = -1;
      let bestDistance = Infinity;

      distances.forEach((distance, index) => {
        if (!visited[index] && distance < bestDistance) {
          current = index;
          bestDistance = distance;
        }
      });

      if (current === -1) {
        break;
      }

      visited[current] = true;

      graph[current].forEach(({ index, length }) => {
        const nextDistance = bestDistance + length;

        if (nextDistance < distances[index]) {
          distances[index] = nextDistance;
        }
      });
    }

    return distances;
  };

  const drawPulseLayer = (timestamp, projected) => {
    if (pulses.length === 0) {
      return;
    }

    pulses = pulses.filter((pulse) => timestamp - pulse.startedAt < pulseLifetime);

    if (pulses.length === 0) {
      return;
    }

    context.lineWidth = 1.7;

    edgeData.forEach(({ first, second, length }) => {
      const a = projected[first];
      const b = projected[second];
      const depth = (a.z + b.z) / 2;
      const depthFactor = depth >= 0 ? 1 : 0.42;
      const segments = 8;

      for (let segment = 0; segment < segments; segment += 1) {
        const t0 = segment / segments;
        const t1 = (segment + 1) / segments;
        const midpoint = (t0 + t1) / 2;
        let pulseOpacity = 0;

        pulses.forEach((pulse) => {
          const elapsed = timestamp - pulse.startedAt;
          const front = elapsed * 0.00225;
          const distanceFromFirst = pulse.distances[first] + length * midpoint;
          const distanceFromSecond = pulse.distances[second] + length * (1 - midpoint);
          const distance = Math.min(distanceFromFirst, distanceFromSecond);
          const band = 0.25;
          const frontDelta = Math.abs(distance - front);

          if (frontDelta > band) {
            return;
          }

          const frontStrength = 1 - frontDelta / band;
          const timeFade = Math.max(0, 1 - elapsed / pulseLifetime);
          const distanceFade = 1 / (1 + distance * 0.9);
          pulseOpacity = Math.max(pulseOpacity, frontStrength * timeFade * distanceFade * depthFactor * 2);
        });

        if (pulseOpacity <= 0.01) {
          continue;
        }

        context.beginPath();
        context.moveTo(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0);
        context.lineTo(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
        context.strokeStyle = `rgba(180, 255, 84, ${pulseOpacity})`;
        context.stroke();
      }
    });
  };

  const draw = (timestamp = null) => {
    if (timestamp !== null) {
      if (lastFrameTime !== null) {
        const frameDelta = Math.min(timestamp - lastFrameTime, maxFrameDelta);
        speedMultiplier += (targetSpeedMultiplier - speedMultiplier) * interactionEase;
        opacityMultiplier += (targetOpacityMultiplier - opacityMultiplier) * interactionEase;
        rotationTime += frameDelta * speedMultiplier;
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
    currentSegments = [];

    context.lineWidth = 1.25;
    context.lineCap = "round";
    context.lineJoin = "round";

    edgeData.forEach(({ first, second }, index) => {
      const a = projected[first];
      const b = projected[second];
      const depth = (a.z + b.z) / 2;
      const backFaceFactor = 0.7 + smoothstep(-0.16, 0.2, depth) * 0.3;
      const edgeOpacity = Math.min(
        maxEdgeOpacity,
        (0.12 + ((depth + 1) / 2) * 0.64) * backFaceFactor * opacityMultiplier
      );

      context.beginPath();
      context.strokeStyle = `rgba(118, 185, 0, ${edgeOpacity})`;
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
      currentSegments.push({
        index,
        first,
        second,
        depth,
        frontDepth: Math.max(a.z, b.z),
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
      });
    });

    drawPulseLayer(timestamp || performance.now(), projected);

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

  if (!reduceMotion) {
    canvas.addEventListener(
      "pointermove",
      (event) => {
        const point = getCanvasPoint(event);
        setInteractionActive(isPointNearPolyhedron(point));
      },
      { passive: true }
    );

    canvas.addEventListener("pointerleave", () => setInteractionActive(false));

    canvas.addEventListener("click", (event) => {
      const point = getCanvasPoint(event);
      let nearest = null;

      currentSegments.forEach((segment) => {
        if (segment.depth <= hitDepthLimit && segment.frontDepth <= 0) {
          return;
        }

        const hit = distanceToSegment(point, segment);

        if (!nearest || hit.distance < nearest.distance) {
          nearest = { ...segment, ...hit };
        }
      });

      if (!nearest || nearest.distance > hitDistance) {
        return;
      }

      const edge = edgeData[nearest.index];
      const distances = getPulseDistances([
        { index: edge.first, distance: edge.length * nearest.t },
        { index: edge.second, distance: edge.length * (1 - nearest.t) },
      ]);

      pulses.push({ startedAt: performance.now(), distances });
      pulses = pulses.slice(-4);
      startAnimation();
    });
  }

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
