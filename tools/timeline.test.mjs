import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../timeline.js", import.meta.url), "utf8");

function createTimeline({ reduced = false } = {}) {
  let top = 50, offsets = [0, 140, 280], nextId = 0, resize, intersection;
  const frames = new Map(), properties = new Map();
  class Item {
    constructor(index) {
      this.index = index;
      this.classes = new Set();
      this.attributes = new Map();
      this.classList = {
        add: value => this.classes.add(value), remove: value => this.classes.delete(value),
        toggle: (value, active) => active ? this.classes.add(value) : this.classes.delete(value),
      };
    }
    get offsetTop() { return offsets[this.index]; }
    getBoundingClientRect() { return { top: top + this.offsetTop * 0.9, bottom: top + (this.offsetTop + 140) * 0.9 }; }
    setAttribute(name, value) { this.attributes.set(name, value); }
    removeAttribute(name) { this.attributes.delete(name); }
    closest() { return this; }
  }
  const items = [0, 1, 2].map(index => new Item(index));
  const timeline = Object.assign(new EventTarget(), {
    children: items, offsetWidth: 1000,
    style: { setProperty: (name, value) => properties.set(name, value) },
    getBoundingClientRect: () => ({ width: 900 }),
    contains: item => items.includes(item),
  });
  const document = Object.assign(new EventTarget(), { querySelector: () => timeline });
  const window = new EventTarget();
  const motion = Object.assign(new EventTarget(), { matches: reduced });
  const observed = new Set();
  let disconnected = false;
  class Observer {
    constructor(callback) { intersection = callback; }
    observe(item) { observed.add(item); }
    unobserve(item) { observed.delete(item); }
    disconnect() { disconnected = true; observed.clear(); }
  }
  window.IntersectionObserver = Observer;
  const context = vm.createContext({
    document, window, innerHeight: 300,
    matchMedia: () => motion,
    getComputedStyle: () => ({ getPropertyValue: () => "47px" }),
    addEventListener: window.addEventListener.bind(window),
    requestAnimationFrame: callback => { frames.set(++nextId, callback); return nextId; },
    IntersectionObserver: Observer,
    ResizeObserver: class { constructor(callback) { resize = callback; } observe() {} },
  });
  vm.runInContext(source, context);
  const render = () => {
    assert.ok(frames.size <= 1);
    const pending = [...frames.values()]; frames.clear();
    pending.forEach(callback => callback());
    assert.equal(frames.size, 0, "the timeline must not run a continuous animation loop");
  };
  const emit = (target, type) => target.dispatchEvent(new Event(type));
  return { items, timeline, document, window, motion, observed, properties, frames, render, emit,
    resize: () => resize(),
    enter: item => intersection([{ target: item, isIntersecting: true }]),
    scroll: value => { top = value; emit(window, "scroll"); },
    setOffsets: values => { offsets = values; },
    disconnected: () => disconnected,
  };
}

test("axis geometry stays in CSS pixels under desktop zoom and adapts to changed line wrapping", () => {
  const env = createTimeline(); env.render();
  assert.equal(env.properties.get("--timeline-axis-height"), "280px");
  assert.ok(env.items.every(item => item.tabIndex === 0));
  env.setOffsets([0, 170, 370]);
  env.resize();
  env.emit(env.document, "site-language-change");
  env.emit(env.window, "resize");
  assert.equal(env.frames.size, 1, "coalesce related layout events");
  env.render();
  assert.equal(env.properties.get("--timeline-axis-height"), "370px");
});

test("scrolling marks only the current reading node and clears it when the list is offscreen", () => {
  const env = createTimeline(); env.render();
  assert.equal(env.items[0].attributes.get("aria-current"), "true");
  env.scroll(-100); env.render();
  assert.equal(env.items[0].classes.has("is-current"), false);
  assert.equal(env.items[1].classes.has("is-current"), true);
  assert.equal(env.items.filter(item => item.classes.has("is-current")).length, 1);
  env.scroll(-1000); env.render();
  assert.ok(env.items.every(item => !item.classes.has("is-current")));
});

test("only below-fold rows reveal, and focus or reduced motion makes them visible immediately", () => {
  const env = createTimeline(); env.render();
  assert.equal(env.observed.size, 1);
  assert.ok(env.items[2].classes.has("timeline-reveal-pending"));
  assert.equal(env.items[0].classes.has("timeline-reveal-pending"), false);
  const focus = new Event("focusin");
  Object.defineProperty(focus, "target", { value: env.items[2] });
  env.timeline.dispatchEvent(focus);
  assert.equal(env.items[2].classes.has("timeline-reveal-pending"), false);
  assert.equal(env.observed.size, 0);

  const reduced = createTimeline({ reduced: true }); reduced.render();
  assert.equal(reduced.observed.size, 0);
  assert.ok(reduced.items.every(item => !item.classes.has("timeline-reveal-pending")));
  const changed = createTimeline(); changed.render();
  changed.motion.matches = true;
  changed.emit(changed.motion, "change"); changed.render();
  assert.equal(changed.disconnected(), true);
  assert.ok(changed.items.every(item => !item.classes.has("timeline-reveal-pending")));
});
