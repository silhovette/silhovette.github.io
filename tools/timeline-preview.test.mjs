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
  let enter, resize, height = 1200, now = 0, id = 0;
  const frames = new Map(), appended = [], errors = [];
  const status = { hidden: false };
  const track = { style: {}, append: (...nodes) => appended.push(...nodes), querySelectorAll: () => [] };
  const viewport = Object.assign(new EventTarget(), {
    scrollTop: 0, clientHeight: 300,
    get offsetHeight() { return this.clientHeight + 1; },
    getBoundingClientRect() { return { height: this.offsetHeight * 0.8 }; },
    querySelector: selector => selector.includes('track') ? track : status,
  });
  const sequence = {
    get offsetHeight() { return height; }, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ top: 0, height: height * 0.8 }),
    nextElementSibling: { getBoundingClientRect: () => ({ top: (height + viewport.clientHeight * 1.2) * 0.8 }) },
    cloneNode: () => ({ setAttribute(name, value) { this[name] = value; } }),
  };
  const fonts = Object.assign(new EventTarget(), { ready: Promise.resolve() });
  const document = Object.assign(new EventTarget(), {
    hidden: false, fonts, querySelector: () => viewport, importNode: () => sequence,
  });
  const window = Object.assign(new EventTarget(), { siteTimelineMarkup: missing ? '' : markup });
  const media = Object.assign(new EventTarget(), { matches: reduced });
  class Observer { constructor(callback) { enter = callback; } observe() {} }
  window.IntersectionObserver = Observer;
  vm.runInNewContext(script, {
    console: { error: (...args) => errors.push(args) }, window, document, matchMedia: () => media,
    IntersectionObserver: Observer, addEventListener: window.addEventListener.bind(window),
    ResizeObserver: class { constructor(callback) { resize = callback; } observe() {} },
    requestAnimationFrame: callback => { frames.set(++id, callback); return id; },
    cancelAnimationFrame: key => frames.delete(key),
    DOMParser: class { parseFromString(html) {
      assert.equal(html, '<ol>' + window.siteTimelineMarkup + '</ol>');
      return { querySelector: () => ({ children: new Array(14) }) };
    } },
  });
  await new Promise(resolve => setImmediate(resolve));
  const emit = (target, type, values = {}) => {
    const event = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries(values)) Object.defineProperty(event, key, { value });
    target.dispatchEvent(event);
    return event;
  };
  const step = (ms = 16) => {
    now += ms;
    assert.ok(frames.size <= 1, 'only one RAF chain');
    const pending = [...frames.values()]; frames.clear();
    pending.forEach(callback => callback(now));
  };
  const advance = ms => { while (ms > 0) { const dt = Math.min(16, ms); step(dt); ms -= dt; } };
  const phase = () => -Number(/translate3d\(0, ([-\d.]+)px/.exec(track.style.transform)?.[1]) - (height + viewport.clientHeight * 1.2);
  return { status, viewport, track, document, media, window, appended, sequence, frames, errors, emit, step, advance, phase,
    cycle: () => height + viewport.clientHeight * 1.2,
    wheel: delta => emit(viewport, 'wheel', { deltaY: delta, deltaMode: 0 }),
    enter: state => enter([{ isIntersecting: state }]),
    resize: (value, viewportHeight = viewport.clientHeight) => { height = value; viewport.clientHeight = viewportHeight; resize(); },
    setHeight: value => { height = value; },
  };
}
const near = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
const modulo = (value, cycle) => ((value % cycle) + cycle) % cycle;

test('three periodic copies, one accessible list, 1.2 viewport gap and constant auto speed', async () => {
  const e = await setup();
  assert.equal(e.errors.length, 0);
  assert.equal(e.appended.length, 3);
  assert.equal(e.appended[1], e.sequence);
  for (const i of [0, 2]) { assert.equal(e.appended[i]['aria-hidden'], 'true'); assert.equal(e.appended[i].inert, true); }
  assert.equal(e.track.style.gap, '360px');
  near(e.phase(), 0);
  assert.equal(e.frames.size, 0);
  e.enter(true); e.step(); e.advance(1000); near(e.phase(), 12);
  e.advance(1000); near(e.phase(), 24);
  assert.equal(e.viewport.scrollTop, 0, 'normal motion never uses scrollTop');
});

test('automatic loops cross both list ends without any non-periodic displacement', async () => {
  const e = await setup(); e.enter(true); e.step();
  let previous = e.phase(), wraps = 0;
  for (let i = 0; i < 18000; i++) {
    e.step(50);
    const current = e.phase();
    near(modulo(current - previous, e.cycle()), 0.6, 1e-7);
    if (current < previous) wraps++;
    previous = current;
  }
  assert.ok(wraps >= 6);
});

test('wheel reverses across the seam and handles many full turns with one shared position', async () => {
  const e = await setup(); e.enter(true); e.step();
  const start = e.phase();
  assert.equal(e.wheel(-80).defaultPrevented, true);
  near(e.phase(), start, 1e-8, 'wheel is interpolated, not applied as a jump');
  e.advance(600);
  near(e.phase(), modulo(start - 80 * (1 - Math.exp(-600 / 85)), e.cycle()), 1e-6);
  assert.equal(e.viewport.scrollTop, 0);
  for (const delta of [e.cycle() * 7 + 45, -e.cycle() * 11 - 90]) {
    // Settle the previous input while keeping the quiet interval active.
    for (let i = 0; i < 8; i++) { e.wheel(1e-9); e.advance(600); }
    const before = e.phase();
    e.wheel(delta); e.advance(600);
    near(e.phase(), modulo(before + delta * (1 - Math.exp(-600 / 85)), e.cycle()), 1e-5);
  }
});

test('last node clears the viewport before the next first node enters', async () => {
  const e = await setup(); e.enter(true); e.step();
  e.wheel(1240); e.advance(600);
  const phase = e.phase(), height = 1200, view = 300;
  assert.ok(phase > height && phase < e.cycle() - view, 'the full viewport is in the inter-cycle gap');
  const visibleLists = [0, 1, 2].filter(index => {
    const top = index * e.cycle() - e.cycle() - phase;
    return top < view && top + height > 0;
  });
  assert.equal(visibleLists.length, 0, 'no list or axis remains in the blank interval');
});

test('wheel quiet period blends back into upward auto motion without a reset', async () => {
  const e = await setup(); e.enter(true); e.step();
  e.wheel(1e-9); const start = e.phase(); e.advance(600); near(e.phase(), start, 1e-6);
  e.advance(104); const rampStart = e.phase();
  e.advance(100); const first = modulo(e.phase() - rampStart, e.cycle());
  assert.ok(first > 0 && first < 1.2, 'automatic speed ramps up');
  e.advance(2500); const steadyStart = e.phase(); e.advance(1000);
  near(modulo(e.phase() - steadyStart, e.cycle()), 12, 0.02);
});

test('offscreen, background and printing pause without advancing the animation clock', async () => {
  const e = await setup(); e.enter(true); e.step(); e.advance(2000);
  for (const pause of ['hidden', 'offscreen', 'print']) {
    const before = e.phase();
    if (pause === 'hidden') { e.document.hidden = true; e.emit(e.document, 'visibilitychange'); }
    if (pause === 'offscreen') e.enter(false);
    if (pause === 'print') e.emit(e.window, 'beforeprint');
    assert.equal(e.frames.size, 0); e.step(300000);
    if (pause === 'hidden') { e.document.hidden = false; e.emit(e.document, 'visibilitychange'); }
    if (pause === 'offscreen') e.enter(true);
    if (pause === 'print') e.emit(e.window, 'afterprint');
    near(e.phase(), before); e.step(300000); near(e.phase(), before);
    e.advance(1000); near(e.phase(), modulo(before + 12, e.cycle()));
  }
});

test('resize, language changes and font loads retain fractional loop progress', async () => {
  const e = await setup(); e.enter(true); e.step(); e.advance(10000);
  const progress = e.phase() / e.cycle();
  e.resize(1600.375, 400); near(e.phase() / e.cycle(), progress); assert.equal(e.track.style.gap, '480px');
  e.setHeight(1800); e.emit(e.document, 'site-language-change'); near(e.phase() / e.cycle(), progress);
  e.setHeight(1900); e.emit(e.document.fonts, 'loadingdone'); near(e.phase() / e.cycle(), progress);
});

test('reduced motion uses native scrolling and keeps the saved loop progress', async () => {
  const e = await setup(); e.enter(true); e.step(); e.advance(1000); const before = e.phase();
  e.media.matches = true; e.emit(e.media, 'change');
  assert.equal(e.frames.size, 0); assert.equal(e.track.style.transform, '');
  assert.equal(e.wheel(40).defaultPrevented, false);
  e.viewport.scrollTop = 120;
  e.media.matches = false; e.emit(e.media, 'change');
  near(e.phase(), before); assert.equal(e.viewport.scrollTop, 0);
  const initial = await setup({ reduced: true }); initial.enter(true); assert.equal(initial.frames.size, 0);
});

test('missing data hides the loading message and preserves the full timeline link', async () => {
  const e = await setup({ missing: true });
  assert.equal(e.frames.size, 0); assert.equal(e.status.hidden, true);
  const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(home, /class="timeline-preview-window"[^>]+href="timeline\.html"/);
});

test('all 14 events remain shared with the unchanged standalone timeline page', () => {
  const list = { innerHTML: '' };
  vm.runInNewContext(eventsScript, { window: {}, document: { querySelector: () => list } });
  assert.equal(list.innerHTML, markup); assert.equal((markup.match(/<li(?:>| )/g) || []).length, 14);
  assert.match(markup, /2012–2017/); assert.match(markup, /timeline_present/);
  for (const file of ['index.html', 'timeline.html']) {
    const html = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    assert.ok(html.indexOf('timeline-events.js') < html.indexOf('languages.js'));
  }
});
