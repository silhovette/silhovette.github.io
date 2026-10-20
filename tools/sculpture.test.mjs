import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import sculpture from "../sculpture.js";
const {
  SCULPTURE_SETTINGS: settings, createShapeLibrary, chooseNextShape,
  createTransition, sampleTransition, createParticleDrift, sampleParticleDrift, ParticleSculpture,
} = sculpture;

const library = createShapeLibrary(settings.desktopParticles);

test("every registered shape has matching English, Simplified and Traditional Chinese names", () => {
  const source = readFileSync(new URL("../languages.js", import.meta.url), "utf8");
  const start = source.indexOf("const translations = ") + "const translations = ".length;
  const end = source.indexOf("\n  const supported", start);
  const translations = vm.runInNewContext(`(${source.slice(start, end).trim().replace(/;$/, "")})`);
  for (const shape of library) {
    const names = translations[`sculpture_shape_${shape.id}`];
    assert.equal(names.length, 3);
    assert.equal(names[0], shape.name);
    assert.ok(names.every(name => name.length > 0));
  }
});

test("all ten sculptures are finite, centered and equally sized at both particle budgets", () => {
  for (const count of [settings.desktopParticles, settings.mobileParticles]) {
    const shapes = count === settings.desktopParticles ? library : createShapeLibrary(count);
    assert.equal(new Set(shapes.map(shape => shape.id)).size, 10);
    for (const shape of shapes) {
      assert.equal(shape.points.length, count * 3);
      let radius = 0;
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < count; i++) {
        const point = shape.points.subarray(i * 3, i * 3 + 3);
        assert.ok(point.every(Number.isFinite), shape.name);
        radius = Math.max(radius, Math.hypot(...point));
        point.forEach((n, axis) => { min[axis] = Math.min(min[axis], n); max[axis] = Math.max(max[axis], n); });
      }
      assert.ok(Math.abs(radius - settings.radius) < 1e-6, shape.name);
      for (let axis = 0; axis < 3; axis++) assert.ok(Math.abs(min[axis] + max[axis]) < 1e-6, shape.name);
    }
  }
});

test("the new ruled and Roman surfaces satisfy their defining relations before normalization", () => {
  const conoid = library.find(shape => shape.id === "plucker").generate(2400);
  const roman = library.find(shape => shape.id === "roman").generate(2400);
  for (let i = 0; i < conoid.length; i += 3) {
    const [x, height, z] = conoid.subarray(i, i + 3);
    assert.ok(Math.abs(height * (x * x + z * z) - 1.5 * x * z) < 1e-6);
    const [a, b, c] = roman.subarray(i, i + 3);
    assert.ok(Math.abs(a * a * b * b + b * b * c * c + c * c * a * a - a * b * c) < 1e-7);
  }
});

test("each random choice can reach every other shape and never the current shape", () => {
  for (let current = 0; current < library.length; current++) {
    const choices = new Set();
    for (let i = 0; i < 100; i++) choices.add(chooseNextShape(current, library.length, () => i / 100));
    assert.equal(choices.has(current), false);
    assert.deepEqual([...choices].sort((a, b) => a - b), library.map((_, i) => i).filter(i => i !== current));
  }
});

test("scatter and reform are continuous, end exactly on the target, and stay inside the canvas", () => {
  for (let shape = 0; shape < library.length; shape++) {
    const source = library[shape].points, target = library[(shape + 1) % library.length].points;
    const transition = createTransition(source, target);
    const output = new Float32Array(source.length);
    assert.equal(sampleTransition(transition, output), "scatter");
    assert.ok(output.every((n, i) => n === source[i]));
    transition.elapsed = settings.scatterMs;
    assert.equal(sampleTransition(transition, output), "reform");
    assert.deepEqual(output, transition.scattered);
    const boundary = output.slice();
    for (const elapsed of [settings.scatterMs - 0.01, settings.scatterMs + 0.01]) {
      transition.elapsed = elapsed;
      sampleTransition(transition, output);
      assert.ok(output.every((n, i) => Math.abs(n - boundary[i]) < 1e-6));
    }
    for (let elapsed = 0; elapsed <= transition.duration; elapsed += 100) {
      transition.elapsed = elapsed;
      sampleTransition(transition, output);
      for (let i = 0; i < output.length; i += 3) {
        const radius = (Math.hypot(output[i], output[i + 1], output[i + 2])
          + settings.radius * settings.driftMaxRadius) * 1.006;
        // Worst-case perspective silhouette at any rotation, including breathing.
        const expandedRadius = radius * settings.hoverExpansion;
        const displayScale = Math.max(library[shape].displayScale || 1, library[(shape + 1) % library.length].displayScale || 1);
        const screenRadius = settings.viewScale * displayScale / settings.canvasOverscan * expandedRadius / Math.sqrt(1 - (expandedRadius / 4.8) ** 2);
        assert.ok(screenRadius < 0.495, `${library[shape].name} clips during transition`);
      }
    }
    transition.elapsed = transition.duration;
    assert.equal(sampleTransition(transition, output), "idle");
    assert.deepEqual(output, target);
    assert.deepEqual(transition.source, source);
  }
});

test("independent particle drift stays small and smooth on all ten shapes without accumulating", () => {
  const parameters = createParticleDrift(settings.desktopParticles);
  const output = new Float32Array(settings.desktopParticles * 3);
  const next = new Float32Array(output.length);
  const maxAmplitude = settings.radius * settings.driftMaxRadius;
  const maxSpeed = maxAmplitude * 2 * Math.PI / settings.driftMinPeriod;
  for (let p = 0; p < parameters.length; p += 9) {
    const amplitude = Math.hypot(...parameters.subarray(p, p + 3));
    assert.ok(amplitude >= settings.radius * settings.driftMinRadius - 1e-7);
    assert.ok(amplitude <= maxAmplitude + 1e-7);
    for (let axis = 0; axis < 3; axis++) {
      const period = 2 * Math.PI / parameters[p + 3 + axis];
      assert.ok(period >= settings.driftMinPeriod - 1e-6 && period <= settings.driftMaxPeriod + 1e-6);
    }
  }
  for (const shape of library) {
    const original = shape.points.slice();
    for (const seconds of [0, 0.25, 2, 7, 14, 30, 120, 3600]) {
      sampleParticleDrift(shape.points, parameters, seconds, output);
      sampleParticleDrift(shape.points, parameters, seconds + 0.001, next);
      for (let i = 0; i < output.length; i += 3) {
        const displacement = Math.hypot(output[i] - original[i], output[i + 1] - original[i + 1], output[i + 2] - original[i + 2]);
        assert.ok(displacement <= maxAmplitude + 1e-6, shape.name);
        assert.ok(Math.hypot(next[i] - output[i], next[i + 1] - output[i + 1], next[i + 2] - output[i + 2]) <= maxSpeed * 0.001 + 1e-6);
      }
    }
    sampleParticleDrift(shape.points, parameters, 7, output);
    sampleParticleDrift(shape.points, parameters, 3600, next);
    sampleParticleDrift(shape.points, parameters, 7, next);
    assert.deepEqual(next, output, "render history cannot affect particle positions");
    assert.deepEqual(shape.points, original, "drift cannot modify the mathematical coordinates");
  }
  const first = parameters.subarray(0, 9);
  assert.ok(parameters.subarray(9, 18).some((n, axis) => n !== first[axis]));
});

test("reduced motion uses a short, direct morph with no scatter", () => {
  const transition = createTransition(library[0].points, library[1].points, true);
  assert.equal(transition.scattered, null);
  assert.equal(transition.duration, settings.reducedMorphMs);
  const output = new Float32Array(transition.source.length);
  transition.elapsed = transition.duration / 2;
  assert.equal(sampleTransition(transition, output), "morph");
  assert.ok(output.every((n, i) => Math.abs(n - (transition.source[i] + transition.target[i]) / 2) < 1e-6));
  transition.elapsed = transition.duration;
  assert.equal(sampleTransition(transition, output), "idle");
  assert.deepEqual(output, transition.target);
});

// A deterministic browser clock exercises the actual loop and event handlers.
// Rendering and native input are also checked in the preview browser.
class Element extends EventTarget {
  dataset = {};
  attributes = new Map();
  textContent = "";
  setAttribute(name, value) { this.attributes.set(name, value); }
}

test("animation lifecycle: rapid input, visibility, resize and live reduced-motion changes", t => {
  const previousGlobals = {};
  const pending = new Map();
  let frameId = 0, now = 0, intersection, resize;
  const motion = new EventTarget();
  motion.matches = false;
  const doc = new EventTarget();
  doc.hidden = false;
  const mocks = {
    document: doc, window: { devicePixelRatio: 3 },
    matchMedia: query => query.includes("reduced") ? motion : { matches: true },
    requestAnimationFrame: callback => { pending.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => pending.delete(id),
    ResizeObserver: class { constructor(callback) { resize = callback; } observe() {} },
    IntersectionObserver: class { constructor(callback) { intersection = callback; } observe() {} },
  };
  for (const [key, value] of Object.entries(mocks)) {
    previousGlobals[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  t.after(() => {
    for (const key of Object.keys(mocks)) {
      if (previousGlobals[key]) Object.defineProperty(globalThis, key, previousGlobals[key]);
      else delete globalThis[key];
    }
  });
  const status = new Element(), canvas = new Element();
  let dimensions = { width: 520, height: 540, left: 0, top: 0 };
  canvas.getBoundingClientRect = () => dimensions;
  canvas.parentElement = { querySelector: () => status };
  canvas.getContext = () => Object.fromEntries(["setTransform", "clearRect", "beginPath", "arc", "fill", "moveTo", "lineTo", "stroke"].map(key => [key, () => {}]));
  const engine = new ParticleSculpture(canvas);
  const step = (ms = 16) => {
    now += ms;
    assert.ok(pending.size <= 1, "multiple animation loops");
    const callbacks = [...pending.values()];
    pending.clear();
    callbacks.forEach(callback => callback(now));
  };
  const emit = (target, name) => target.dispatchEvent(new Event(name));
  assert.equal(pending.size, 0, "offscreen must not run");
  intersection([{ isIntersecting: true }]);
  step(); step();
  const rotatingAngle = engine.angle;
  assert.ok(rotatingAngle > 0.35);
  const driftBeforeMorph = engine.drifted.slice();
  const driftParameters = engine.drift;
  emit(canvas, "click");
  assert.deepEqual(engine.drifted, driftBeforeMorph, "starting a morph cannot jump the particles");
  assert.equal(engine.drift, driftParameters, "shape changes keep the same per-particle drift");
  const activeTransition = engine.transition;
  for (let i = 0; i < 10; i++) emit(canvas, "click");
  assert.equal(engine.transition, activeTransition);
  step(); step(50);
  for (const suspend of ["hidden", "offscreen"]) {
    if (suspend === "hidden") { doc.hidden = true; emit(doc, "visibilitychange"); }
    else intersection([{ isIntersecting: false }]);
    const elapsed = engine.transition.elapsed;
    const driftClock = engine.elapsed;
    const drifted = engine.drifted.slice();
    step(5000);
    assert.equal(pending.size, 0);
    assert.equal(engine.transition.elapsed, elapsed);
    assert.equal(engine.elapsed, driftClock, "suspension must freeze the drift clock");
    assert.deepEqual(engine.drifted, drifted);
    if (suspend === "hidden") { doc.hidden = false; emit(doc, "visibilitychange"); }
    else intersection([{ isIntersecting: true }]);
    step(5000);
    assert.equal(engine.transition.elapsed, elapsed);
    assert.deepEqual(engine.drifted, drifted, "resuming must not jump to wall-clock time");
  }
  dimensions = { width: 340, height: 375, left: 0, top: 0 };
  resize();
  assert.equal(canvas.width, 680, "DPR is capped at 2");
  assert.equal(canvas.height, 750);
  const beforePreference = engine.points.slice();
  motion.matches = true;
  emit(motion, "change");
  assert.deepEqual(engine.transition.source, beforePreference);
  assert.equal(engine.transition.scattered, null);
  for (let i = 0; i < 16; i++) step(50);
  assert.equal(engine.transition, null);
  assert.equal(canvas.dataset.shape, engine.shapes[engine.current].id);
  assert.equal(pending.size, 0, "reduced motion is static after reform");
  const angle = engine.angle;
  const reducedDriftClock = engine.elapsed;
  emit(canvas, "click");
  assert.equal(canvas.dataset.transition, "morph");
  for (let i = 0; i < 16; i++) step(50);
  assert.equal(engine.angle, angle);
  assert.equal(engine.elapsed, reducedDriftClock, "reduced motion freezes particle drift during a gentle morph too");
  assert.equal(pending.size, 0);
  motion.matches = false;
  emit(motion, "change");
  step(); step();
  assert.ok(engine.angle > angle);
  const pointerEvent = new Event("pointerenter");
  Object.assign(pointerEvent, { pointerType: "mouse" });
  canvas.dispatchEvent(pointerEvent);
  step(50);
  assert.ok(engine.hover.factor > 1 && engine.hover.factor < settings.hoverExpansion);
  const expanded = engine.hover.factor;
  const angleBeforeMove = engine.angle;
  emit(canvas, "pointermove");
  assert.equal(engine.angle, angleBeforeMove, "mouse movement must not alter camera rotation");
  emit(canvas, "pointerleave");
  step(50);
  assert.ok(engine.hover.factor < expanded && engine.hover.factor > 1);
  canvas.dispatchEvent(pointerEvent);
  for (let i = 0; i < 10; i++) step(50);
  assert.equal(engine.hover.factor, settings.hoverExpansion, "expansion finishes in 500ms");

  const drawn = [];
  engine.ctx.arc = (x, y, radius) => drawn.push({ x, y, radius, color: engine.ctx.fillStyle });
  for (const shape of engine.shapes) {
    engine.points.set(shape.points);
    const geometry = engine.points.slice();
    engine.hover.factor = 1;
    drawn.length = 0;
    engine.draw();
    const normal = drawn.slice();
    const unexpandedDepth = engine.projected.slice();
    engine.hover.factor = settings.hoverExpansion;
    drawn.length = 0;
    engine.draw();
    assert.equal(drawn.length, engine.count);
    assert.ok(drawn.some((point, i) => Math.hypot(point.x - normal[i].x, point.y - normal[i].y) > 1));
    for (let i = 0; i < drawn.length; i++) {
      assert.equal(drawn[i].radius, normal[i].radius, "hover cannot change particle radius");
      assert.equal(drawn[i].color, normal[i].color, "hover cannot change particle color or opacity");
    }
    for (let i = 0; i < engine.count; i++) {
      const offset = i * 3, depth = unexpandedDepth[offset + 2];
      const ratio = settings.hoverExpansion * (4.8 - depth) / (4.8 - depth * settings.hoverExpansion);
      assert.ok(Math.abs(engine.projected[offset] - engine.width / 2 - (unexpandedDepth[offset] - engine.width / 2) * ratio) < 1e-4);
      const centerY = engine.height / 2 + (engine.shapes[engine.current].heroOffsetY || 0);
      assert.ok(Math.abs(engine.projected[offset + 1] - centerY - (unexpandedDepth[offset + 1] - centerY) * ratio) < 1e-4);
    }
    assert.deepEqual(engine.points, geometry, "hover cannot modify the base shape");
  }
  emit(canvas, "pointerleave");
  for (let i = 0; i < 10; i++) step(50);
  assert.equal(engine.hover.factor, 1, "leaving restores the positions in 500ms");
});
