// LUMEN KEEPER — the game loop and the screens' state machine.
// States: title → playing → shop → playing … → over / victory.
// A fixed 1/60 s simulation step keeps the game fair on any display; the
// renderer draws every animation frame. ?shot=<scene>&seed=<n> renders one
// deterministic frame for screenshots instead of playing.

import { CONFIG } from './config.js';
import { World } from './world.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { drawTitleScreen, drawShopScreen, drawPausedScreen, drawGameOverScreen, drawVictoryScreen, shopLayout } from './ui.js';
import { buildShotScene, settle } from './shots.js';

const STEP = 1 / 60;
const BEST_KEY = 'lumen-keeper-best';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const renderer = new Renderer(canvas);
const input = new Input(canvas);
const sound = new Sound();
const world = new World(20261117);

let screen = 'title';
let best = 0;
try {
  best = Number(localStorage.getItem(BEST_KEY) || 0) || 0;
} catch {
  best = 0;
}
let banner = null; // { text, sub, t, dur }
let shopTimer = 0; // delay between a wave clearing and the shop opening
let shopRects = null;
let time = 0;
let accumulator = 0;
let lastNow = performance.now();
let shotMode = null;

function saveBest() {
  if (world.score > best) {
    best = world.score;
    try {
      localStorage.setItem(BEST_KEY, String(best));
    } catch {
      // Private mode: the best score just lives for this session.
    }
  }
}

function showBanner(text, sub, dur) {
  banner = { text, sub: sub || '', t: 0, dur: dur || 2.4 };
}

function startRun() {
  world.reset();
  world.ambient = false;
  screen = 'playing';
  const def = world.startWave(1);
  showBanner('WAVE 1', 'The dark stirs. Keep your lantern close.', 2.6);
  sound.unlock();
  sound.horn();
  statusEl.textContent = 'Wave 1. Move with WASD or arrow keys. Space flares.';
}

function startTitle() {
  world.reset();
  world.ambient = true;
  // A few wisps wandering in the dark behind the title.
  const kinds = ['drifter', 'skitter', 'drifter', 'skitter', 'drifter'];
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    world.spawnWisp(kinds[i], 640 + Math.cos(a) * 380, 360 + Math.sin(a) * 260);
  }
  screen = 'title';
  statusEl.textContent = 'Lumen Keeper. Press Enter or click to begin.';
}

function openShop() {
  screen = 'shop';
  shopRects = shopLayout();
  statusEl.textContent = `Wave ${world.wave} cleared. Spend embers, then start wave ${world.wave + 1}.`;
}

function nextWave() {
  const n = world.wave + 1;
  const def = world.startWave(n);
  screen = 'playing';
  if (def.boss) {
    showBanner('THE GLOOM MAW', `Wave ${n} — it comes for the light.`, 2.8);
    sound.boss();
  } else {
    showBanner(`WAVE ${n}`, n === CONFIG.totalWaves ? 'The last wave. Hold the light.' : '', 2.2);
    sound.horn();
  }
  statusEl.textContent = `Wave ${n} of ${CONFIG.totalWaves}.`;
}

function inRect(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function step(dt) {
  time += dt;
  sound.update(dt, screen === 'playing');

  if (screen === 'title') {
    world.update(dt, input, sound);
    if (input.wasPressed('Enter', 'NumpadEnter') || input.takeClicks().length > 0) {
      startRun();
    }
    return;
  }

  if (screen === 'playing') {
    if (input.wasPressed('KeyP', 'Escape')) {
      screen = 'paused';
      statusEl.textContent = 'Paused.';
      return;
    }
    if (input.wasPressed('KeyM')) sound.muted = !sound.muted;
    world.update(dt, input, sound);
    if (banner) {
      banner.t += dt;
      if (banner.t >= banner.dur) banner = null;
    }
    if (world.defeat) {
      saveBest();
      screen = 'over';
      statusEl.textContent = `The light goes out. Score ${world.score}. Press R to try again.`;
      return;
    }
    if (world.victory) {
      saveBest();
      screen = 'victory';
      statusEl.textContent = `Dawn breaks. You won with ${world.score} points. Press R to play again.`;
      return;
    }
    if (world.waveCleared && shopTimer <= 0) {
      shopTimer = 1.3;
      showBanner(`WAVE ${world.wave} CLEARED`, `+${CONFIG.waveClearBonus * world.wave} bonus`, 1.3);
    }
    if (shopTimer > 0) {
      shopTimer -= dt;
      if (shopTimer <= 0) openShop();
    }
    return;
  }

  if (screen === 'shop') {
    if (input.wasPressed('Enter', 'NumpadEnter')) {
      nextWave();
      return;
    }
    for (const click of input.takeClicks()) {
      let handled = false;
      for (const card of shopRects.cards) {
        if (inRect(card.rect, click.x, click.y)) {
          world.buyUpgrade(card.id);
          handled = true;
        }
      }
      if (!handled && inRect(shopRects.next, click.x, click.y)) nextWave();
    }
    return;
  }

  if (screen === 'paused') {
    if (input.wasPressed('KeyP', 'Escape', 'Enter') || input.takeClicks().length > 0) {
      screen = 'playing';
      statusEl.textContent = 'Back in the fight.';
    }
    return;
  }

  if (screen === 'over' || screen === 'victory') {
    world.update(dt, input, sound); // let the last particles settle
    if (input.wasPressed('KeyR', 'Enter', 'NumpadEnter') || input.takeClicks().length > 0) {
      startRun();
    }
  }
}

function render() {
  const vp = renderer.resize();
  input.setViewport(vp.scale, vp.offsetX, vp.offsetY);
  renderer.beginFrame(time);
  renderer.drawWorld(world);
  if (screen === 'playing' || screen === 'paused') {
    renderer.drawHud(world);
    if (banner) {
      const a = banner.t < 0.3 ? banner.t / 0.3 : banner.t > banner.dur - 0.5 ? (banner.dur - banner.t) / 0.5 : 1;
      renderer.drawBanner(banner.text, banner.sub, Math.max(0, Math.min(1, a)));
    }
  }
  if (screen === 'title') drawTitleScreen(renderer.ctx, best, time);
  if (screen === 'shop') drawShopScreen(renderer.ctx, world);
  if (screen === 'paused') drawPausedScreen(renderer.ctx);
  if (screen === 'over') drawGameOverScreen(renderer.ctx, world, best, time);
  if (screen === 'victory') drawVictoryScreen(renderer.ctx, world, best, time);
}

function frame(now) {
  const elapsed = Math.min((now - lastNow) / 1000, 0.25);
  lastNow = now;
  accumulator += elapsed;
  while (accumulator >= STEP) {
    step(STEP);
    accumulator -= STEP;
  }
  render();
  input.endFrame();
  requestAnimationFrame(frame);
}

// A handle for scripted play-tests: state, score and a way to start a run.
window.__lumen = {
  get screen() { return screen; },
  get world() { return world; },
  get best() { return best; },
  startRun,
  startTitle,
};

// Screenshot mode: one deterministic frame, then signal the capture tool.
const params = new URLSearchParams(location.search);
const shotScene = params.get('shot');
if (shotScene) {
  const seed = Number(params.get('seed') || 1);
  const scene = buildShotScene(world, shotScene, seed);
  screen = scene.screen;
  const muteSound = {
    kill() {}, hurt() {}, flare() {}, light() {}, buy() {}, denied() {},
    horn() {}, boss() {}, victory() {}, defeat() {}, pickup() {}, update() {},
  };
  if (shotScene === 'start') world.ambient = true;
  settle(world, scene.steps, muteSound);
  if (scene.after) scene.after();
  time = scene.steps / 60;
  // A screenshot's best score is the run it shows, not an empty profile.
  best = Math.max(best, world.score);
  render();
  window.__shotReady = true;
  shotMode = shotScene;
} else {
  startTitle();
  requestAnimationFrame(frame);
}
