const setupPanel = document.querySelector("#setupPanel");
const $ = (selector) => document.querySelector(selector);
const loadingScreen = $("#loadingScreen");
const loadingProgress = $("#loadingProgress");
const gamePanel = $("#gamePanel");
const setupForm = $("#setupForm");
const bpmInput = $("#bpmInput");
const speedInput = $("#speedInput");
const densityInput = $("#densityInput");
const totalNotesInput = $("#totalNotesInput");
const beatDivisionInputs = [...document.querySelectorAll('input[name="beatDivision"]')];
const laneInputs = [...document.querySelectorAll('input[name="lanes"]')];
const avatarInput = $("#avatarInput");
const avatarImage = $("#avatarImage");
const avatarFallback = $("#avatarFallback");
const nicknameInput = $("#nicknameInput");
const ratingText = $("#ratingText");
const appSettingsButton = $("#appSettingsButton");
const settingsButton = $("#settingsButton");
const achievementsButton = $("#achievementsButton");
const appSettingsDialog = $("#appSettingsDialog");
const achievementsDialog = $("#achievementsDialog");
const achievementList = $("#achievementList");
const achievementToast = $("#achievementToast");
const autoplayToggle = $("#autoplayToggle");
const metronomeToggle = $("#metronomeToggle");
const offsetControl = $("#offsetControl");
const offsetSlider = $("#offsetSlider");
const offsetInput = $("#offsetInput");
const bindLaneButtons = [...document.querySelectorAll(".bind-lane-option")];
const settingsDialog = $("#settingsDialog");
const bindList = $("#bindList");
const resetBindsButton = $("#resetBindsButton");
const backButton = $("#backButton");
const pauseButton = $("#pauseButton");
const scoreText = $("#scoreText");
const comboText = $("#comboText");
const accuracyText = $("#accuracyText");
const judgementText = $("#judgementText");
const countdownText = $("#countdownText");
const setupParticleCanvas = $("#setupParticleCanvas");
const setupParticleCtx = setupParticleCanvas.getContext("2d");
const canvas = $("#gameCanvas");
const ctx = canvas.getContext("2d");
const particleCanvas = $("#particleCanvas");
const particleCtx = particleCanvas.getContext("2d");
const beatIndicator = $("#beatIndicator");
const resultPanel = $("#resultPanel");
const resultCanvas = $("#resultCanvas");
const resultCtx = resultCanvas.getContext("2d");
const perfectCount = $("#perfectCount");
const greatCount = $("#greatCount");
const goodCount = $("#goodCount");
const missCount = $("#missCount");
const resultAcc = $("#resultAcc");
const resultCombo = $("#resultCombo");
const resultRatingGain = $("#resultRatingGain");
const resultAutoplay = $("#resultAutoplay");
const retryButton = $("#retryButton");
const titleButton = $("#titleButton");

const SAVE_VERSION = 1;
const DEFAULT_PROFILE = { nickname: "Player", avatar: "", rating: 0, achievements: [] };
const RATING_THRESHOLDS = [10, 50, 100, 500, 1000];
const PERFECT_DENSITIES = [15, 20, 30, 40];
const PREMIUM_ACHIEVEMENTS = new Set(["rating_1000", "perfect_density_40", "perfect_density_30"]);
const BLUE_GLOW_ACHIEVEMENTS = new Set(["almost_perfect_miss", "almost_perfect_great"]);
const ACHIEVEMENTS = [
  { id: "first_play", icon: "play", name: "初次脉冲", desc: "欢迎来到 Falling Pulse！" },
  { id: "rating_10", icon: "rating-1", name: "慢慢来", desc: "rating 达到 10.00。" },
  { id: "rating_50", icon: "rating-2", name: "日积跬步", desc: "rating 达到 50.00。" },
  { id: "rating_100", icon: "rating-3", name: "节拍熟手", desc: "rating 达到 100.00。" },
  { id: "rating_500", icon: "rating-4", name: "势不可挡", desc: "rating 达到 500.00。" },
  { id: "rating_1000", icon: "rating-5", name: "脉冲之光", desc: "rating 达到 1000.00。" },
  { id: "perfect_song", icon: "perfect", name: "All Perfect!", desc: "以 100% ACC 完成一首歌。" },
  { id: "perfect_density_15", icon: "density-1", name: "入门了...吗", desc: "100% 完成难度 15 及以上的歌。" },
  { id: "perfect_density_20", icon: "density-2", name: "准度推进", desc: "100% 完成难度 20 及以上的歌。" },
  { id: "perfect_density_30", icon: "density-3", name: "准度压制", desc: "100% 完成难度 30 及以上的歌。" },
  { id: "perfect_density_40", icon: "density-4", name: "准度传说", desc: "100% 完成难度 40 及以上的歌。" },
  { id: "almost_perfect_miss", icon: "secret-miss", name: "功败垂成", desc: "以 1 MISS 结算。", hidden: true },
  { id: "almost_perfect_great", icon: "secret-great", name: "你好", desc: "以 1 GREAT 结算。", hidden: true },
];
const DEFAULT_BINDS = {
  4: ["KeyD", "KeyF", "KeyJ", "KeyK"],
  5: ["KeyD", "KeyF", "KeyJ", "KeyK", "KeyL"],
  6: ["KeyS", "KeyD", "KeyF", "KeyJ", "KeyK", "KeyL"],
};
const JUDGE_WINDOWS = [
  { name: "PERFECT", ms: 60, score: 1000, weight: 1, color: "#45d0b5" },
  { name: "GREAT", ms: 100, score: 700, weight: 0.7, color: "#8fc8ff" },
  { name: "GOOD", ms: 160, score: 420, weight: 0.42, color: "#ffb35c" },
];
const MISS_MS = 160;
const MISS_COMMIT_MS = 280;
const HIT_LINE_RATIO = 0.84;
const MIN_CHART_BEATS = 12;
const BEAT_PROMPT_AUDIO_SRC = "sfx/clip-1779549241012.mp3";
const BEAT_PROMPT_VOLUME = 0.35;
const LANE_FLASH_MS = 170;
const LANE_FLASH_BASE_ALPHA = 0.035;
const LANE_FLASH_EXTRA_ALPHA = 0.085;
const BEAT_GRID_TICKS = 24;
const BEAT_DIVISION_TICK_STEPS = new Map([
  [4, 24],
  [8, 12],
  [16, 6],
  [24, 4],
  [32, 3],
]);
const UI_FONT = `"Segoe UI Variable Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
const fullCircle = Math.PI * 2;
const JUDGEMENT_HOLD_MS = 360;
const FINAL_JUDGEMENT_HOLD_MS = 800;
const FINAL_JUDGEMENT_FADE_MS = 180;

let bindings = normalizeBindings();
let userProfile = normalizeProfile();
let saveData = createSaveData();
let activeLaneCount = 4;
let listeningLane = null;
let savedLaneCountForBindSettings = null;
let rafId = 0;
let state = null;
let lastConfig = null;
let lastFrameTime = 0;
let judgementTimer = 0;
let judgementFadeAfterTimer = false;
let countdownTimer = 0;
let particles = [];
let setupParticles = [];
let particleScratch = [];
let setupParticleScratch = [];
let visibleNoteStart = 0;
let particlePulse = 0;
let particlePulseTarget = 0;
let autoplayEnabled = false;
let metronomeEnabled = true;
let noteOffsetMs = 0;
let achievementToastTimer = 0;
let lastCountdownText = "";
const activeBeatPromptSounds = new Set();
const activeBeatPromptSources = new Set();
const activeBeatPromptTimers = new Set();
let beatPromptAudioContext = null;
let beatPromptAudioBuffer = null;
let beatPromptAudioLoading = null;
let beatPromptAudioLoadedSrc = "";

function formatRating(value) {
  return Number(value).toFixed(2);
}

function updateAvatarFallback() {
  avatarFallback.textContent = (userProfile.nickname.trim()[0] || "U").toUpperCase();
}

function normalizeProfile(stored = {}) {
  return {
    nickname: typeof stored?.nickname === "string" && stored.nickname.trim() ? stored.nickname.trim() : DEFAULT_PROFILE.nickname,
    avatar: typeof stored?.avatar === "string" ? stored.avatar : DEFAULT_PROFILE.avatar,
    rating: Number.isFinite(Number(stored?.rating)) ? Number(stored.rating) : DEFAULT_PROFILE.rating,
    achievements: Array.isArray(stored?.achievements) ? [...new Set(stored.achievements.filter((id) => typeof id === "string"))] : [],
  };
}

function saveProfile() {
  userProfile = normalizeProfile(userProfile);
  refreshSaveData();
}

function renderProfile() {
  nicknameInput.value = userProfile.nickname;
  ratingText.textContent = formatRating(userProfile.rating);
  updateAvatarFallback();
  avatarImage.src = userProfile.avatar || "";
  avatarImage.classList.toggle("show", Boolean(userProfile.avatar));
}

function achievementById(id) {
  return ACHIEVEMENTS.find((item) => item.id === id);
}

function unlockAchievement(id) {
  if (userProfile.achievements.includes(id)) return false;
  userProfile.achievements.push(id);
  if (state) state.unlockedAchievements.push(id);
  return true;
}

function updateAchievements() {
  const unlocked = new Set(userProfile.achievements);
  achievementList.innerHTML = ACHIEVEMENTS.filter((item) => !item.hidden || unlocked.has(item.id)).map((item) => `
    <div class="achievement ${unlocked.has(item.id) ? "unlocked" : "locked"}">
      <span class="achievement-icon icon-${item.icon} ${achievementGlowClass(item.id, unlocked)}"></span>
      <div>
        <strong>${item.name}</strong>
        <span>${item.desc}</span>
      </div>
    </div>
  `).join("");
}

function isPremiumAchievement(id) {
  return PREMIUM_ACHIEVEMENTS.has(id);
}

function achievementGlowClass(id, unlocked) {
  if (!unlocked.has(id)) return "";
  if (isPremiumAchievement(id)) return "premium-glow";
  if (BLUE_GLOW_ACHIEVEMENTS.has(id)) return "blue-glow";
  return "";
}

function showAchievementToast() {
  const items = state.unlockedAchievements.map(achievementById).filter(Boolean);
  state.unlockedAchievements = [];
  window.clearTimeout(achievementToastTimer);
  achievementToast.classList.remove("show");
  achievementToast.innerHTML = "";
  if (!items.length) return;

  achievementToast.innerHTML = `
    <div class="achievement-toast-title">成就解锁</div>
    ${items.map((item) => `
      <div class="achievement-toast-item">
        <span class="achievement-icon icon-${item.icon} ${achievementGlowClass(item.id, new Set(userProfile.achievements))}"></span>
        <div><strong>${item.name}</strong><span>${item.desc}</span></div>
      </div>
    `).join("")}
  `;
  requestAnimationFrame(() => achievementToast.classList.add("show"));
  achievementToastTimer = window.setTimeout(() => achievementToast.classList.remove("show"), 3000);
}

function checkRatingAchievements() {
  let changed = false;
  RATING_THRESHOLDS.forEach((value) => {
    if (userProfile.rating >= value) changed = unlockAchievement(`rating_${value}`) || changed;
  });
  return changed;
}

function checkResultAchievements() {
  if (state.autoplay) return false;
  let changed = unlockAchievement("first_play");
  changed = checkSecretResultAchievements() || changed;
  if (currentAccuracy() === 100) {
    changed = unlockAchievement("perfect_song") || changed;
    PERFECT_DENSITIES.forEach((density) => {
      if (state.density >= density) changed = unlockAchievement(`perfect_density_${density}`) || changed;
    });
  }
  return checkRatingAchievements() || changed;
}

function checkSecretResultAchievements() {
  const total = state.counts.perfect + state.counts.great + state.counts.good + state.counts.miss;
  if (total <= 1) return false;

  let changed = false;
  if (state.counts.perfect === total - 1 && state.counts.great === 0 && state.counts.good === 0 && state.counts.miss === 1) {
    changed = unlockAchievement("almost_perfect_miss") || changed;
  }
  if (state.counts.perfect === total - 1 && state.counts.great === 1 && state.counts.good === 0 && state.counts.miss === 0) {
    changed = unlockAchievement("almost_perfect_great") || changed;
  }
  return changed;
}

function normalizeBindings(stored = {}) {
  return Object.fromEntries(
    [4, 5, 6].map((count) => {
      const keys = Array.isArray(stored[count]) ? stored[count] : DEFAULT_BINDS[count];
      const merged = DEFAULT_BINDS[count].map((fallback, index) => keys[index] || fallback);
      return [count, merged];
    }),
  );
}

function saveBindings() {
  bindings = normalizeBindings(bindings);
  refreshSaveData();
}

function createSaveData(stored = {}) {
  return {
    version: SAVE_VERSION,
    profile: normalizeProfile(stored?.profile || userProfile),
    bindings: normalizeBindings(stored?.bindings || bindings),
    results: Array.isArray(stored?.results) ? stored.results.filter(Boolean) : [],
    updatedAt: typeof stored?.updatedAt === "string" ? stored.updatedAt : new Date(0).toISOString(),
  };
}

function refreshSaveData() {
  saveData = {
    ...saveData,
    version: SAVE_VERSION,
    profile: normalizeProfile(userProfile),
    bindings: normalizeBindings(bindings),
    updatedAt: new Date().toISOString(),
  };
  return saveData;
}

function initFileSave() {
  userProfile = normalizeProfile(DEFAULT_PROFILE);
  bindings = normalizeBindings();
  saveData = createSaveData({ profile: userProfile, bindings, results: [] });
  renderProfile();
  updateAchievements();
  renderBindList();
}

function keyLabel(code) {
  if (code === "Space") return "Space";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  return code.replace(/Arrow/, "");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mapSpeedLevel(level) {
  const normalized = clamp(level, 0, 20) / 20;
  return 0.55 + Math.pow(normalized, 1.08) * 8.3;
}

function runLoadingSequence() {
  if (!loadingScreen || !loadingProgress) {
    document.body.classList.add("is-loaded");
    return;
  }

  const start = performance.now();
  const isMobile = window.matchMedia("(max-width: 760px), (hover: none) and (pointer: coarse)").matches;
  const duration = isMobile ? 360 : 900;
  const loadedHoldMs = isMobile ? 80 : 140;

  function tick(now) {
    const progress = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    loadingProgress.style.transform = `scaleX(${eased})`;

    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }

    window.setTimeout(() => {
      document.body.classList.add("is-loaded");
      loadingScreen.addEventListener("animationend", () => loadingScreen.remove(), { once: true });
    }, loadedHoldMs);
  }

  requestAnimationFrame(tick);
}

function renderBindList() {
  const keys = bindings[activeLaneCount];
  bindList.innerHTML = "";
  keys.forEach((code, lane) => {
    const row = document.createElement("div");
    row.className = "bind-row";
    row.innerHTML = `
      <span>轨道 ${lane + 1}</span>
      <button class="bind-key" type="button" data-lane="${lane}">${keyLabel(code)}</button>
    `;
    bindList.append(row);
  });
}

function selectedBeatDivisions() {
  const selected = beatDivisionInputs
    .filter((input) => input.checked)
    .map((input) => Number(input.value))
    .filter((value) => BEAT_DIVISION_TICK_STEPS.has(value));
  if (selected.length) return selected;

  const quarterInput = beatDivisionInputs.find((input) => input.value === "4");
  if (quarterInput) quarterInput.checked = true;
  return [4];
}

function updateActiveLaneCount(forceRender = false) {
  const selectedLaneCount = Number(laneInputs.find((input) => input.checked)?.value) || activeLaneCount;
  if (!forceRender && selectedLaneCount === activeLaneCount) return;
  activeLaneCount = selectedLaneCount;
  renderBindList();
}

function resizeCanvas() {
  const renderScale = Number(window.__FALLING_PULSE_RENDER_SCALE) || window.devicePixelRatio || 5;
  const dpr = Math.min(renderScale, 2);
  resizeCanvasToDisplay(setupParticleCanvas, setupParticleCtx, dpr);
  resizeCanvasToDisplay(canvas, ctx, dpr);
  resizeCanvasToDisplay(particleCanvas, particleCtx, dpr);
  resizeCanvasToDisplay(resultCanvas, resultCtx, dpr);
}

function resizeCanvasToDisplay(targetCanvas, context, dpr) {
  const rect = targetCanvas.getBoundingClientRect();
  targetCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
  targetCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function buildAllowedBeatTicks(startBeat, endBeat, beatDivisions) {
  const startTick = Math.ceil(startBeat * BEAT_GRID_TICKS);
  const endTick = Math.floor(endBeat * BEAT_GRID_TICKS);
  const allowed = new Set();
  beatDivisions.forEach((division) => {
    const step = BEAT_DIVISION_TICK_STEPS.get(division);
    if (!step) return;
    for (let tick = Math.ceil(startTick / step) * step; tick <= endTick; tick += step) {
      allowed.add(tick);
    }
  });
  return [...allowed].sort((a, b) => a - b);
}

function nearestAllowedBeat(rawBeat, allowedTicks) {
  if (!allowedTicks.length) return rawBeat;
  const targetTick = rawBeat * BEAT_GRID_TICKS;
  let low = 0;
  let high = allowedTicks.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (allowedTicks[mid] < targetTick) low = mid + 1;
    else high = mid;
  }

  const right = allowedTicks[low];
  const left = allowedTicks[Math.max(0, low - 1)];
  return (Math.abs(left - targetTick) <= Math.abs(right - targetTick) ? left : right) / BEAT_GRID_TICKS;
}

function getChartCountInBeats(bpm) {
  return bpm >= 200 ? 8 : 4;
}

function generateChart({ bpm, lanes, density, totalNotes, beatDivisions = [4] }) {
  const beatMs = 60000 / bpm;
  const notes = [];
  const densityRatio = density / 20;
  const lanePush = (lanes - 4) * 0.08;
  const notesPerBeat = 0.8 + densityRatio * 3.2 + lanePush;
  const playableBeats = Math.max(MIN_CHART_BEATS - 4, Math.ceil(totalNotes / notesPerBeat));
  const selectedDivisions = beatDivisions.filter((division) => BEAT_DIVISION_TICK_STEPS.has(division));
  const chartStartBeat = getChartCountInBeats(bpm);
  const allowedBeatTicks = buildAllowedBeatTicks(chartStartBeat, chartStartBeat + playableBeats, selectedDivisions.length ? selectedDivisions : [4]);
  const finestGridStep = Math.min(...(selectedDivisions.length ? selectedDivisions : [4]).map((division) => BEAT_DIVISION_TICK_STEPS.get(division))) / BEAT_GRID_TICKS;
  const jitterRange = Math.min(finestGridStep * 0.48, playableBeats / Math.max(1, totalNotes) * 0.56);
  let lastLane = -1;
  let repeatCount = 0;
  const recentNotes = [];

  for (let index = 0; index < totalNotes; index += 1) {
    const progress = totalNotes === 1 ? 0 : index / (totalNotes - 1);
    const rawBeat = chartStartBeat + playableBeats * progress;
    const jitter = (Math.random() - 0.5) * jitterRange;
    const beat = nearestAllowedBeat(Math.max(chartStartBeat, Math.min(chartStartBeat + playableBeats, rawBeat + jitter)), allowedBeatTicks);
    const closeWindow = densityRatio > 1 ? 0.68 : 0.85;
    const closeLanes = new Set(recentNotes.filter((note) => beat - note.beat <= closeWindow).map((note) => note.lane));
    const availableLanes = [...Array(lanes).keys()].filter((laneIndex) => !closeLanes.has(laneIndex));
    let lane =
      availableLanes.length > 0
        ? availableLanes[Math.floor(Math.random() * availableLanes.length)]
        : Math.floor(Math.random() * lanes);

    if (lane === lastLane) {
      repeatCount += 1;
      if (repeatCount > 0 && lanes > 1) {
        const nonRepeatLanes = [...Array(lanes).keys()].filter((laneIndex) => laneIndex !== lastLane);
        lane = nonRepeatLanes[Math.floor(Math.random() * nonRepeatLanes.length)];
        repeatCount = 0;
      }
    } else {
      repeatCount = 0;
    }

    if (lanes > 2 && Math.random() < 0.18) {
      const widerOptions = [...Array(lanes).keys()].filter((laneIndex) => laneIndex !== lastLane);
      lane = widerOptions[Math.floor(Math.random() * widerOptions.length)];
    }

    notes.push({ lane, time: beat * beatMs + noteOffsetMs, judged: false, hit: false });
    recentNotes.push({ lane, beat });
    while (recentNotes.length && beat - recentNotes[0].beat > 1.1) recentNotes.shift();
    lastLane = lane;
  }

  notes.sort((a, b) => a.time - b.time || a.lane - b.lane);
  return notes;
}

function createParticles(count) {
  return Array.from({ length: count }, (_, index) => {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 0.52 + Math.random() * 0.54;
    return {
      theta,
      phi,
      radius,
      sinPhi: Math.sin(phi),
      cosPhi: Math.cos(phi),
      phase: Math.random() * Math.PI * 2,
      drift: 0.58 + Math.random() * 1.08,
      size: 1.2 + Math.random() * 2.3,
      wobble: 0.05 + Math.random() * 0.1,
      hueShift: index % 5,
      color:
        index % 5 === 0
          ? [255, 179, 92]
          : index % 5 === 1
            ? [143, 200, 255]
            : [69, 208, 181],
    };
  });
}

function initParticles() {
  particles = createParticles(150);
  particleScratch = Array.from({ length: particles.length }, () => ({}));
  particlePulse = 0;
  particlePulseTarget = 0;
}

function initSetupParticles() {
  setupParticles = createParticles(170);
  setupParticleScratch = Array.from({ length: setupParticles.length }, () => ({}));
}

function triggerParticlePulse(lane = 0) {
  if (!state) return;
  particlePulseTarget = Math.min(1, particlePulseTarget + 0.44);
}

function drawParticleSet({
  context,
  targetCanvas,
  sourceParticles,
  scratch,
  now,
  pulse = 0,
  scale = 0.32,
  alphaScale = 1,
  centerXRatio = 0.53,
  centerYRatio = 0.5,
}) {
  const width = targetCanvas.clientWidth;
  const height = targetCanvas.clientHeight;
  if (!width || !height) return;

  const time = now * 0.001;
  const centerX = width * centerXRatio;
  const centerY = height * centerYRatio;
  const baseScale = Math.min(width, height) * scale;
  const rotY = time * 0.26;
  const rotX = Math.sin(time * 0.31) * 0.4;
  const glowRadius = baseScale * (1.34 + pulse * 0.35);

  const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
  glow.addColorStop(0, `rgba(69, 208, 181, ${(0.12 + pulse * 0.18) * alphaScale})`);
  glow.addColorStop(0.38, `rgba(143, 200, 255, ${(0.05 + pulse * 0.1) * alphaScale})`);
  glow.addColorStop(1, "rgba(69, 208, 181, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const pulseSize = 1 + pulse * 0.8;

  for (let index = 0; index < sourceParticles.length; index += 1) {
    const particle = sourceParticles[index];
    const shapeNoise = 1 + Math.sin(time * particle.drift + particle.phase) * particle.wobble;
    const theta = particle.theta + time * (0.16 + particle.drift * 0.055);
    const radius = particle.radius * shapeNoise;
    const x = Math.cos(theta) * particle.sinPhi * radius;
    const y = particle.cosPhi * radius;
    const z = Math.sin(theta) * particle.sinPhi * radius;
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;
    const x1 = x * cosY + z1 * sinY;
    const z2 = -x * sinY + z1 * cosY;
    const perspective = 1.85 / (2.35 - z2);
    const point = scratch[index];
    point.x = centerX + x1 * baseScale * perspective;
    point.y = centerY + y1 * baseScale * perspective;
    point.z = z2;
    point.size = particle.size * perspective * pulseSize;
    point.alpha = Math.max(0.12, Math.min(1, 0.32 + perspective * 0.22 + pulse * 0.45)) * alphaScale;
    point.color = particle.color;
  }

  scratch.sort((a, b) => a.z - b.z);
  for (let index = 0; index < scratch.length; index += 1) {
    const point = scratch[index];
    const [r, g, b] = point.color;
    context.beginPath();
    context.fillStyle = `rgba(${r}, ${g}, ${b}, ${point.alpha})`;
    context.arc(point.x, point.y, point.size, 0, fullCircle);
    context.fill();
  }
}

function drawParticleCluster(now, delta) {
  const width = particleCanvas.clientWidth;
  const height = particleCanvas.clientHeight;
  if (!width || !height) return;

  const brightenEase = 1 - Math.exp(-delta / 82);
  const fadeEase = 1 - Math.exp(-delta / 260);
  particlePulseTarget *= Math.exp(-delta / 245);
  particlePulse += (particlePulseTarget - particlePulse) * (particlePulseTarget > particlePulse ? brightenEase : fadeEase);

  particleCtx.clearRect(0, 0, width, height);
  particleCtx.globalCompositeOperation = "lighter";
  drawParticleSet({
    context: particleCtx,
    targetCanvas: particleCanvas,
    sourceParticles: particles,
    scratch: particleScratch,
    now,
    pulse: particlePulse,
    scale: 0.39,
    alphaScale: 1,
  });

  particleCtx.globalCompositeOperation = "source-over";
}

function drawSetupParticles(now) {
  if (setupPanel.classList.contains("hidden")) return;
  const width = setupParticleCanvas.clientWidth;
  const height = setupParticleCanvas.clientHeight;
  if (!width || !height) return;

  setupParticleCtx.clearRect(0, 0, width, height);
  setupParticleCtx.globalCompositeOperation = "lighter";
  drawParticleSet({
    context: setupParticleCtx,
    targetCanvas: setupParticleCanvas,
    sourceParticles: setupParticles,
    scratch: setupParticleScratch,
    now,
    pulse: 0.08 + Math.sin(now * 0.0008) * 0.04,
    scale: 0.39,
    alphaScale: 0.9,
    centerXRatio: 0.5,
    centerYRatio: 0.5,
  });
  setupParticleCtx.globalCompositeOperation = "source-over";
}

function updateBeatIndicator(songTime) {
  if (!beatIndicator || !state || songTime < 0 || state.beatStopped) {
    if (beatIndicator) {
      beatIndicator.style.opacity = "0.28";
      beatIndicator.style.transform = "scale(0.84)";
      beatIndicator.style.boxShadow = "0 0 10px rgba(69, 208, 181, 0.22)";
    }
    return;
  }

  const beatMs = 60000 / state.bpm;
  const phase = ((songTime % beatMs) + beatMs) % beatMs;
  const pulse = Math.exp(-phase / Math.min(125, beatMs * 0.34));
  const opacity = 0.26 + pulse * 0.72;
  const scale = 0.84 + pulse * 0.42;
  const glow = 10 + pulse * 24;

  beatIndicator.style.opacity = opacity.toFixed(3);
  beatIndicator.style.transform = `scale(${scale.toFixed(3)})`;
  beatIndicator.style.boxShadow = `0 0 ${glow.toFixed(1)}px rgba(69, 208, 181, ${(
    0.22 + pulse * 0.58
  ).toFixed(3)})`;
}

function stopBeatPromptSounds() {
  for (const timer of activeBeatPromptTimers) clearTimeout(timer);
  activeBeatPromptTimers.clear();

  for (const source of activeBeatPromptSources) {
    try {
      source.stop();
    } catch {
      // Already stopped.
    }
  }
  activeBeatPromptSources.clear();

  for (const sound of activeBeatPromptSounds) {
    sound.pause();
    sound.removeAttribute("src");
    sound.load();
  }
  activeBeatPromptSounds.clear();
}

function resetNextBeatPromptIndex(songTime) {
  if (!state) return;
  const beatMs = 60000 / state.bpm;
  state.nextBeatPromptIndex = Math.max(0, Math.ceil(songTime / beatMs - 0.0001));
}

function getBeatPromptAudioContext() {
  if (beatPromptAudioContext) return beatPromptAudioContext;
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  beatPromptAudioContext = new AudioContextConstructor();
  return beatPromptAudioContext;
}

function prepareBeatPromptSound() {
  const volume = clamp(BEAT_PROMPT_VOLUME, 0, 1);
  if (!BEAT_PROMPT_AUDIO_SRC || volume <= 0) return Promise.resolve(null);
  if (beatPromptAudioBuffer && beatPromptAudioLoadedSrc === BEAT_PROMPT_AUDIO_SRC) {
    return Promise.resolve(beatPromptAudioBuffer);
  }
  if (beatPromptAudioLoading && beatPromptAudioLoadedSrc === BEAT_PROMPT_AUDIO_SRC) return beatPromptAudioLoading;

  const context = getBeatPromptAudioContext();
  if (!context) return Promise.resolve(null);
  beatPromptAudioLoadedSrc = BEAT_PROMPT_AUDIO_SRC;
  beatPromptAudioLoading = fetch(BEAT_PROMPT_AUDIO_SRC)
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load beat prompt audio: ${response.status}`);
      return response.arrayBuffer();
    })
    .then((buffer) => context.decodeAudioData(buffer))
    .then((audioBuffer) => {
      beatPromptAudioBuffer = audioBuffer;
      return audioBuffer;
    })
    .catch((error) => {
      console.warn(error);
      beatPromptAudioBuffer = null;
      return null;
    });
  return beatPromptAudioLoading;
}

function scheduleBeatPromptSound(delayMs = 0) {
  const volume = clamp(BEAT_PROMPT_VOLUME, 0, 1);
  if (!BEAT_PROMPT_AUDIO_SRC || volume <= 0) return;

  const context = getBeatPromptAudioContext();
  if (context && beatPromptAudioBuffer) {
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = beatPromptAudioBuffer;
    gain.gain.value = volume;
    source.connect(gain).connect(context.destination);
    activeBeatPromptSources.add(source);
    source.addEventListener("ended", () => activeBeatPromptSources.delete(source), { once: true });
    source.start(context.currentTime + Math.max(0, delayMs) / 1000);
    return;
  }

  if (delayMs > 1) {
    const timer = setTimeout(() => {
      activeBeatPromptTimers.delete(timer);
      scheduleBeatPromptSound(0);
    }, delayMs);
    activeBeatPromptTimers.add(timer);
    return;
  }

  const sound = new Audio(BEAT_PROMPT_AUDIO_SRC);
  sound.volume = volume;
  sound.preload = "auto";
  activeBeatPromptSounds.add(sound);

  const cleanup = () => activeBeatPromptSounds.delete(sound);
  sound.addEventListener("ended", cleanup, { once: true });
  sound.addEventListener("error", cleanup, { once: true });
  sound.play().catch(cleanup);
}

function updateBeatPrompt(songTime) {
  if (!metronomeEnabled || !state || state.beatStopped || state.beatPromptEndAt <= 0) return;

  const beatMs = 60000 / state.bpm;
  const currentBeatIndex = Math.max(0, Math.floor(songTime / beatMs + 0.0001));
  if (state.nextBeatPromptIndex < currentBeatIndex) state.nextBeatPromptIndex = currentBeatIndex;

  const scheduleAheadMs = Math.min(120, beatMs * 0.45);
  while (state.nextBeatPromptIndex * beatMs < state.beatPromptEndAt - 0.001) {
    const beatTime = state.nextBeatPromptIndex * beatMs;
    const delayMs = beatTime - songTime;
    if (delayMs > scheduleAheadMs) break;
    scheduleBeatPromptSound(delayMs);
    state.nextBeatPromptIndex += 1;
  }
}

function startGame(config) {
  cancelAnimationFrame(rafId);
  stopBeatPromptSounds();
  const beatPromptContext = getBeatPromptAudioContext();
  void beatPromptContext?.resume?.();
  void prepareBeatPromptSound();
  lastConfig = { ...config };
  setupPanel.classList.add("hidden");
  gamePanel.classList.remove("hidden");
  document.body.classList.add("game-active");
  resultPanel.classList.remove("show");
  achievementToast.classList.remove("show");
  resizeCanvas();
  initParticles();
  visibleNoteStart = 0;

  const chart = generateChart(config);
  const lastNote = chart.at(-1)?.time || 0;
  const tailMs = Math.max(1800, 2300 / config.speed + 600);
  state = {
    ...config,
    keys: bindings[config.lanes],
    notes: chart,
    startAt: performance.now() + 3000,
    pausedAt: 0,
    pausedTotal: 0,
    isPaused: false,
    finished: false,
    finishAt: 0,
    beatStopped: false,
    nextBeatPromptIndex: 0,
    beatPromptEndAt: lastNote,
    autoplay: Boolean(config.autoplay),
    laneFlash: Array(config.lanes).fill(0),
    hitEffects: [],
    nextAutoIndex: 0,
    nextMissIndex: 0,
    offsets: [],
    unlockedAchievements: [],
    counts: { perfect: 0, great: 0, good: 0, miss: 0 },
    score: 0,
    combo: 0,
    maxCombo: 0,
    hitWeight: 0,
    judged: 0,
    ratingGain: 0,
    ratingApplied: false,
    resultSaved: false,
    totalNotes: chart.length,
    endAt: lastNote + tailMs,
  };

  lastFrameTime = performance.now();
  countdownTimer = 3;
  lastCountdownText = "";
  updateHud();
  loop(lastFrameTime);
}

function currentSongTime(now = performance.now()) {
  if (!state) return 0;
  const clock = state.isPaused ? state.pausedAt : now;
  return clock - state.startAt - state.pausedTotal;
}

function eventPerformanceTime(event) {
  if (!event || typeof event.timeStamp !== "number") return performance.now();
  const now = performance.now();
  return Math.abs(event.timeStamp - now) < 10000 ? event.timeStamp : now;
}

function updateHud() {
  if (!state) return;
  scoreText.textContent = String(state.score);
  comboText.textContent = String(state.combo);
  const accuracy = state.judged ? (state.hitWeight / state.judged) * 100 : 100;
  accuracyText.textContent = `${accuracy.toFixed(2)}%`;
}

function currentAccuracy() {
  return state.judged ? (state.hitWeight / state.judged) * 100 : 100;
}

function applyRatingResult() {
  if (state.ratingApplied) return state.ratingGain;
  state.ratingApplied = true;

  const accuracy = currentAccuracy();
  const gain = !state.autoplay && accuracy >= 70 ? state.score / 100000 : 0;
  state.ratingGain = Number(formatRating(gain));
  const gainedRating = state.ratingGain > 0;
  if (gainedRating) {
    userProfile.rating = Number(formatRating(userProfile.rating + state.ratingGain));
    renderProfile();
  }
  if (checkResultAchievements() || gainedRating) {
    saveProfile();
    updateAchievements();
  }
  return state.ratingGain;
}

function updateAutoplayToggle() {
  if (!autoplayToggle) return;
  autoplayToggle.classList.toggle("active", autoplayEnabled);
  autoplayToggle.setAttribute("aria-pressed", String(autoplayEnabled));
}

function updateMetronomeToggle() {
  if (!metronomeToggle) return;
  metronomeToggle.classList.toggle("active", metronomeEnabled);
  metronomeToggle.setAttribute("aria-pressed", String(metronomeEnabled));
  if (offsetControl) {
    offsetControl.classList.toggle("hidden", !metronomeEnabled);
  }
  if (!metronomeEnabled) stopBeatPromptSounds();
}

function openDialog(dialog) {
  if (!dialog) return;
  setupPanel.style.transition = "opacity 500ms ease-out";
  setupPanel.style.opacity = "0.3";
  
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

[appSettingsDialog, settingsDialog, achievementsDialog].forEach((dialog) => {
  if (!dialog) return;
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      handleDialogClose(dialog);
    }
  });
});

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
  
  setupPanel.style.transition = "opacity 300ms ease-out";
  setupPanel.style.opacity = "1";
}

function openBindSettings(lanes) {
  savedLaneCountForBindSettings = activeLaneCount;
  
  const laneCount = clamp(Math.round(Number(lanes)), 4, 6);
  laneInputs.forEach((input) => {
    input.checked = Number(input.value) === laneCount;
  });
  updateActiveLaneCount(true);
  if (appSettingsDialog.open) closeDialog(appSettingsDialog);
  openDialog(settingsDialog);
}

function handleDialogClose(dialog) {
  if (!dialog) return;

  if (dialog === settingsDialog && appSettingsButton && !savedLaneCountForBindSettings) {
    openDialog(appSettingsDialog);
  } else {
    closeDialog(dialog);
  }
}

function isFinalJudgement() {
  return state && state.totalNotes > 0 && state.judged >= state.totalNotes;
}

function showJudgement(text, color, { final = false } = {}) {
  judgementText.textContent = text;
  judgementText.style.setProperty("--judgement-color", color);
  judgementText.classList.remove("show", "fading");
  void judgementText.offsetWidth;
  judgementText.classList.add("show");
  judgementFadeAfterTimer = final;
  judgementTimer = final ? FINAL_JUDGEMENT_HOLD_MS : text.startsWith("瀹屾垚") ? 3000 : JUDGEMENT_HOLD_MS;
}

function commitHit(note, lane, judgement, offset = 0) {
  note.judged = true;
  note.hit = true;
  state.laneFlash[lane] = LANE_FLASH_MS;
  state.hitEffects.push({
    lane,
    age: 0,
    duration: 360,
    color: judgement.color,
  });
  state.judged += 1;
  state.hitWeight += judgement.weight;
  state.offsets.push(offset);
  state.counts[judgement.name.toLowerCase()] += 1;
  state.combo += 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.score += judgement.score + state.combo * 3;
  triggerParticlePulse(lane);
  showJudgement(judgement.name, judgement.color, { final: isFinalJudgement() });
  updateHud();
}

function judgeLane(lane, inputTime = performance.now()) {
  const inputSongTime = currentSongTime(inputTime);
  if (!state || state.isPaused || inputSongTime < -200) return;
  state.laneFlash[lane] = LANE_FLASH_MS;

  const now = inputSongTime;
  let candidate = null;
  let candidateDelta = Infinity;

  for (let index = state.nextMissIndex; index < state.notes.length; index += 1) {
    const note = state.notes[index];
    if (note.judged || note.lane !== lane) continue;
    const delta = Math.abs(note.time - now);
    if (delta < candidateDelta) {
      candidate = note;
      candidateDelta = delta;
    }
    if (note.time - now > MISS_MS) break;
  }

  const judgement = JUDGE_WINDOWS.find((item) => candidateDelta <= item.ms);
  if (!candidate || !judgement) return;

  commitHit(candidate, lane, judgement, now - candidate.time);
}

function laneFromClientX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const laneCount = state?.lanes || activeLaneCount;
  const lane = Math.floor(((clientX - rect.left) / rect.width) * laneCount);
  return clamp(lane, 0, laneCount - 1);
}

function handleLanePointerDown(event) {
  if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
  if (!state || state.finished || state.autoplay) return;
  event.preventDefault();
  const lane = laneFromClientX(event.clientX);
  triggerParticlePulse(lane);
  judgeLane(lane, eventPerformanceTime(event));
}

function registerMiss(note) {
  note.judged = true;
  note.missed = true;
  state.judged += 1;
  state.counts.miss += 1;
  state.combo = 0;
  showJudgement("MISS", "var(--danger)", { final: isFinalJudgement() });
  updateHud();
}

function runAutoplay(songTime) {
  if (!state.autoplay) return;
  const perfect = JUDGE_WINDOWS[0];
  while (state.nextAutoIndex < state.notes.length) {
    const note = state.notes[state.nextAutoIndex];
    if (note.time > songTime) break;
    if (!note.judged) commitHit(note, note.lane, perfect, 0);
    state.nextAutoIndex += 1;
  }
}

function update(delta, songTime) {
  for (let lane = 0; lane < state.lanes; lane += 1) {
    state.laneFlash[lane] = Math.max(0, state.laneFlash[lane] - delta);
  }
  for (let index = state.hitEffects.length - 1; index >= 0; index -= 1) {
    const effect = state.hitEffects[index];
    effect.age += delta;
    if (effect.age >= effect.duration) state.hitEffects.splice(index, 1);
  }

  if (judgementTimer > 0) {
    judgementTimer -= delta;
    if (judgementTimer <= 0) {
      if (judgementFadeAfterTimer) {
        judgementFadeAfterTimer = false;
        judgementText.classList.add("fading");
        judgementTimer = FINAL_JUDGEMENT_FADE_MS;
      } else {
        judgementText.classList.remove("show", "fading");
      }
    }
  }

  countdownTimer = Math.max(0, Math.ceil(-songTime / 1000));
  const nextCountdownText = countdownTimer > 0 ? String(countdownTimer) : "";
  if (nextCountdownText !== lastCountdownText) {
    lastCountdownText = nextCountdownText;
    countdownText.textContent = nextCountdownText;
  }

  updateBeatPrompt(songTime);
  runAutoplay(songTime);

  while (state.nextMissIndex < state.notes.length) {
    const note = state.notes[state.nextMissIndex];
    if (songTime - note.time <= MISS_COMMIT_MS) break;
    if (!note.judged) registerMiss(note);
    state.nextMissIndex += 1;
  }

  if (!state.finished && songTime >= state.endAt) {
    state.finished = true;
    state.finishAt = songTime;
    state.beatStopped = true;
    stopBeatPromptSounds();
    updateBeatIndicator(-1);
    showResults();
    return;
  }
  if (state.finished && !state.beatStopped && songTime - state.finishAt >= 3000) {
    state.beatStopped = true;
    updateBeatIndicator(-1);
  }
}

function percentile(sorted, ratio) {
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * ratio;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function drawMonotoneCurve(context, points, flatIndexes = new Set()) {
  if (points.length < 2) return;

  const slopes = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    slopes.push((points[index + 1].y - points[index].y) / (points[index + 1].x - points[index].x));
  }

  const tangents = points.map((_, index) => {
    if (flatIndexes.has(index)) return 0;
    if (index === 0) return slopes[0];
    if (index === points.length - 1) return slopes[slopes.length - 1];
    if (slopes[index - 1] * slopes[index] <= 0) return 0;
    return (slopes[index - 1] + slopes[index]) / 2;
  });

  for (let index = 0; index < slopes.length; index += 1) {
    if (slopes[index] === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      continue;
    }

    const alpha = tangents[index] / slopes[index];
    const beta = tangents[index + 1] / slopes[index];
    const sum = alpha * alpha + beta * beta;
    if (sum > 9) {
      const scale = 3 / Math.sqrt(sum);
      tangents[index] = scale * alpha * slopes[index];
      tangents[index + 1] = scale * beta * slopes[index];
    }
  }

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const dx = next.x - current.x;
    context.bezierCurveTo(
      current.x + dx / 3,
      current.y + (tangents[index] * dx) / 3,
      next.x - dx / 3,
      next.y - (tangents[index + 1] * dx) / 3,
      next.x,
      next.y,
    );
  }
}

function drawResultsChart() {
  const width = resultCanvas.clientWidth;
  const height = resultCanvas.clientHeight;
  const pad = { left: 48, right: 24, top: 2, bottom: 28 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const binSize = 10;
  const minMs = -200;
  const maxMs = 200;
  const binCount = (maxMs - minMs) / binSize;
  const bins = Array(binCount).fill(0);

  for (const offset of state.offsets) {
    const clamped = Math.max(minMs, Math.min(maxMs - 0.001, offset));
    bins[Math.floor((clamped - minMs) / binSize)] += 1;
  }

  const maxBin = Math.max(1, ...bins);
  const hotIndex = bins.indexOf(maxBin);
  resultCtx.clearRect(0, 0, width, height);
  resultCtx.shadowColor = "rgba(255,255,255,0.2)";
  resultCtx.shadowBlur = 4;

  resultCtx.strokeStyle = "rgba(255,255,255,0.12)";
  resultCtx.lineWidth = 1;
  resultCtx.beginPath();
  resultCtx.moveTo(pad.left, pad.top + plotH);
  resultCtx.lineTo(pad.left + plotW, pad.top + plotH);
  resultCtx.stroke();

  const barW = plotW / binCount;
  const barHeightScale = 0.95;
  const curveHeightScale = 0.95;
  const curveRawFloor = 0.72;
  const curveKernel = [0.0, 0.15, 0.2, 0.3, 0.2, 0.15, 0.0];
  const curveKernelCenter = Math.floor(curveKernel.length / 2);

  bins.forEach((count, index) => {
    const h = (count / maxBin) * (plotH * barHeightScale);
    const x = pad.left + index * barW;
    const y = pad.top + plotH - h;
    resultCtx.fillStyle =
      index === hotIndex ? "rgba(105,255,218,0.78)" : "rgba(31,126,102,0.52)";
    roundRect(resultCtx, x + 1, y, Math.max(1, barW - 2), h, 3);
    resultCtx.fill();
  });

  if (!state.autoplay) {
    const smoothBins = bins.map((_, index) =>
      curveKernel.reduce((total, weight, kernelIndex) => {
        const sampleIndex = Math.max(0, Math.min(bins.length - 1, index + kernelIndex - curveKernelCenter));
        return total + bins[sampleIndex] * weight;
      }, 0),
    );

    const points = smoothBins.map((count, index) => {
      const x = pad.left + index * barW + barW / 2;
      const envelopeCount = Math.max(count, bins[index] * curveRawFloor);
      const curveHeight = index === hotIndex
        ? (bins[index] / maxBin) * (plotH * barHeightScale)
        : (envelopeCount / maxBin) * (plotH * curveHeightScale);
      const y = pad.top + plotH - curveHeight;
      return { x, y };
    });

    resultCtx.strokeStyle = "rgba(238,255,250,0.88)";
    resultCtx.lineWidth = 2.2;
    drawMonotoneCurve(resultCtx, points);
    resultCtx.stroke();
  }

  const mapX = (value) => pad.left + ((Math.max(minMs, Math.min(maxMs, value)) - minMs) / (maxMs - minMs)) * plotW;
  resultCtx.fillStyle = "rgba(255,255,255,0.52)";
  resultCtx.font = `600 11px ${UI_FONT}`;
  resultCtx.textAlign = "center";
  [-160, -80, 0, 80, 160].forEach((tick) => {
    resultCtx.fillText(`${tick}ms`, mapX(tick), height - 8);
  });
  resultCtx.shadowBlur = 0;
}

function saveGameResult() {
  if (!state || state.resultSaved) return;
  state.resultSaved = true;
  saveData.results.push({
    playedAt: new Date().toISOString(),
    config: {
      bpm: state.bpm,
      speed: state.speed,
      density: state.density,
      totalNotes: state.totalNotes,
      lanes: state.lanes,
      beatDivisions: [...state.beatDivisions],
      autoplay: state.autoplay,
    },
    score: state.score,
    accuracy: Number(currentAccuracy().toFixed(2)),
    maxCombo: state.maxCombo,
    counts: { ...state.counts },
    ratingGain: state.ratingGain,
  });
  refreshSaveData();
}

function showResults() {
  perfectCount.textContent = String(state.counts.perfect);
  greatCount.textContent = String(state.counts.great);
  goodCount.textContent = String(state.counts.good);
  missCount.textContent = String(state.counts.miss);
  resultCombo.textContent = String(state.maxCombo);
  resultAcc.textContent = `${currentAccuracy().toFixed(2)}%`;
  resultRatingGain.textContent = formatRating(applyRatingResult());
  saveGameResult();
  if (resultAutoplay) resultAutoplay.classList.toggle("show", state.autoplay);
  resizeCanvas();
  drawResultsChart();
  judgementText.classList.remove("show", "fading");
  resultPanel.classList.add("show");
  showAchievementToast();
}

function draw(songTime) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const laneCount = state?.lanes || activeLaneCount;
  const laneWidth = width / laneCount;
  const hitY = height * HIT_LINE_RATIO;
  const travelMs = 2300 / state.speed;

  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(255,255,255,0.04)");
  gradient.addColorStop(0.72, "rgba(69,208,181,0.03)");
  gradient.addColorStop(1, "rgba(255,179,92,0.05)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let lane = 0; lane < laneCount; lane += 1) {
    const x = lane * laneWidth;
    const flash = state.laneFlash[lane] / LANE_FLASH_MS;
    ctx.fillStyle = flash > 0
      ? `rgba(69, 208, 181, ${LANE_FLASH_BASE_ALPHA + flash * LANE_FLASH_EXTRA_ALPHA})`
      : "rgba(255,255,255,0.035)";
    ctx.fillRect(x + 1, 0, laneWidth - 2, height);

    ctx.strokeStyle = "rgba(255,255,255,0.09)";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  if (state.autoplay) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#eef2f6";
    ctx.font = `800 ${Math.max(34, Math.min(74, width * 0.13))}px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("AUTOPLAY", width / 2, height * 0.42);
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(69, 208, 181, 0.88)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, hitY);
  ctx.lineTo(width, hitY);
  ctx.stroke();

  ctx.fillStyle = "rgba(69, 208, 181, 0.16)";
  ctx.fillRect(0, hitY - 12, width, 24);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const effect of state.hitEffects) {
    const t = effect.age / effect.duration;
    const ease = Math.pow(1 - t, 2.1);
    const x = effect.lane * laneWidth + laneWidth / 2;
    const radius = laneWidth * (0.34 + t * 0.44);
    const glow = ctx.createRadialGradient(x, hitY, 0, x, hitY, radius);
    glow.addColorStop(0, `rgba(255, 255, 255, ${0.68 * ease})`);
    glow.addColorStop(0.32, `${effect.color}${Math.round(230 * ease).toString(16).padStart(2, "0")}`);
    glow.addColorStop(1, "rgba(69, 208, 181, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, hitY, radius, 0, fullCircle);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.48 * ease})`;
    ctx.lineWidth = 2 + 3.2 * ease;
    ctx.beginPath();
    ctx.arc(x, hitY, radius * 0.58, 0, fullCircle);
    ctx.stroke();
  }
  ctx.restore();

  const noteHeight = Math.max(20, Math.min(32, laneWidth * 0.22));
  while (visibleNoteStart < state.notes.length) {
    const note = state.notes[visibleNoteStart];
    const progress = 1 - (note.time - songTime) / travelMs;
    const y = progress * hitY;
    if ((note.judged && !note.missed) || y > height + 44) {
      visibleNoteStart += 1;
    } else {
      break;
    }
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let index = visibleNoteStart; index < state.notes.length; index += 1) {
    const note = state.notes[index];
    if (note.judged && !note.missed) continue;
    const progress = 1 - (note.time - songTime) / travelMs;
    const y = progress * hitY;
    if (y < -44) break;
    if (y < -40 || y > height + 40) continue;

    const x = note.lane * laneWidth + laneWidth * 0.045;
    const w = laneWidth * 0.91;
    const radius = 7;
    const missedFade = note.missed ? 0.48 : 1;
    const alpha = Math.min(1, Math.max(0.18, progress + 0.18)) * missedFade;

    const noteGradient = ctx.createLinearGradient(x, y - noteHeight / 2, x + w, y + noteHeight / 2);
    if (note.missed) {
      noteGradient.addColorStop(0, `rgba(255, 93, 115, ${alpha})`);
      noteGradient.addColorStop(1, `rgba(255, 179, 92, ${alpha})`);
    } else {
      noteGradient.addColorStop(0, `rgba(67, 255, 218, ${alpha})`);
      noteGradient.addColorStop(0.45, `rgba(255, 255, 255, ${alpha})`);
      noteGradient.addColorStop(1, `rgba(91, 185, 255, ${alpha})`);
    }

    ctx.fillStyle = note.missed ? `rgba(255, 93, 115, ${0.2 * alpha})` : `rgba(69, 208, 181, ${0.28 * alpha})`;
    roundRect(ctx, x - 4, y - noteHeight / 2 - 4, w + 8, noteHeight + 8, radius + 4);
    ctx.fill();

    ctx.fillStyle = noteGradient;
    roundRect(ctx, x, y - noteHeight / 2, w, noteHeight, radius);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${0.46 * alpha})`;
    roundRect(ctx, x + 3, y - noteHeight / 2 + 3, w - 6, Math.max(3, noteHeight * 0.18), radius);
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function loop(now) {
  const delta = Math.min(50, now - lastFrameTime);
  lastFrameTime = now;

  if (!state) {
    drawSetupParticles(now);
    rafId = requestAnimationFrame(loop);
    return;
  }

  const songTime = currentSongTime(now);
  if (!state.isPaused) update(delta, songTime);
  draw(songTime);
  drawParticleCluster(now, delta);
  updateBeatIndicator(songTime);
  rafId = requestAnimationFrame(loop);
}

function togglePause() {
  if (!state || state.finished) return;
  if (state.isPaused) {
    state.pausedTotal += performance.now() - state.pausedAt;
    state.isPaused = false;
    pauseButton.textContent = "II";
    lastFrameTime = performance.now();
  } else {
    state.pausedAt = performance.now();
    state.isPaused = true;
    stopBeatPromptSounds();
    resetNextBeatPromptIndex(currentSongTime(state.pausedAt));
    pauseButton.textContent = ">";
    showJudgement("PAUSE", "var(--text)");
  }
}

function returnToSetup() {
  cancelAnimationFrame(rafId);
  stopBeatPromptSounds();
  state = null;
  document.body.classList.remove("game-active");
  resultPanel.classList.remove("show");
  gamePanel.classList.add("hidden");
  setupPanel.classList.remove("hidden");
  countdownText.textContent = "";
  lastCountdownText = "";
  judgementText.classList.remove("show", "fading");
  judgementFadeAfterTimer = false;
  judgementTimer = 0;
  pauseButton.textContent = "II";
  updateBeatIndicator(-1);
  lastFrameTime = performance.now();
  loop(lastFrameTime);
}

setupForm.addEventListener("change", (event) => {
  if (event.target.matches('input[name="beatDivision"]')) selectedBeatDivisions();
  if (event.target.matches('input[name="lanes"]')) updateActiveLaneCount();
});
// 格式化流速和难度输入框为一位小数
function formatDecimalInput(input) {
  const value = Number(input.value);
  if (!isNaN(value)) {
    input.value = value.toFixed(1);
  }
}

speedInput.addEventListener("blur", () => formatDecimalInput(speedInput));
densityInput.addEventListener("blur", () => formatDecimalInput(densityInput));

nicknameInput.addEventListener("input", () => {
  userProfile.nickname = nicknameInput.value.trim() || DEFAULT_PROFILE.nickname;
  updateAvatarFallback();
  saveProfile();
});

avatarInput.addEventListener("change", () => {
  const file = avatarInput.files?.[0];
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    userProfile.avatar = typeof reader.result === "string" ? reader.result : "";
    saveProfile();
    renderProfile();
  });
  reader.readAsDataURL(file);
});

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateActiveLaneCount();
  const bpm = Number(bpmInput.value);
  const speed = Number(speedInput.value);
  const density = Number(densityInput.value);
  const totalNotes = Number(totalNotesInput.value);
  const beatDivisions = selectedBeatDivisions();
  startGame({
    bpm: clamp(bpm, 60, 500),
    speed: mapSpeedLevel(speed),
    density: clamp(density, 0, 40),
    totalNotes: clamp(Math.round(totalNotes), 20, 5000),
    lanes: activeLaneCount,
    beatDivisions,
    autoplay: autoplayEnabled,
  });
});

appSettingsButton.addEventListener("click", () => {
  openDialog(appSettingsDialog);
});

autoplayToggle.addEventListener("click", () => {
  autoplayEnabled = !autoplayEnabled;
  updateAutoplayToggle();
});

metronomeToggle.addEventListener("click", () => {
  metronomeEnabled = !metronomeEnabled;
  updateMetronomeToggle();
});

offsetSlider.addEventListener("input", () => {
  noteOffsetMs = Number(offsetSlider.value);
  offsetInput.value = noteOffsetMs;
});

offsetInput.addEventListener("input", () => {
  const value = clamp(Number(offsetInput.value), -1000, 1000);
  offsetInput.value = value;
  offsetSlider.value = value;
  noteOffsetMs = value;
});

bindLaneButtons.forEach((button) => {
  button.addEventListener("click", () => openBindSettings(button.dataset.bindLanes));
});

achievementsButton.addEventListener("click", () => {
  updateAchievements();
  openDialog(achievementsDialog);
});

document.querySelectorAll(".settings-dialog button[value]").forEach((button) => {
  button.addEventListener("click", () => {
    const dialog = button.closest(".settings-dialog");
    handleDialogClose(dialog);
  });
});

settingsDialog.addEventListener("close", () => {
  if (savedLaneCountForBindSettings !== null) {
    activeLaneCount = savedLaneCountForBindSettings;
    savedLaneCountForBindSettings = null;
    laneInputs.forEach((input) => {
      input.checked = Number(input.value) === activeLaneCount;
    });
  }
});

bindList.addEventListener("click", (event) => {
  const button = event.target.closest(".bind-key");
  if (!button) return;
  listeningLane = Number(button.dataset.lane);
  bindList.querySelectorAll(".bind-key").forEach((item) => item.classList.remove("listening"));
  button.textContent = "按下按键";
  button.classList.add("listening");
});

resetBindsButton.addEventListener("click", () => {
  bindings = normalizeBindings();
  saveBindings();
  renderBindList();
});

backButton.addEventListener("click", returnToSetup);
pauseButton.addEventListener("click", togglePause);
retryButton.addEventListener("click", () => {
  if (lastConfig) startGame(lastConfig);
});
titleButton.addEventListener("click", returnToSetup);
canvas.addEventListener("pointerdown", handleLanePointerDown, { passive: false });
canvas.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch" || event.pointerType === "pen") event.preventDefault();
}, { passive: false });
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
gamePanel.addEventListener("touchmove", (event) => {
  if (document.body.classList.contains("game-active")) event.preventDefault();
}, { passive: false });
window.addEventListener("gesturestart", (event) => event.preventDefault());
window.addEventListener("gesturechange", (event) => event.preventDefault());

window.addEventListener("keydown", (event) => {
  if (listeningLane !== null) {
    event.preventDefault();
    const current = bindings[activeLaneCount];
    const duplicateAt = current.indexOf(event.code);
    if (duplicateAt !== -1 && duplicateAt !== listeningLane) current[duplicateAt] = current[listeningLane];
    current[listeningLane] = event.code;
    listeningLane = null;
    saveBindings();
    renderBindList();
    return;
  }

  // 结算界面快捷键
  if (resultPanel.classList.contains("show")) {
    if (event.code === "KeyR") {
      event.preventDefault();
      if (lastConfig) startGame(lastConfig);
      return;
    }
    if (event.code === "KeyT" || event.code === "Escape") {
      event.preventDefault();
      returnToSetup();
      return;
    }
  }

  // 对话框快捷键
  if (settingsDialog.open || appSettingsDialog.open || achievementsDialog.open) {
    if (event.code === "Escape") {
      event.preventDefault();
      // Esc键直接关闭所有对话框并返回开始界面
      closeDialog(settingsDialog);
      closeDialog(appSettingsDialog);
      closeDialog(achievementsDialog);
      return;
    }
  }

  // 游戏界面快捷键
  if (state && !state.finished) {
    if (event.code === "Space") {
      event.preventDefault();
      togglePause();
      return;
    }
    if (event.code === "Escape") {
      event.preventDefault();
      returnToSetup();
      return;
    }
  }

  if (!state || event.repeat) return;
  if (state.autoplay) return;
  const lane = state.keys.indexOf(event.code);
  if (lane !== -1) {
    event.preventDefault();
    triggerParticlePulse(lane);
    judgeLane(lane, eventPerformanceTime(event));
  }
}, { capture: true });

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
initSetupParticles();
renderProfile();
updateAchievements();
selectedBeatDivisions();
updateActiveLaneCount(true);
updateAutoplayToggle();
updateMetronomeToggle();
initFileSave();
lastFrameTime = performance.now();
loop(lastFrameTime);
runLoadingSequence();
