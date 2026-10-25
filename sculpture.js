(() => {
"use strict";
// Native Canvas sculptures. Geometry is independent of the DOM so it can be tested.
const TAU = Math.PI * 2;
const SCULPTURE_SETTINGS = {
  desktopParticles: 2400,
  mobileParticles: 1800,
  scatterMs: 520,
  reformMs: 900,
  reducedMorphMs: 650,
  rotationPerSecond: 0.105,
  radius: 1.3,
  scatterRadius: 1.2,
  viewScale: 0.3315,
  canvasOverscan: 1.25,
  hoverExpansion: 1.06,
  hoverDurationMs: 500,
  driftMinRadius: 0.03,
  driftMaxRadius: 0.04,
  driftMinPeriod: 4,
  driftMaxPeriod: 7,
};

const smooth = (t) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

// Shape generators — evaluated once, outside the animation loop.
// Open, even sampling avoids both duplicated seams and dense pole clusters.
function sampleSurface(count, columns, sample) {
  const rows = Math.ceil(count / columns);
  const result = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.floor(i / columns) / rows;
    const v = (i % columns) / columns;
    result.set(sample(u, v), i * 3);
  }
  return result;
}

function torus(count) {
  return sampleSurface(count, 24, (u, v) => {
    const a = TAU * u, b = TAU * v, r = 1 + 0.37 * Math.cos(b);
    return [r * Math.cos(a), r * Math.sin(a), 0.37 * Math.sin(b)];
  });
}

function hopf(count) {
  const result = new Float32Array(count * 3);
  const fibers = 16;
  // A common complex phase traces a Hopf fiber on S³. Stereographic projection
  // gives linked circles, rather than a collection of independently placed rings.
  for (let i = 0; i < count; i++) {
    const fiber = i % fibers;
    const phase = TAU * Math.floor(i / fibers) / Math.ceil(count / fibers);
    const eta = fiber < 8 ? 0.42 : 0.72;
    const azimuth = TAU * (fiber % 8) / 8;
    const denominator = 1 - Math.sin(eta) * Math.sin(phase + azimuth);
    result.set([
      Math.cos(eta) * Math.cos(phase) / denominator,
      Math.cos(eta) * Math.sin(phase) / denominator,
      Math.sin(eta) * Math.cos(phase + azimuth) / denominator,
    ], i * 3);
  }
  return result;
}

function harmonics(count) {
  const result = new Float32Array(count * 3);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  // A radial real spherical harmonic Y₃² ∝ sin²(theta) cos(theta) cos(2 phi).
  for (let i = 0; i < count; i++) {
    const z = 1 - 2 * (i + 0.5) / count;
    const radial = Math.sqrt(1 - z * z), phi = goldenAngle * i;
    const y32 = radial * radial * z * Math.cos(2 * phi);
    const r = 0.45 + 1.75 * Math.abs(y32);
    result.set([r * radial * Math.cos(phi), r * radial * Math.sin(phi), r * z], i * 3);
  }
  return result;
}

function lorenz(count) {
  // RK4, sigma=10, rho=28, beta=8/3. Discard the initial transient, then
  // resample by arc length so slower sections do not become dark clumps.
  const derivative = ([x, y, z]) => [10 * (y - x), x * (28 - z) - y, x * y - (8 / 3) * z];
  const step = (p) => {
    const dt = 0.006;
    const k1 = derivative(p);
    const k2 = derivative(p.map((v, i) => v + dt * k1[i] / 2));
    const k3 = derivative(p.map((v, i) => v + dt * k2[i] / 2));
    const k4 = derivative(p.map((v, i) => v + dt * k3[i]));
    return p.map((v, i) => v + dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
  };
  let p = [0.1, 0, 0];
  for (let i = 0; i < 1800; i++) p = step(p);
  const path = [p], distances = [0];
  for (let i = 1; i < 16000; i++) {
    const next = step(p);
    distances.push(distances[i - 1] + Math.hypot(...next.map((v, axis) => v - p[axis])));
    path.push(next);
    p = next;
  }
  const result = new Float32Array(count * 3);
  let segment = 1;
  for (let i = 0; i < count; i++) {
    const distance = distances.at(-1) * i / (count - 1);
    while (segment < path.length - 1 && distances[segment] < distance) segment++;
    const mix = (distance - distances[segment - 1]) / (distances[segment] - distances[segment - 1]);
    // Put the vertical axis upright in the same coordinate system as the torus.
    const point = path[segment - 1].map((v, axis) => v + mix * (path[segment][axis] - v));
    result.set([point[0], point[2], -point[1]], i * 3);
  }
  return result;
}

function mobius(count) {
  return sampleSurface(count, 20, (u, v) => {
    const theta = TAU * u, strip = (2 * (v + 0.5 / 20) - 1) * 0.46;
    const r = 1 + strip * Math.cos(theta / 2);
    return [r * Math.cos(theta), r * Math.sin(theta), strip * Math.sin(theta / 2)];
  });
}

// Area-weighted sampling for the new immersed surfaces. A small parameter mesh
// estimates patch areas once; output points are evaluated on the exact surface,
// not interpolated onto triangles. No mesh or extra work enters the render loop.
function sampleAreaSurface(count, evaluate, uSteps = 80, vSteps = 48) {
  const stride = vSteps + 1;
  const grid = [];
  for (let u = 0; u <= uSteps; u++) {
    for (let v = 0; v <= vSteps; v++) grid.push(evaluate(u / uSteps, v / vSteps));
  }
  const triangleArea = (a, b, c) => {
    const x = b[0] - a[0], y = b[1] - a[1], z = b[2] - a[2];
    const p = c[0] - a[0], q = c[1] - a[1], r = c[2] - a[2];
    return Math.hypot(y * r - z * q, z * p - x * r, x * q - y * p) / 2;
  };
  const areas = new Float64Array(uSteps * vSteps);
  let total = 0;
  for (let u = 0; u < uSteps; u++) {
    for (let v = 0; v < vSteps; v++) {
      const a = grid[u * stride + v], b = grid[(u + 1) * stride + v];
      const c = grid[u * stride + v + 1], d = grid[(u + 1) * stride + v + 1];
      total += triangleArea(a, b, c) + triangleArea(b, d, c);
      areas[u * vSteps + v] = total;
    }
  }
  const points = new Float32Array(count * 3);
  let patch = 0;
  for (let i = 0; i < count; i++) {
    const area = (i + 0.5) * total / count;
    while (patch < areas.length - 1 && areas[patch] < area) patch++;
    // Low-discrepancy offsets avoid both visible sampling grids and seam duplicates.
    const a = ((i + 0.5) * 0.7548776662466927) % 1;
    const b = ((i + 0.5) * 0.5698402909980532) % 1;
    points.set(evaluate((Math.floor(patch / vSteps) + a) / uSteps,
      ((patch % vSteps) + b) / vSteps), i * 3);
  }
  return points;
}

function enneper(count) {
  // Enneper's polynomial immersion, cropped to a disk to keep a curved boundary.
  // https://mathworld.wolfram.com/EnnepersMinimalSurface.html
  return sampleAreaSurface(count, (a, b) => {
    const r = 1.65 * Math.sqrt(a), theta = TAU * b;
    const u = r * Math.cos(theta), v = r * Math.sin(theta);
    return [u - u ** 3 / 3 + u * v * v, u * u - v * v, -v + v ** 3 / 3 - u * u * v];
  });
}

function dini(count) {
  // Two turns of Dini's helicoidal pseudosphere; trim the infinite logarithmic tip.
  // https://mathworld.wolfram.com/DinisSurface.html
  return sampleAreaSurface(count, (a, b) => {
    const u = 2 * TAU * a, v = 0.22 + 1.28 * b;
    const radius = Math.sin(v);
    const height = Math.cos(v) + Math.log(Math.tan(v / 2)) + 0.18 * u;
    return [radius * Math.cos(u), height, radius * Math.sin(u)];
  });
}

function klein(count) {
  // Classical self-intersecting bottle immersion, with its neck oriented upright.
  // Parameterization reference: three.js ParametricFunctions (geometry only).
  return sampleAreaSurface(count, (a, b) => {
    const u = TAU * a, v = TAU * b;
    const c = Math.cos(u), s = Math.sin(u), tube = 2 - c;
    const neck = u < Math.PI;
    const x = 3 * c * (1 + s) + tube * (neck ? c : -1) * Math.cos(v);
    const height = 8 * s + (neck ? tube * s * Math.cos(v) : 0);
    return [x, height, -tube * Math.sin(v)];
  }, 96, 48);
}

function plucker(count) {
  // A complete family of straight rulings: height = 0.75 sin(2u).
  // The half-turn domain covers each ruling once, rather than doubling density.
  return sampleAreaSurface(count, (a, b) => {
    const u = Math.PI * a, v = 2.5 * (b - 0.5);
    return [v * Math.cos(u), 0.75 * Math.sin(2 * u), v * Math.sin(u)];
  });
}

function roman(count) {
  // Steiner's map (xy, yz, zx) on one hemisphere: antipodal points have the same
  // image, so a full sphere would double every sheet and darken the intersections.
  // https://mathworld.wolfram.com/RomanSurface.html
  return sampleAreaSurface(count, (a, b) => {
    const theta = TAU * a, z = b, radius = Math.sqrt(1 - z * z);
    const x = radius * Math.cos(theta), y = radius * Math.sin(theta);
    return [x * y, y * z, z * x];
  });
}

const SCULPTURE_SHAPES = [
  { id: "torus", name: "Torus", generate: torus },
  { id: "hopf", name: "Hopf Fibration", generate: hopf },
  { id: "harmonics", name: "Spherical Harmonics", generate: harmonics },
  { id: "lorenz", name: "Lorenz Attractor", generate: lorenz, heroScale: 1.08, heroOffsetY: -15 },
  { id: "mobius", name: "Möbius Strip", generate: mobius, displayScale: 1.08 },
  { id: "enneper", name: "Enneper Surface", generate: enneper },
  { id: "dini", name: "Dini's Surface", generate: dini, heroScale: 1.17, heroOffsetY: -60 },
  { id: "klein", name: "Klein Bottle", generate: klein, heroScale: 1.15, heroOffsetY: -30 },
  { id: "plucker", name: "Plücker Conoid", generate: plucker, heroScale: 0.99144, heroOffsetY: 25 },
  { id: "roman", name: "Roman Surface", generate: roman },
];

// Point correspondence and normalization.
// Spatial ordering pairs nearby regions across shapes. It is calculated once;
// drawing and morphing never run a nearest-neighbor search or allocate points.
function morton(x, y, z) {
  const quantize = (v) => Math.max(0, Math.min(1023, Math.round((v / SCULPTURE_SETTINGS.radius + 1) * 511.5)));
  const spread = (v) => {
    v = (v | (v << 16)) & 0x030000ff;
    v = (v | (v << 8)) & 0x0300f00f;
    v = (v | (v << 4)) & 0x030c30c3;
    v = (v | (v << 2)) & 0x09249249;
    return v;
  };
  return spread(quantize(x)) | (spread(quantize(y)) << 1) | (spread(quantize(z)) << 2);
}

function normalizePoints(points) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < points.length; i++) {
    const axis = i % 3;
    min[axis] = Math.min(min[axis], points[i]);
    max[axis] = Math.max(max[axis], points[i]);
  }
  const center = min.map((v, axis) => (v + max[axis]) / 2);
  const centered = new Float32Array(points.length);
  let radius = 0;
  for (let i = 0; i < points.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) centered[i + axis] = points[i + axis] - center[axis];
    radius = Math.max(radius, Math.hypot(centered[i], centered[i + 1], centered[i + 2]));
  }
  const scale = SCULPTURE_SETTINGS.radius / radius;
  for (let i = 0; i < centered.length; i++) centered[i] *= scale;
  const indices = Array.from({ length: points.length / 3 }, (_, i) => i);
  const keys = indices.map((i) => morton(centered[3 * i], centered[3 * i + 1], centered[3 * i + 2]));
  indices.sort((a, b) => keys[a] - keys[b]);
  const ordered = new Float32Array(points.length);
  indices.forEach((index, i) => ordered.set(centered.subarray(index * 3, index * 3 + 3), i * 3));
  return ordered;
}

function createShapeLibrary(count) {
  return SCULPTURE_SHAPES.map((shape) => ({ ...shape, points: normalizePoints(shape.generate(count)) }));
}

function chooseNextShape(current, count, random = Math.random) {
  const pick = Math.min(count - 2, Math.floor(random() * (count - 1)));
  return pick >= current ? pick + 1 : pick;
}

// Transition state — all interpolation takes place in model space, before the
// continuous camera transform. No point replacement or camera reset is needed.
function createScatter(points) {
  const scattered = new Float32Array(points.length);
  for (let i = 0; i < points.length / 3; i++) {
    const seed = (offset) => {
      const n = Math.sin((i + 1) * 127.1 + offset * 311.7) * 43758.5453;
      return n - Math.floor(n);
    };
    const z = 2 * seed(1) - 1, phi = TAU * seed(2);
    const xy = Math.sqrt(1 - z * z), amount = 0.25 + seed(3) * 0.6;
    const x = points[3 * i] + Math.cos(phi) * xy * amount;
    const y = points[3 * i + 1] + Math.sin(phi) * xy * amount;
    const depth = points[3 * i + 2] + z * amount;
    const length = Math.hypot(x, y, depth);
    const scale = Math.min(1, SCULPTURE_SETTINGS.scatterRadius / length);
    scattered.set([x * scale, y * scale, depth * scale], i * 3);
  }
  return scattered;
}

function createTransition(source, target, reduced = false) {
  return {
    source: source.slice(), target,
    scattered: reduced ? null : createScatter(source),
    elapsed: 0, reduced,
    duration: reduced ? SCULPTURE_SETTINGS.reducedMorphMs : SCULPTURE_SETTINGS.scatterMs + SCULPTURE_SETTINGS.reformMs,
  };
}

function sampleTransition(transition, output) {
  if (transition.elapsed >= transition.duration) {
    output.set(transition.target);
    return "idle";
  }
  let from = transition.source, to = transition.target;
  let progress = transition.elapsed / transition.duration, stage = "morph";
  if (!transition.reduced) {
    const scattering = transition.elapsed < SCULPTURE_SETTINGS.scatterMs;
    from = scattering ? transition.source : transition.scattered;
    to = scattering ? transition.scattered : transition.target;
    progress = scattering
      ? transition.elapsed / SCULPTURE_SETTINGS.scatterMs
      : (transition.elapsed - SCULPTURE_SETTINGS.scatterMs) / SCULPTURE_SETTINGS.reformMs;
    stage = scattering ? "scatter" : "reform";
  }
  // Shorten the flat region around the expanded cloud without changing total
  // duration. Both phases still meet at zero velocity; reduced motion is unchanged.
  const t = Math.max(0, Math.min(1, progress));
  const cubic = t * t * (3 - 2 * t);
  const mix = transition.reduced ? smooth(t)
    : stage === "scatter" ? 1 - Math.pow(1 - cubic, 0.75) : Math.pow(cubic, 0.75);
  for (let i = 0; i < output.length; i++) output[i] = from[i] + (to[i] - from[i]) * mix;
  return stage;
}

// Each particle keeps its own direction, amplitude, phases and frequencies for
// its entire lifetime, including morphs. Sampling never generates random values.
function createParticleDrift(count) {
  const parameters = new Float32Array(count * 9);
  for (let i = 0; i < count; i++) {
    const sample = (channel) => {
      const value = Math.sin((i + 1) * 93.71 + channel * 173.23) * 43758.5453;
      return value - Math.floor(value);
    };
    const z = 2 * sample(0) - 1, phi = TAU * sample(1);
    const xy = Math.sqrt(1 - z * z);
    const amplitude = SCULPTURE_SETTINGS.radius * (SCULPTURE_SETTINGS.driftMinRadius
      + sample(2) * (SCULPTURE_SETTINGS.driftMaxRadius - SCULPTURE_SETTINGS.driftMinRadius));
    const offset = i * 9;
    parameters[offset] = amplitude * xy * Math.cos(phi);
    parameters[offset + 1] = amplitude * xy * Math.sin(phi);
    parameters[offset + 2] = amplitude * z;
    for (let axis = 0; axis < 3; axis++) {
      const period = SCULPTURE_SETTINGS.driftMinPeriod
        + sample(3 + axis) * (SCULPTURE_SETTINGS.driftMaxPeriod - SCULPTURE_SETTINGS.driftMinPeriod);
      parameters[offset + 3 + axis] = TAU / period;
      parameters[offset + 6 + axis] = TAU * sample(6 + axis);
    }
  }
  return parameters;
}

function sampleParticleDrift(base, parameters, seconds, output) {
  // Always offset the current mathematical/morphed coordinates, never the last
  // rendered frame. This bounds displacement and prevents cumulative drift.
  for (let i = 0, p = 0; i < base.length; i += 3, p += 9) {
    output[i] = base[i] + parameters[p] * Math.sin(seconds * parameters[p + 3] + parameters[p + 6]);
    output[i + 1] = base[i + 1] + parameters[p + 1] * Math.sin(seconds * parameters[p + 4] + parameters[p + 7]);
    output[i + 2] = base[i + 2] + parameters[p + 2] * Math.sin(seconds * parameters[p + 5] + parameters[p + 8]);
  }
}

class ParticleSculpture {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    if (!this.ctx) return;
    this.motion = matchMedia("(prefers-reduced-motion: reduce)");
    this.status = canvas.parentElement.querySelector("[data-orbit-status]");
    this.count = options.count || (matchMedia("(max-width: 760px)").matches
      ? SCULPTURE_SETTINGS.mobileParticles : SCULPTURE_SETTINGS.desktopParticles);
    this.shapes = options.shapes || createShapeLibrary(this.count);
    this.current = this.shapes.findIndex((shape) => shape.id === (options.shape || "mobius"));
    this.interactive = options.interactive !== false;
    this.frameInterval = this.interactive ? 0 : 1000 / 30;
    this.depthBuckets = this.interactive ? null : Array.from({ length: 16 }, () => []);
    this.target = this.current;
    this.points = this.shapes[this.current].points.slice();
    this.drift = createParticleDrift(this.count);
    this.drifted = new Float32Array(this.count * 3);
    this.projected = new Float32Array(this.count * 3);
    this.depthOrder = Array.from({ length: this.count }, (_, i) => i);
    this.transition = null;
    this.stage = "idle";
    this.visible = false;
    this.frame = null;
    this.previous = null;
    this.elapsed = 0;
    this.angle = 0.35;
    this.hover = { factor: 1, from: 1, target: 1, elapsed: 0 };
    this.width = 0;
    this.height = 0;
    this.canvas.dataset.particleCount = String(this.count);
    this.canvas.dataset.shape = this.shapes[this.current].id;
    this.canvas.dataset.transition = "idle";
    this.tick = this.tick.bind(this);
    this.bindInteractions();
    this.updateAccessibleState();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.sync();
    });
    this.intersectionObserver.observe(canvas);
    this.resize();
  }

  updateAccessibleState(announce = false) {
    const i18n = window.siteI18n;
    const current = this.shapes[this.current];
    const shape = i18n ? i18n.t(`sculpture_shape_${current.id}`, {}, current.name) : current.name;
    if (i18n && this.interactive) {
      i18n.setAttribute(this.canvas, "aria-label", "sculpture_label", { shape });
      if (this.status && (announce || this.status.textContent)) i18n.setText(this.status, "sculpture_changed", { shape });
    } else {
      this.canvas.setAttribute("aria-label", `${shape} particle sculpture.${this.interactive ? " Click or press Enter to transform." : ""}`);
      if (announce && this.status) this.status.textContent = `Now showing ${shape}.`;
    }
  }

  setStage(stage) {
    if (stage === this.stage) return;
    this.stage = stage;
    this.canvas.dataset.transition = stage;
    this.canvas.setAttribute("aria-busy", String(stage !== "idle"));
  }

  transform() {
    if (this.transition) return;
    this.target = chooseNextShape(this.current, this.shapes.length);
    this.transition = createTransition(this.points, this.shapes[this.target].points, this.motion.matches);
    this.setStage(this.motion.matches ? "morph" : "scatter");
    this.sync();
  }

  setExpansion(target) {
    if (this.hover.target === target) return;
    this.hover.from = this.hover.factor;
    this.hover.target = target;
    this.hover.elapsed = 0;
  }

  bindInteractions() {
    if (this.interactive) this.bindInput();
    document.addEventListener("visibilitychange", () => this.sync());
    document.addEventListener("site-language-change", () => this.updateAccessibleState());
    this.motion.addEventListener("change", () => {
      if (this.motion.matches) {
        this.hover.factor = this.hover.from = this.hover.target = 1;
        this.hover.elapsed = 0;
      }
      if (this.motion.matches && this.transition) {
        this.transition = createTransition(this.points, this.shapes[this.target].points, true);
        this.setStage("morph");
      }
      this.sync();
    });
  }

  bindInput() {
    this.canvas.addEventListener("click", () => this.transform());
    this.canvas.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (!event.repeat) this.transform();
      }
    });
    this.canvas.addEventListener("pointerenter", (event) => {
      if (this.motion.matches || event.pointerType === "touch") return;
      this.setExpansion(SCULPTURE_SETTINGS.hoverExpansion);
    });
    this.canvas.addEventListener("pointerleave", () => {
      this.setExpansion(1);
    });
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.sync();
  }

  shouldAnimate() {
    return this.width > 0 && this.height > 0 && this.visible && !this.suspended && !document.hidden
      && (!this.motion.matches || this.transition !== null);
  }

  sync() {
    // Keep exactly one RAF chain; restarting its clock excludes suspended time.
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.previous = null;
    this.draw();
    if (this.shouldAnimate()) this.frame = requestAnimationFrame(this.tick);
  }

  tick(now) {
    this.frame = null;
    if (!this.shouldAnimate()) { this.previous = null; return; }
    if (this.previous !== null && now - this.previous < this.frameInterval - 0.5) {
      this.frame = requestAnimationFrame(this.tick);
      return;
    }
    const delta = this.previous === null ? 0 : Math.min(50, Math.max(0, now - this.previous));
    this.previous = now;
    if (!this.motion.matches) {
      this.elapsed += delta;
      this.angle += delta * SCULPTURE_SETTINGS.rotationPerSecond / 1000;
      this.hover.elapsed = Math.min(SCULPTURE_SETTINGS.hoverDurationMs, this.hover.elapsed + delta);
      const expansionProgress = smooth(this.hover.elapsed / SCULPTURE_SETTINGS.hoverDurationMs);
      this.hover.factor = this.hover.from + (this.hover.target - this.hover.from) * expansionProgress;
    }
    if (this.transition) {
      this.transition.elapsed = Math.min(this.transition.duration, this.transition.elapsed + delta);
      this.setStage(sampleTransition(this.transition, this.points));
      if (this.stage === "idle") {
        this.current = this.target;
        this.transition = null;
        this.canvas.dataset.shape = this.shapes[this.current].id;
        this.updateAccessibleState(true);
      }
    }
    this.draw();
    if (this.shouldAnimate()) this.frame = requestAnimationFrame(this.tick);
  }

  draw() {
    // Camera projection and depth-sorted rendering share the existing warm ink.
    const { ctx, width, height, projected } = this;
    if (!width || !height) return;
    // The existing animation clock freezes offscreen and under reduced motion.
    // Keep this clock and the drift parameters continuous across every shape.
    sampleParticleDrift(this.points, this.drift, this.elapsed / 1000, this.drifted);
    const points = this.drifted;
    ctx.clearRect(0, 0, width, height);
    const rx = 0.88, ry = this.angle;
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
    const breathing = 1 + 0.006 * Math.sin(this.elapsed * 0.00045);
    const sourceShape = this.shapes[this.current], targetShape = this.shapes[this.target];
    const sourceScale = (sourceShape.displayScale || 1) * (this.interactive ? sourceShape.heroScale || 1 : 1);
    const targetScale = (targetShape.displayScale || 1) * (this.interactive ? targetShape.heroScale || 1 : 1);
    const progress = this.transition ? smooth(this.transition.elapsed / this.transition.duration) : 0;
    const shapeScale = this.transition
      ? sourceScale + (targetScale - sourceScale) * progress
      : sourceScale;
    const sourceOffsetY = this.interactive ? sourceShape.heroOffsetY || 0 : 0;
    const targetOffsetY = this.interactive ? targetShape.heroOffsetY || 0 : 0;
    const offsetY = sourceOffsetY + (targetOffsetY - sourceOffsetY) * progress;
    const scale = Math.min(width, height) / SCULPTURE_SETTINGS.canvasOverscan * SCULPTURE_SETTINGS.viewScale * shapeScale;
    const expansion = this.hover.factor;
    for (let i = 0; i < this.count; i++) {
      const offset = i * 3;
      const x = points[offset] * breathing, y = points[offset + 1] * breathing, z = points[offset + 2] * breathing;
      const a = x * cy + z * sy, b = -x * sy + z * cy;
      const c = y * cx - b * sx, depth = y * sx + b * cx;
      // Uniform 3D expansion commutes with rotation. Expand all three position
      // coordinates before projection, keeping camera parameters unchanged.
      const perspective = 4.8 / (4.8 - depth * expansion);
      projected[offset] = width * 0.5 + a * expansion * scale * perspective;
      projected[offset + 1] = height * 0.5 + offsetY + c * expansion * scale * perspective;
      // Unexpanded depth preserves each point's radius, color and opacity.
      projected[offset + 2] = depth;
    }
    const pointScale = Math.min(1, width / SCULPTURE_SETTINGS.canvasOverscan / 440);
    if (this.depthBuckets) {
      // Preview particles share 16 depth layers: one canvas fill per layer,
      // rather than a sort and a separate style/path/fill for every particle.
      for (const bucket of this.depthBuckets) bucket.length = 0;
      for (let index = 0; index < this.count; index++) {
        const depth = Math.max(0, Math.min(1, (projected[index * 3 + 2] + 1.65) / 3.3));
        this.depthBuckets[Math.min(15, Math.floor(depth * 16))].push(index);
      }
      this.depthBuckets.forEach((bucket, layer) => {
        if (!bucket.length) return;
        const depth = (layer + 0.5) / 16;
        const radius = (0.65 + depth * 0.65) * pointScale * 0.912;
        ctx.fillStyle = window.siteTheme?.rgba("--theme-sculpture-rgb", 0.19 + depth * 0.62) || `rgba(161,62,35,${0.19 + depth * 0.62})`;
        ctx.beginPath();
        for (const index of bucket) {
          const x = projected[index * 3], y = projected[index * 3 + 1];
          ctx.moveTo(x + radius, y);
          ctx.arc(x, y, radius, 0, TAU);
        }
        ctx.fill();
      });
      return;
    }
    this.depthOrder.sort((a, b) => projected[a * 3 + 2] - projected[b * 3 + 2]);
    for (const index of this.depthOrder) {
      const offset = index * 3;
      const depth = Math.max(0, Math.min(1, (projected[offset + 2] + 1.65) / 3.3));
      ctx.fillStyle = window.siteTheme?.rgba("--theme-sculpture-rgb", 0.19 + depth * 0.62) || `rgba(161,62,35,${0.19 + depth * 0.62})`;
      ctx.beginPath();
      ctx.arc(projected[offset], projected[offset + 1], (0.65 + depth * 0.65) * pointScale * 0.912, 0, TAU);
      ctx.fill();
    }
  }
}

if (typeof document !== "undefined") {
  const canvas = document.getElementById("agent-orbit");
  if (canvas) {
    const sculpture = new ParticleSculpture(canvas);
    const dialog = document.getElementById("sculpture-gallery");
    if (dialog) setupGallery(canvas, sculpture, dialog);
  }
}

function setupGallery(canvas, sculpture, dialog) {
  const grid = dialog.querySelector(".sculpture-gallery__grid");
  const previews = [];
  const descriptions = [
    "A ring with a rounded tube and an open center.",
    "Linked circles woven into a flowing bundle.",
    "A sphere shaped into rounded, petal-like lobes.",
    "Two swirling wings of a chaotic trajectory.",
    "A continuous ribbon with a half twist.",
    "A curved sheet folding into flowing petals.",
    "A twisting surface spiraling around its axis.",
    "A bottle whose neck passes through its own surface.",
    "Straight lines sweeping out a twisted surface.",
    "Rounded sheets meeting in a tetrahedral form.",
  ];
  let clicks = [];
  let closing = false;
  let previousOverflow;
  let previousFocus;
  let pauseBackgroundTimer;
  const setSuspended = (engine, suspended) => { engine.suspended = suspended; engine.sync(); };
  const open = () => {
    if (dialog.open) return;
    previousFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.classList.remove("is-closing");
    dialog.showModal();
    clearTimeout(pauseBackgroundTimer);
    pauseBackgroundTimer = setTimeout(() => {
      if (dialog.open && !closing) setSuspended(sculpture, true);
    }, 1000);
    if (!previews.length) {
      const count = 800;
      const shapes = createShapeLibrary(count);
      shapes.forEach((shape, index) => {
        const card = document.createElement("article");
        card.className = "sculpture-gallery__card";
        const preview = document.createElement("canvas");
        preview.setAttribute("role", "img");
        const title = document.createElement("h3");
        title.textContent = shape.name;
        const description = document.createElement("p");
        description.textContent = descriptions[index];
        card.append(preview, title, description);
        grid.append(card);
        previews.push(new ParticleSculpture(preview, { count, shapes, shape: shape.id, interactive: false }));
      });
    }
    previews.forEach(engine => { engine.resize(); setSuspended(engine, false); });
    if (!sculpture.motion.matches) dialog.animate([
      { opacity: 0, transform: "translateY(16px) scale(0.98)" },
      { opacity: 1, transform: "translateY(0) scale(1)" },
    ], { duration: 240, easing: "ease-out" });
  };
  const close = () => {
    if (!dialog.open || closing) return;
    closing = true;
    clearTimeout(pauseBackgroundTimer);
    setSuspended(sculpture, false);
    dialog.classList.add("is-closing");
    const finish = () => {
      dialog.close();
      closing = false;
    };
    if (sculpture.motion.matches) finish();
    else dialog.animate([
      { opacity: 1, transform: "translateY(0) scale(1)" },
      { opacity: 0, transform: "translateY(12px) scale(0.98)" },
    ], { duration: 200, easing: "ease-in", fill: "forwards" }).finished.then(finish);
  };
  canvas.addEventListener("click", event => {
    const now = event.timeStamp;
    clicks = clicks.filter(time => now - time < 800);
    clicks.push(now);
    if (clicks.length >= 3) { clicks = []; open(); }
  });
  dialog.addEventListener("cancel", event => { event.preventDefault(); close(); });
  let backdropDown = false;
  const outside = event => {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  dialog.addEventListener("pointerdown", event => { backdropDown = event.target === dialog && outside(event); });
  dialog.addEventListener("click", event => {
    if (backdropDown && event.target === dialog && outside(event)) close();
    backdropDown = false;
  });
  dialog.addEventListener("close", () => {
    clearTimeout(pauseBackgroundTimer);
    previews.forEach(engine => setSuspended(engine, true));
    setSuspended(sculpture, false);
    document.body.style.overflow = previousOverflow;
    dialog.getAnimations().forEach(animation => animation.cancel());
    previousFocus?.focus({ preventScroll: true });
  });
}

// CommonJS access is only used by the Node test suite.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SCULPTURE_SETTINGS, createShapeLibrary, chooseNextShape, createTransition, sampleTransition, createParticleDrift, sampleParticleDrift, ParticleSculpture };
}
})();
