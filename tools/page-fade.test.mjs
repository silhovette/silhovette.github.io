import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const pages = ["index.html", "works.html", "timeline.html", "playground.html"];
const read = name => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const html = read(pages[0]);
const bootstrap = html.match(/<script id="page-fade-init">([\s\S]*?)<\/script>/)[1];
const style = html.match(/<style id="page-fade-style">([\s\S]*?)<\/style>/)[1];
const loader = read("page-fade.js");

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function environment({ reduced = false, images = [], width = 1440, fontReady = Promise.resolve() } = {}) {
  const attributes = new Map([["data-page-fade", "complete"]]);
  const root = {
    getAttribute: name => attributes.get(name),
    setAttribute: (name, value) => attributes.set(name, value),
  };
  const document = Object.assign(new EventTarget(), {
    documentElement: root, readyState: "loading", images,
    fonts: { ready: fontReady },
  });
  const window = new EventTarget();
  const motion = Object.assign(new EventTarget(), { matches: reduced });
  const timers = new Map(), frames = [];
  let now = 0, id = 0;
  const context = vm.createContext({
    document, Event, innerWidth: width, innerHeight: 844,
    matchMedia: () => motion,
    addEventListener: window.addEventListener.bind(window),
    setTimeout: (callback, ms) => { timers.set(++id, { at: now + ms, callback }); return id; },
    clearTimeout: key => timers.delete(key),
    requestAnimationFrame: callback => frames.push(callback),
  });
  const run = code => vm.runInContext(code, context);
  const emit = (target, name, props = {}) => target.dispatchEvent(Object.assign(new Event(name), props));
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  const frame = async () => { frames.splice(0).forEach(callback => callback(now)); await flush(); };
  const advance = ms => {
    const until = now + ms;
    while (true) {
      const next = [...timers.entries()].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      const [key, timer] = next;
      now = timer.at; timers.delete(key); timer.callback();
    }
    now = until;
  };
  return { run, emit, document, window, motion, frame, flush, advance,
    state: () => root.getAttribute("data-page-fade"),
    domReady: () => { document.readyState = "interactive"; emit(document, "DOMContentLoaded"); },
  };
}

test("four pages share the early, fail-open bootstrap and opacity-only fade", () => {
  for (const page of pages) {
    const source = read(page);
    assert.match(source, /<html lang="en" data-page-fade="complete">/);
    assert.equal(source.match(/<script id="page-fade-init">([\s\S]*?)<\/script>/)[1], bootstrap);
    assert.equal(source.match(/<style id="page-fade-style">([\s\S]*?)<\/style>/)[1], style);
    assert.ok(source.indexOf('id="page-fade-init"') < source.indexOf('rel="stylesheet"'));
    assert.equal(source.match(/src="page-fade.js\?v=1"/g).length, 1);
  }
  assert.match(style, /background: #f5f3ec/);
  assert.match(style, /opacity 700ms cubic-bezier\(0.22, 1, 0.36, 1\)/);
  assert.doesNotMatch(style, /transform|filter|translate|scale/);
});

test("ready fonts and first-screen images reveal the entire page exactly once", async () => {
  for (const width of [390, 1440]) {
    const font = deferred(), image = deferred();
    let decoded = 0;
    const visibleImage = {
      currentSrc: "hero.webp", loading: "lazy",
      getBoundingClientRect: () => ({ top: 200, bottom: 400, left: 20, right: 320, width: 300, height: 200 }),
      decode: () => { decoded++; return image.promise; },
    };
    const offscreenImage = {
      currentSrc: "later.webp", loading: "lazy",
      getBoundingClientRect: () => ({ top: 1800, bottom: 2000, left: 0, right: 200, width: 200, height: 200 }),
      decode: () => { throw new Error("offscreen images must not be decoded or awaited"); },
    };
    const env = environment({ width, fontReady: font.promise, images: [visibleImage, offscreenImage] });
    env.run(bootstrap); env.run(loader);
    assert.equal(env.state(), "pending");
    await env.frame();
    assert.equal(decoded, 0, "wait until deferred page scripts and DOM are ready");
    env.domReady(); await env.frame();
    assert.equal(decoded, 1);
    font.resolve(); await env.flush(); await env.frame();
    assert.equal(env.state(), "pending", "visible image is still decoding");
    image.resolve(); await env.flush(); await env.frame();
    assert.equal(env.state(), "revealing");
    env.advance(700);
    assert.equal(env.state(), "complete");
    for (const event of ["hashchange", "scroll", "resize", "site-language-change"]) {
      env.emit(env.window, event);
      env.emit(env.document, event);
    }
    env.emit(env.document, "page-fade-ready");
    env.advance(3000);
    assert.equal(env.state(), "complete", "ordinary interactions must not replay the fade");
  }
});

test("missing loader or stalled fonts cannot leave a blank page", async () => {
  for (const missingLoader of [true, false]) {
    const font = deferred();
    const env = environment({ fontReady: font.promise });
    env.run(bootstrap);
    if (!missingLoader) {
      env.run(loader); env.domReady(); await env.frame();
    }
    env.advance(1799); assert.equal(env.state(), "pending");
    env.advance(1); assert.equal(env.state(), "revealing");
    env.advance(700); assert.equal(env.state(), "complete");
    font.resolve(); await env.flush(); await env.frame();
    assert.equal(env.state(), "complete", "late resources cannot hide the page again");
  }
});

test("failed image decode still reveals the page", async () => {
  const env = environment({ images: [{
    currentSrc: "broken.webp",
    getBoundingClientRect: () => ({ top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100 }),
    decode: () => Promise.reject(new Error("image unavailable")),
  }] });
  env.run(bootstrap); env.run(loader); env.domReady();
  await env.frame(); await env.frame();
  assert.equal(env.state(), "revealing");
});

test("reduced motion, live preference changes and history restore show immediately", async () => {
  const reduced = environment({ reduced: true });
  reduced.run(bootstrap); reduced.run(loader); reduced.domReady();
  await reduced.frame();
  assert.equal(reduced.state(), "complete");
  for (const event of ["preference", "restore"]) {
    const env = environment(); env.run(bootstrap);
    if (event === "preference") env.emit(env.motion, "change", { matches: true });
    else env.emit(env.window, "pageshow", { persisted: true });
    assert.equal(env.state(), "complete");
    env.advance(3000);
    assert.equal(env.state(), "complete");
  }
});

test("without JavaScript the initial HTML state remains visible", () => {
  const env = environment();
  assert.equal(env.state(), "complete");
  assert.doesNotMatch(style, /page-fade="complete"\]\s+body\s*\{\s*opacity:\s*0/);
});
