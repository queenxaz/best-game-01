// LUMEN KEEPER — deterministic screenshot scenes.
// ?shot=start|play|upgrade|victory&seed=N builds the exact state a screenshot
// shows, from a seeded generator and a fixed number of simulation steps, so
// every screenshot is a real render of the game's own code and repeats
// byte-for-byte. main.js runs the steps, renders once, then sets
// window.__shotReady so the capture tool knows the frame is done.

import { CONFIG } from './config.js';
import { mulberry32, range } from './random.js';

function scatterWisps(world, rng, kinds, count, cx, cy, rMin, rMax) {
  for (let i = 0; i < count; i += 1) {
    const a = rng() * Math.PI * 2;
    const r = range(rng, rMin, rMax);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const kind = kinds[Math.floor(rng() * kinds.length)];
    world.spawnWisp(kind, x, y);
  }
}

function scatterEmbers(world, rng, count, cx, cy, spread) {
  for (let i = 0; i < count; i += 1) {
    world.embers.push({
      x: cx + range(rng, -spread, spread),
      y: cy + range(rng, -spread, spread),
      vx: range(rng, -30, 30), vy: range(rng, -30, 30),
      value: 1, life: 14,
    });
  }
}

// Runs the world forward with no input, so glows, particles and drifting
// wisps settle into a lived-in frame. Deterministic: same seed, same frame.
export function settle(world, steps, sound) {
  const idle = { moveVector: () => ({ x: 0, y: 0 }), wasPressed: () => false, takeClicks: () => [] };
  for (let i = 0; i < steps; i += 1) world.update(1 / 60, idle, sound);
}

export function buildShotScene(world, scene, seed) {
  const rng = mulberry32(seed || 1);
  const p = world.player;
  p.x = CONFIG.width / 2;
  p.y = CONFIG.height / 2 + 40;

  if (scene === 'start') {
    // Title over a quiet field: a few wisps drifting in the dark behind it.
    scatterWisps(world, rng, ['drifter', 'skitter'], 7, p.x, p.y, 220, 480);
    scatterEmbers(world, rng, 5, p.x, p.y, 300);
    world.braziers[0].lit = true;
    return { screen: 'title', steps: 90 };
  }

  if (scene === 'play') {
    // The cover: wave 5, the Gloom Maw in the light, wisps closing in, a
    // flare bursting, embers flying, combo alive.
    world.startWave(5);
    world.score = 2840;
    world.emberCount = 23;
    world.combo = 6;
    world.comboTimer = CONFIG.combo.window;
    world.braziers[0].lit = true;
    world.braziers[2].lit = true;
    scatterWisps(world, rng, ['drifter', 'skitter', 'brute'], 14, p.x, p.y, 120, 420);
    scatterEmbers(world, rng, 12, p.x, p.y, 260);
    world.spawnBoss();
    world.boss.x = p.x + 195;
    world.boss.y = p.y - 115;
    p.facing = Math.atan2(world.boss.y - p.y, world.boss.x - p.x);
    // Run a few steps so the fight looks mid-motion, then arm the flare
    // ring right before the render so it is caught at full brightness.
    return {
      screen: 'playing', steps: 24,
      after: () => {
        world.flareRing = { r: 95, max: p.flareRadius, alpha: 0.95 };
        world.burst(p.x - 60, p.y + 30, '#b78cff', 10, 140);
      },
    };
  }

  if (scene === 'upgrade') {
    // Between waves: the ember shop, braziers lit, spoils on the ground.
    world.wave = 4;
    world.score = 1930;
    world.emberCount = 38;
    world.upgradeLevels = { lantern: 1, flame: 0, boots: 2, magnet: 1, mend: 0 };
    world.braziers[0].lit = true;
    world.braziers[1].lit = true;
    scatterEmbers(world, rng, 10, p.x, p.y, 320);
    world.burst(p.x, p.y - 40, '#ffd98a', 12, 90);
    return { screen: 'shop', steps: 30 };
  }

  if (scene === 'victory') {
    // Dawn: the win screen over a field where every brazier burns.
    world.wave = 10;
    world.score = 12480;
    world.kills = 187;
    world.embersEarned = 243;
    world.time = 623;
    world.victory = true;
    // Step the keeper aside so the stats panel stays clear.
    p.x = 250;
    p.y = 570;
    for (const b of world.braziers) b.lit = true;
    scatterEmbers(world, rng, 14, CONFIG.width / 2, CONFIG.height / 2, 380);
    return { screen: 'victory', steps: 20 };
  }

  // Unknown scene: plain play.
  world.startWave(2);
  return { screen: 'playing', steps: 30 };
}
