import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const script = readFileSync(new URL("../timeline-preview.js", import.meta.url), "utf8");
const eventsScript = readFileSync(new URL("../timeline-events.js", import.meta.url), "utf8");
const shared = { window: {}, document: { querySelector: () => null } };
vm.runInNewContext(eventsScript, shared);
const markup = shared.window.siteTimelineMarkup;
async function setup({ reduced = false, missing = false } = {}) {
  let enter, resize, height = 1200;
  const animations = [], appended = [];
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
  const viewport = Object.assign(new EventTarget(), {
    scrollTop: 0, clientHeight: 300,
    querySelector: selector => selector.includes("track") ? track : status,
  });
  const sequence = {
    get offsetHeight() { return height; }, querySelectorAll: () => [],
    cloneNode: () => ({ setAttribute(name, value) { this[name] = value; } }),
  };
  const document = Object.assign(new EventTarget(), {
    hidden: false, querySelector: () => viewport, importNode: () => sequence,
  });
  const window = Object.assign(new EventTarget(), { siteTimelineMarkup: missing ? "" : markup });
  const media = Object.assign(new EventTarget(), { matches: reduced });
  class Observer { constructor(callback) { enter = callback; } observe() {} }
  window.IntersectionObserver = Observer;
  vm.runInNewContext(script, {
    console: { error() {} }, window, document, matchMedia: () => media, IntersectionObserver: Observer,
    addEventListener: window.addEventListener.bind(window),
    ResizeObserver: class { constructor(callback) { resize = callback; } observe() {} },
    DOMParser: class { parseFromString(html) {
      assert.equal(html, "<ol>" + window.siteTimelineMarkup + "</ol>", "both pages use the same complete local event data");
      return { querySelector: () => ({ children: new Array(13) }) };
    } },
    fetch: () => { throw new Error("Timeline must work without network requests, including file://"); },
  });
  await new Promise(resolve => setImmediate(resolve));
  const emit = (target, type, values = {}) => {
    const event = new Event(type);
    for (const [key, value] of Object.entries(values)) Object.defineProperty(event, key, { value });
    target.dispatchEvent(event);
  };
  return { link, status, viewport, track, document, media, window, animations, appended, emit,
    enter: visible => enter([{ isIntersecting: visible }]),
    resize: value => { height = value; resize(); },
  };
}

test("the canonical list has one visual clone and stays paused outside the viewport", async () => {
  const env = await setup();
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

test("hover keeps the preview moving, wheel input stays inside it, and hidden pages pause", async () => {
  const env = await setup(); const animation = env.animations[0];
  env.enter(true);
  assert.equal(animation.playState, "running");
  env.emit(env.viewport, "wheel", { deltaY: 40, deltaMode: 0, preventDefault() {} });
  assert.equal(env.viewport.scrollTop, 40);
  env.document.hidden = true; env.emit(env.document, "visibilitychange");
  assert.equal(animation.playState, "paused", "hidden pages never resume");
  env.document.hidden = false; env.emit(env.document, "visibilitychange");
  assert.equal(animation.playState, "running");
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

test("missing data never displays the removed placeholder sentence", async () => {
  const env = await setup({ missing: true });
  assert.equal(env.animations.length, 0);
  assert.equal(env.status.hidden, true);
  const home = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(home, /class="timeline-preview-window"[^>]+href="timeline\.html"/);
  assert.doesNotMatch(home, /timeline-preview-link/);
});

test("all 13 events are mounted before standalone timeline interactions and language setup", () => {
  const list = { innerHTML: "" };
  vm.runInNewContext(eventsScript, { window: {}, document: { querySelector: () => list } });
  assert.equal(list.innerHTML, markup);
  assert.equal((markup.match(/<li(?:>| )/g) || []).length, 13);
  assert.match(markup, /2012–2017/);
  assert.match(markup, /timeline_present/);
  for (const file of ["index.html", "timeline.html"]) {
    const html = readFileSync(new URL("../" + file, import.meta.url), "utf8");
    assert.ok(html.indexOf("timeline-events.js") < html.indexOf("languages.js"));
    assert.ok(html.indexOf("timeline-events.js") < html.indexOf(file === "index.html" ? "timeline-preview.js" : "timeline.js"));
  }
});
