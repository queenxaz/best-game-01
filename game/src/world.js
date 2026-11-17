// LUMEN KEEPER — the world: player, wisps, boss, embers, braziers.
// One fixed-step update owns every rule: movement, lantern burn, flare,
// brazier lighting, combos, waves and the boss. Rendering never mutates state.

import { CONFIG, UPGRADES, upgradeCost } from './config.js';
import { mulberry32, pickWeighted, pickEdgePoint, range } from './random.js';

const BRAZIER_SPOTS = [
  { x: 170, y: 150 },
  { x: 1110, y: 150 },
  { x: 170, y: 570 },
  { x: 1110, y: 570 },
];

export class World {
  constructor(seed) {
    this.rng = mulberry32(seed || 20261117);
    this.reset();
  }

  reset() {
    const c = CONFIG.player;
    this.player = {
      x: CONFIG.width / 2, y: CONFIG.height / 2,
      radius: c.radius, speed: c.speed, hp: c.maxHp, maxHp: c.maxHp,
      lanternRadius: c.lanternRadius, flameDps: c.flameDps,
      magnetRadius: c.magnetRadius, flareRadius: c.flareRadius,
      flareDamage: c.flareDamage, flareCooldown: c.flareCooldown,
      flareTimer: 0, touchTimer: 0, facing: 0,
    };
    this.wisps = [];
    this.boss = null;
    this.embers = [];
    this.particles = [];
    this.floaters = [];
    this.braziers = BRAZIER_SPOTS.map((s) => ({ ...s, lit: false, trickleTimer: 0 }));
    this.upgradeLevels = {};
    UPGRADES.forEach((u) => { this.upgradeLevels[u.id] = 0; });
    this.wave = 0;
    this.spawnLeft = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 1.5;
    this.spawnMix = { drifter: 1, skitter: 0, brute: 0 };
    this.bossWave = false;
    this.bossSpawned = false;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.kills = 0;
    this.embersEarned = 0;
    this.embersSpent = 0;
    this.emberCount = 0;
    this.time = 0;
    this.flareRing = null;
    this.waveCleared = false;
    this.victory = false;
    this.defeat = false;
    this.shake = 0;
    this.ambient = false; // title-screen drift: wisps wander, nothing hurts
  }

  get emberBalance() {
    return this.emberCount;
  }

  startWave(n) {
    const def = CONFIG.waves[n - 1];
    this.wave = n;
    this.spawnLeft = def.count;
    this.spawnInterval = def.interval;
    this.spawnMix = def.mix;
    this.bossWave = !!def.boss;
    this.bossSpawned = false;
    this.spawnTimer = 0.8;
    this.waveCleared = false;
    return def;
  }

  spawnWisp(kind, x, y) {
    const def = CONFIG.wisp[kind];
    const p = x !== undefined ? { x, y } : pickEdgePoint(this.rng, CONFIG.width, CONFIG.height, 30);
    this.wisps.push({
      kind, x: p.x, y: p.y, hp: def.hp, maxHp: def.hp,
      speed: def.speed * range(this.rng, 0.9, 1.15),
      radius: def.radius, score: def.score, embers: def.embers, touch: def.touch,
      wobble: range(this.rng, 0, Math.PI * 2), wobbleSpeed: range(this.rng, 1.5, 3.5),
      hitFlash: 0, burn: 0,
    });
  }

  spawnBoss() {
    const def = CONFIG.waves[this.wave - 1];
    const p = pickEdgePoint(this.rng, CONFIG.width, CONFIG.height, 80);
    this.boss = {
      x: p.x, y: p.y, hp: def.bossHp || CONFIG.boss.hp, maxHp: def.bossHp || CONFIG.boss.hp,
      radius: CONFIG.boss.radius, speed: CONFIG.boss.speed,
      spawnTimer: 2, chargeTimer: CONFIG.boss.chargeCooldown,
      charging: 0, chargeX: 0, chargeY: 0, hitFlash: 0,
    };
    this.bossSpawned = true;
  }

  burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const a = this.rng() * Math.PI * 2;
      const s = range(this.rng, speed * 0.3, speed);
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: range(this.rng, 0.35, 0.8), maxLife: 0.8,
        color, size: range(this.rng, 2, 5),
      });
    }
  }

  floater(x, y, text, color) {
    this.floaters.push({ x, y, text, life: 1.1, color: color || '#ffd98a' });
  }

  addScore(base, x, y) {
    const mult = 1 + Math.min(this.combo, 20) * CONFIG.combo.step;
    const capped = Math.min(mult, CONFIG.combo.max);
    const gained = Math.round(base * capped);
    this.score += gained;
    if (x !== undefined) this.floater(x, y, `+${gained}`, capped > 1 ? '#ffe9a8' : '#ffd98a');
    return gained;
  }

  killWisp(index, silent) {
    const w = this.wisps[index];
    this.wisps.splice(index, 1);
    this.kills += 1;
    this.combo += 1;
    this.comboTimer = CONFIG.combo.window;
    this.addScore(w.score, w.x, w.y - w.radius);
    for (let i = 0; i < w.embers; i += 1) {
      this.embers.push({
        x: w.x + range(this.rng, -14, 14), y: w.y + range(this.rng, -14, 14),
        vx: range(this.rng, -40, 40), vy: range(this.rng, -40, 40),
        value: CONFIG.ember.value, life: CONFIG.ember.life,
      });
    }
    this.burst(w.x, w.y, '#b78cff', 14, 160);
    this.burst(w.x, w.y, '#ffd98a', 6, 90);
    if (!silent) this.sound.kill();
  }

  damagePlayer(amount) {
    const p = this.player;
    if (p.touchTimer > 0 || this.defeat) return;
    p.hp -= amount;
    p.touchTimer = CONFIG.player.touchCooldown;
    this.combo = 0;
    this.comboTimer = 0;
    this.shake = 10;
    this.sound.hurt();
    this.burst(p.x, p.y, '#ff6b6b', 16, 180);
    if (p.hp <= 0) {
      p.hp = 0;
      this.defeat = true;
      this.burst(p.x, p.y, '#ffd98a', 40, 260);
      this.sound.defeat();
    }
  }

  tryFlare() {
    const p = this.player;
    if (p.flareTimer > 0) return false;
    p.flareTimer = p.flareCooldown;
    this.flareRing = { r: 20, max: p.flareRadius, alpha: 1 };
    this.sound.flare();
    this.shake = Math.max(this.shake, 5);
    for (let i = this.wisps.length - 1; i >= 0; i -= 1) {
      const w = this.wisps[i];
      const d = Math.hypot(w.x - p.x, w.y - p.y);
      if (d < p.flareRadius + w.radius) {
        const a = Math.atan2(w.y - p.y, w.x - p.x);
        w.x += Math.cos(a) * 60;
        w.y += Math.sin(a) * 60;
        w.hp -= p.flareDamage;
        w.hitFlash = 0.15;
        if (w.hp <= 0) this.killWisp(i, true);
      }
    }
    if (this.boss) {
      const d = Math.hypot(this.boss.x - p.x, this.boss.y - p.y);
      if (d < p.flareRadius + this.boss.radius) {
        this.boss.hp -= p.flareDamage;
        this.boss.hitFlash = 0.15;
        if (this.boss.hp <= 0) this.killBoss();
      }
    }
    return true;
  }

  killBoss() {
    const b = this.boss;
    this.boss = null;
    this.addScore(CONFIG.boss.score, b.x, b.y - b.radius);
    for (let i = 0; i < CONFIG.boss.embers; i += 1) {
      this.embers.push({
        x: b.x + range(this.rng, -30, 30), y: b.y + range(this.rng, -30, 30),
        vx: range(this.rng, -60, 60), vy: range(this.rng, -60, 60),
        value: CONFIG.ember.value, life: CONFIG.ember.life,
      });
    }
    this.burst(b.x, b.y, '#b78cff', 50, 320);
    this.burst(b.x, b.y, '#ffd98a', 30, 200);
    this.shake = 16;
    this.sound.kill();
    if (this.wave >= CONFIG.totalWaves) {
      this.victory = true;
      this.score += CONFIG.victoryBonus;
      this.sound.victory();
    }
  }

  tryLightBrazier() {
    const p = this.player;
    for (const b of this.braziers) {
      if (b.lit) continue;
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d < 110) {
        if (this.emberCount >= CONFIG.brazier.cost) {
          this.emberCount -= CONFIG.brazier.cost;
          this.embersSpent += CONFIG.brazier.cost;
          b.lit = true;
          this.burst(b.x, b.y, '#ffb347', 24, 140);
          this.sound.light();
          return 'lit';
        }
        this.sound.denied();
        return 'poor';
      }
    }
    return 'far';
  }

  buyUpgrade(id) {
    const up = UPGRADES.find((u) => u.id === id);
    if (!up) return false;
    const level = this.upgradeLevels[id];
    if (level >= 3) return false;
    const cost = upgradeCost(up, level);
    if (this.emberCount < cost) {
      this.sound.denied();
      return false;
    }
    this.emberCount -= cost;
    this.embersSpent += cost;
    this.upgradeLevels[id] = level + 1;
    up.apply(this.player);
    this.sound.buy();
    this.burst(this.player.x, this.player.y, '#7dffb0', 18, 150);
    return true;
  }

  update(dt, input, sound) {
    this.sound = sound;
    this.time += dt;
    const p = this.player;
    if (this.ambient) {
      // Title-screen drift: wisps wander toward the keeper, nothing burns
      // and nothing hurts. Pure atmosphere.
      for (const w of this.wisps) {
        w.wobble += w.wobbleSpeed * dt;
        const a = Math.atan2(p.y - w.y, p.x - w.x) + Math.sin(w.wobble) * 0.45;
        w.x += Math.cos(a) * w.speed * 0.6 * dt;
        w.y += Math.sin(a) * w.speed * 0.6 * dt;
      }
      this.updateFx(dt);
      return;
    }
    if (this.defeat || this.victory) {
      this.updateFx(dt);
      return;
    }

    // Movement.
    const mv = input.moveVector();
    p.x += mv.x * p.speed * dt;
    p.y += mv.y * p.speed * dt;
    p.x = Math.max(p.radius, Math.min(CONFIG.width - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(CONFIG.height - p.radius, p.y));
    if (mv.x !== 0 || mv.y !== 0) p.facing = Math.atan2(mv.y, mv.x);
    p.flareTimer = Math.max(0, p.flareTimer - dt);
    p.touchTimer = Math.max(0, p.touchTimer - dt);

    // Flare and brazier keys.
    if (input.wasPressed('Space')) this.tryFlare();
    if (input.wasPressed('KeyE')) this.tryLightBrazier();
    for (const click of input.takeClicks()) {
      for (const b of this.braziers) {
        if (!b.lit && Math.hypot(b.x - click.x, b.y - click.y) < 70) {
          this.tryLightBrazier();
        }
      }
    }

    // Wave spawner.
    if (this.spawnLeft > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = this.spawnInterval;
        this.spawnLeft -= 1;
        this.spawnWisp(pickWeighted(this.rng, this.spawnMix));
        if (this.bossWave && !this.bossSpawned && this.spawnLeft <= 0) {
          this.spawnBoss();
          sound.boss();
        }
      }
    }

    // Lantern burn: wisps inside the light take damage every step.
    for (let i = this.wisps.length - 1; i >= 0; i -= 1) {
      const w = this.wisps[i];
      const d = Math.hypot(w.x - p.x, w.y - p.y);
      let burning = false;
      if (d < p.lanternRadius + w.radius) {
        w.hp -= p.flameDps * dt;
        burning = true;
      }
      for (const b of this.braziers) {
        if (b.lit && Math.hypot(w.x - b.x, w.y - b.y) < CONFIG.brazier.radius + w.radius) {
          w.hp -= CONFIG.brazier.dps * dt;
          burning = true;
        }
      }
      w.burn = burning ? 1 : Math.max(0, w.burn - dt * 4);
      w.hitFlash = Math.max(0, w.hitFlash - dt);
      if (w.hp <= 0) {
        this.killWisp(i, false);
        continue;
      }
      // Drift toward the keeper with a wobble.
      w.wobble += w.wobbleSpeed * dt;
      const a = Math.atan2(p.y - w.y, p.x - w.x) + Math.sin(w.wobble) * 0.45;
      w.x += Math.cos(a) * w.speed * dt;
      w.y += Math.sin(a) * w.speed * dt;
      if (Math.hypot(w.x - p.x, w.y - p.y) < w.radius + p.radius - 2) {
        this.damagePlayer(w.touch);
      }
    }

    // Boss.
    if (this.boss) {
      const b = this.boss;
      b.hitFlash = Math.max(0, b.hitFlash - dt);
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      if (b.charging > 0) {
        b.charging -= dt;
        b.x += b.chargeX * 340 * dt;
        b.y += b.chargeY * 340 * dt;
        b.x = Math.max(b.radius, Math.min(CONFIG.width - b.radius, b.x));
        b.y = Math.max(b.radius, Math.min(CONFIG.height - b.radius, b.y));
      } else {
        const a = Math.atan2(p.y - b.y, p.x - b.x);
        b.x += Math.cos(a) * b.speed * dt;
        b.y += Math.sin(a) * b.speed * dt;
        b.chargeTimer -= dt;
        if (b.chargeTimer <= 0 && d < 420) {
          b.charging = 0.7;
          b.chargeX = Math.cos(a);
          b.chargeY = Math.sin(a);
          b.chargeTimer = CONFIG.boss.chargeCooldown;
        }
      }
      // Lantern and brazier burn on the boss too.
      if (d < p.lanternRadius + b.radius) b.hp -= p.flameDps * dt;
      for (const br of this.braziers) {
        if (br.lit && Math.hypot(b.x - br.x, b.y - br.y) < CONFIG.brazier.radius + b.radius) {
          b.hp -= CONFIG.brazier.dps * dt;
        }
      }
      if (b.hp <= 0) {
        this.killBoss();
      } else {
        b.spawnTimer -= dt;
        if (b.spawnTimer <= 0) {
          b.spawnTimer = CONFIG.boss.spawnInterval;
          this.spawnWisp(this.rng() < 0.7 ? 'drifter' : 'skitter', b.x, b.y);
        }
        if (d < b.radius + p.radius - 2) this.damagePlayer(CONFIG.boss.touch);
      }
    }

    // Brazier ember trickle.
    for (const b of this.braziers) {
      if (!b.lit) continue;
      b.trickleTimer += dt;
      if (b.trickleTimer >= CONFIG.brazier.trickleSeconds) {
        b.trickleTimer = 0;
        this.embers.push({
          x: b.x + range(this.rng, -20, 20), y: b.y - 30,
          vx: 0, vy: -30, value: CONFIG.brazier.trickle, life: CONFIG.ember.life,
        });
      }
    }

    // Embers: drift, magnet, collect.
    for (let i = this.embers.length - 1; i >= 0; i -= 1) {
      const e = this.embers[i];
      e.life -= dt;
      if (e.life <= 0) {
        this.embers.splice(i, 1);
        continue;
      }
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (d < p.magnetRadius) {
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        const pull = CONFIG.ember.magnetSpeed * (1 - d / (p.magnetRadius + 40));
        e.vx += Math.cos(a) * pull * dt * 6;
        e.vy += Math.sin(a) * pull * dt * 6;
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vx *= 0.92;
      e.vy *= 0.92;
      if (d < p.radius + CONFIG.ember.radius + 4) {
        this.embers.splice(i, 1);
        this.emberCount += e.value;
        this.embersEarned += e.value;
        sound.pickup(this.combo);
        this.burst(e.x, e.y, '#ffd98a', 4, 60);
      }
    }

    // Combo decay.
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Flare ring visual.
    if (this.flareRing) {
      this.flareRing.r += 900 * dt;
      this.flareRing.alpha = 1 - this.flareRing.r / this.flareRing.max;
      if (this.flareRing.r >= this.flareRing.max) this.flareRing = null;
    }

    this.shake = Math.max(0, this.shake - dt * 30);
    this.updateFx(dt);

    // Wave cleared: nothing left to spawn, no wisps, no boss.
    if (!this.waveCleared && this.spawnLeft <= 0 && this.wisps.length === 0 && !this.boss && !this.victory) {
      this.waveCleared = true;
      this.score += CONFIG.waveClearBonus * this.wave;
    }
  }

  updateFx(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.96;
      pt.vy *= 0.96;
    }
    for (let i = this.floaters.length - 1; i >= 0; i -= 1) {
      const f = this.floaters[i];
      f.life -= dt;
      f.y -= 34 * dt;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
  }
}
