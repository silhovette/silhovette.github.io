/* Shared by the original, self-contained renderers. Standalone mode is unchanged. */
const mcViewer = (() => {
  const embed = new URLSearchParams(location.search).get('embed') === '1';
  // Local files have opaque message origins ("null" in Chromium), which do
  // not match location.origin. Only file previews need a wildcard target;
  // the receiver still verifies the exact parent/iframe WindowProxy below.
  const localPreview = location.protocol === 'file:';
  const targetOrigin = localPreview ? '*' : location.origin;
  const acceptsOrigin = origin => localPreview
    ? origin === 'null' || origin === 'file://'
    : origin === location.origin;
  let active = !embed, pending = null, renderer = null, frame = null, last = -Infinity;
  const schedule = () => {
    if (frame !== null || !active || document.hidden || !pending) return;
    frame = requestAnimationFrame(now => {
      frame = null;
      const callback = pending;
      pending = null;
      callback(now);
    });
  };
  if (embed) {
    document.documentElement.classList.add('mc-embed');
    const style = document.createElement('style');
    style.textContent = `html.mc-embed {color-scheme:normal!important}
      html.mc-embed, .mc-embed body, .mc-embed #viewer, .mc-embed canvas {background:transparent!important}
      html.mc-embed,.mc-embed body {overscroll-behavior:auto!important}
      .mc-embed .hint {display:none}
      .mc-embed #lighting-rig {width:66vw;height:26vw;top:83%;opacity:1}
      .mc-embed .light-ring {border-color:#fff}
      @media(pointer:coarse){.mc-embed body,.mc-embed #viewer{touch-action:pan-y}}`;
    document.head.append(style);
    // Suppress only the standalone zoom listener. Leaving the wheel's default
    // action intact lets the browser chain scrolling into the containing page,
    // including its native wheel smoothing and trackpad momentum.
    addEventListener('wheel', event => {
      event.stopImmediatePropagation();
    }, {capture:true, passive:true});
    // Embed mode deliberately has no zoom: each complete model keeps its framing.
    for (const type of ['dblclick','keydown']) addEventListener(type, event => {
      event.stopImmediatePropagation();
    }, true);
    addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse') event.stopImmediatePropagation();
    }, true);
    addEventListener('message', event => {
      if (event.source !== parent || !acceptsOrigin(event.origin) ||
          event.data?.type !== 'mc-viewer-visibility') return;
      active = event.data.active === true;
      if (!active && frame !== null) { cancelAnimationFrame(frame); frame = null; }
      schedule();
    });
    parent.postMessage({type:'mc-viewer-ready'}, targetOrigin);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame !== null) { cancelAnimationFrame(frame); frame = null; }
    else schedule();
  });
  return {
    embed,
    request(callback) {
      renderer = pending = callback;
      schedule();
    },
    tick(now) {
      if (!embed) return true;
      const interval = 1000/60, elapsed = now-last;
      if (elapsed < interval-.5) { this.request(renderer); return false; }
      // Preserve cadence instead of accumulating rAF rounding error. Keep the
      // same rotation speed while presenting up to 60 frames per second.
      last = Number.isFinite(last) && elapsed < interval*2
        ? now-Math.max(0,elapsed-interval) : now;
      return true;
    }
  };
})();
