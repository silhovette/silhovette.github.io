import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../scroll-reveal.js", import.meta.url), "utf8");
function setup({ reduced = false, noObserver = false, failObserve = false, fade = "complete", hash = "" } = {}) {
  class Unit {
    constructor(top, figure = false) {
      this.top = top; this.figure = figure; this.children = []; this.animations = [];
      this.classes = new Set(); this.attributes = new Map();
      this.classList = { add: x => this.classes.add(x), remove: x => this.classes.delete(x) };
    }
    getBoundingClientRect() { return { top: this.top, bottom: this.top + 200, left: 0, right: 600, width: 600, height: 200 }; }
    contains(target) { return this.children.includes(target); }
    matches() { return this.figure; }
    setAttribute(key, value) { this.attributes.set(key, value); }
    animate(frames, options) {
      let done;
      const animation = { frames, options, finished: new Promise(resolve => { done = resolve; }),
        cancel() { this.cancelled = true; done(); }, finish: () => done() };
      this.animations.push(animation); return animation;
    }
  }
  const units = [new Unit(30), new Unit(900), new Unit(1800, true)];
  const hero = [new Unit(10), new Unit(30), new Unit(60)];
  const root = { getAttribute: () => fade };
  const document = Object.assign(new EventTarget(), {
    documentElement: root,
    querySelectorAll: selector => selector.startsWith(".intro-line") ? hero : units,
    getElementById: id => id === "deep" ? units[2] : null,
  });
  const window = new EventTarget(), media = Object.assign(new EventTarget(), { matches: reduced });
  const observed = new Set(), callbacks = [], frames = new Map(); let mutation, frameId = 0;
  class Observer {
    constructor(callback) { callbacks.push(callback); }
    observe(unit) { if (failObserve) throw new Error("observer unavailable"); observed.add(unit); }
    unobserve(unit) { observed.delete(unit); }
    disconnect() { observed.clear(); }
  }
  if (!noObserver) window.IntersectionObserver = Observer;
  vm.runInNewContext(source, {
    window, document, location: { hash }, scrollY: 0, innerHeight: 800, innerWidth: 1000,
    Element: Unit, matchMedia: query => query.includes("reduced-motion") ? media : { matches: false },
    IntersectionObserver: Observer,
    MutationObserver: class { constructor(callback) { mutation = callback; } observe() {} disconnect() {} },
    addEventListener: window.addEventListener.bind(window),
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
  });
  const emit = (target, type, element) => {
    const event = new Event(type);
    if (element) Object.defineProperty(event, "target", { value: element });
    target.dispatchEvent(event);
  };
  return { Unit, units, hero, document, window, media, observed, callbacks, frames, emit,
    enter: unit => callbacks[0]([{ target: unit, isIntersecting: true }]),
    fadeIn: () => { fade = "revealing"; mutation(); },
    flush: () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); },
  };
}

test("one observer reveals only the entered unit, once, with no global animation queue", () => {
  const env = setup();
  assert.equal(env.callbacks.length, 1);
  assert.equal(env.units[0].classes.size, 0, "first-screen content is directly visible");
  assert.equal(env.observed.size, 2);
  env.enter(env.units[2]); // Fast navigation past the preceding item.
  assert.ok(env.units[1].classes.has("is-reveal-pending"));
  assert.equal(env.units[2].classes.size, 0);
  assert.equal(env.units[2].animations[0].options.delay, 70);
  assert.equal(env.observed.has(env.units[2]), false);
  env.enter(env.units[2]);
  assert.equal(env.units[2].animations.length, 1);
  assert.equal(env.frames.size, 0, "no scroll animation polling loop");
});

test("keyboard focus, search targets and restored scroll positions show content immediately", () => {
  const env = setup(); const child = new env.Unit(900);
  env.units[1].children.push(child);
  env.emit(env.document, "focusin", child);
  assert.equal(env.units[1].classes.size, 0);
  assert.equal(env.units[1].animations.length, 0);
  env.units[2].top = 300;
  env.emit(env.window, "pageshow"); env.flush();
  assert.equal(env.units[2].classes.size, 0);
  assert.equal(env.units[2].animations.length, 0);
  assert.equal(env.frames.size, 0);
});

test("reduced motion and missing or failed observers always leave content visible", () => {
  for (const options of [{ reduced: true }, { noObserver: true }, { failObserve: true }]) {
    const env = setup(options);
    assert.ok(env.units.every(unit => unit.classes.size === 0));
    assert.equal(env.observed.size, 0);
    assert.ok(env.hero.every(unit => unit.animations.length === 0));
  }
  const env = setup(); env.enter(env.units[1]);
  env.media.matches = true; env.emit(env.media, "change");
  assert.ok(env.units.every(unit => unit.classes.size === 0));
  assert.equal(env.units[1].animations[0].cancelled, true);
  assert.equal(env.observed.size, 0);
});

test("Hero staggers position only during the page fade and skips deep anchor entries", () => {
  const env = setup({ fade: "pending" });
  assert.ok(env.hero.every(unit => unit.animations.length === 0));
  env.fadeIn();
  assert.deepEqual(env.hero.map(unit => unit.animations[0].options.delay), [0, 65, 130]);
  assert.equal(env.hero[0].animations[0].frames[0].opacity, undefined);
  assert.equal(env.hero[0].animations[0].options.duration, 600);
  const anchor = setup({ hash: "#deep" });
  assert.ok(anchor.hero.every(unit => unit.animations.length === 0));
});
