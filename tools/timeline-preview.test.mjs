import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const script = readFileSync(new URL("../timeline-preview.js", import.meta.url), "utf8");
const timelineHtml = readFileSync(new URL("../timeline.html", import.meta.url), "utf8");
async function setup({ reduced = false, failed = false } = {}) {
  let enter, resize, height = 1200;
  const animations = [], appended = [], requests = [];
  const region = Object.assign(new EventTarget(), { contains: target => target === viewport || target === link });
  const link = {};
  const status = { hidden: false, textContent: "Loading timeline…" };
  const track = {
    append: (...children) => appended.push(...children),
    querySelectorAll: () => [],
    animate: (frames, timing) => {
      const animation = { frames, timing, currentTime: 0, playState: "running",
        play() { this.playState = "running"; }, pause() { this.playState = "paused"; },
        cancel() { this.playState = "idle"; } };
      animations.push(animation); return animation;
    },
  };
  const viewport = {
    scrollTop: 0, closest: () => region,
    querySelector: selector => selector.includes("track") ? track : status,
  };
  const sequence = {
    get offsetHeight() { return height; }, querySelectorAll: () => [],
    cloneNode: () => ({ setAttribute(name, value) { this[name] = value; } }),
  };
  const document = Object.assign(new EventTarget(), {
    hidden: false, querySelector: () => viewport, importNode: () => sequence,
  });
  const window = Object.assign(new EventTarget(), {});
  const media = Object.assign(new EventTarget(), { matches: reduced });
  class Observer { constructor(callback) { enter = callback; } observe() {} }
  window.IntersectionObserver = Observer;
  vm.runInNewContext(script, {
    window, document, matchMedia: () => media, IntersectionObserver: Observer,
    addEventListener: window.addEventListener.bind(window),
    ResizeObserver: class { constructor(callback) { resize = callback; } observe() {} },
    DOMParser: class { parseFromString(html) {
      assert.equal(html, timelineHtml, "the canonical page supplies every event");
      return { querySelector: () => ({ children: new Array(13) }) };
    } },
    fetch: async url => {
      requests.push(url);
      return { ok: !failed, text: async () => timelineHtml };
    },
  });
  await new Promise(resolve => setImmediate(resolve));
  const emit = (target, type, values = {}) => {
    const event = new Event(type);
    for (const [key, value] of Object.entries(values)) Object.defineProperty(event, key, { value });
    target.dispatchEvent(event);
  };
  return { region, link, status, viewport, track, document, media, window, animations, appended, requests, emit,
    enter: visible => enter([{ isIntersecting: visible }]),
    resize: value => { height = value; resize(); },
  };
}

test("the canonical list has one visual clone and stays paused outside the viewport", async () => {
  const env = await setup();
  assert.deepEqual(env.requests, ["timeline.html"]);
  assert.equal(env.appended.length, 2);
  assert.equal(env.appended[1]["aria-hidden"], "true");
  assert.equal(env.appended[1].inert, true);
  const animation = env.animations[0];
  assert.equal(animation.playState, "paused");
  assert.equal(animation.timing.duration, 100000); // 1200 CSS px at 12 px/s.
  assert.equal(animation.timing.iterations, Infinity);
  assert.equal(animation.timing.easing, "linear");
  env.enter(true); assert.equal(animation.playState, "running");
  env.enter(false); assert.equal(animation.playState, "paused");
});

test("hover, keyboard focus and page visibility compose without premature resuming", async () => {
  const env = await setup(); const animation = env.animations[0];
  env.enter(true);
  env.emit(env.region, "pointerenter", { pointerType: "mouse" });
  assert.equal(animation.playState, "paused");
  env.emit(env.region, "focusin");
  env.emit(env.region, "pointerleave");
  assert.equal(animation.playState, "paused", "keyboard focus still holds the pause");
  env.document.hidden = true; env.emit(env.document, "visibilitychange");
  env.emit(env.region, "focusout", { relatedTarget: null });
  assert.equal(animation.playState, "paused", "hidden pages never resume");
  env.document.hidden = false; env.emit(env.document, "visibilitychange");
  assert.equal(animation.playState, "running");
  env.emit(env.region, "focusin");
  env.emit(env.region, "focusout", { relatedTarget: env.link });
  assert.equal(animation.playState, "paused", "the full-timeline link is inside the same region");
});

test("resizing preserves scroll distance and reduced motion exposes static content", async () => {
  const env = await setup(); env.enter(true);
  const old = env.animations[0]; old.currentTime = 40000;
  env.resize(1600);
  assert.equal(old.playState, "idle");
  const current = env.animations[1];
  assert.equal(current.currentTime, 40000, "the travelled 480px is preserved");
  assert.equal(current.playState, "running");
  env.media.matches = true; env.emit(env.media, "change");
  assert.equal(current.playState, "idle");
  assert.equal(env.status.hidden, true);
  assert.equal(env.appended.length, 2, "accessible original content remains in the DOM");
  const reduced = await setup({ reduced: true });
  reduced.enter(true);
  assert.equal(reduced.animations.length, 0);
});

test("a failed timeline request keeps the full timeline fallback usable", async () => {
  const env = await setup({ failed: true });
  assert.equal(env.animations.length, 0);
  assert.match(env.status.textContent, /full timeline/);
  const home = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(home, /class="text-link timeline-preview-link" href="timeline.html"/);
});
