// LUMEN KEEPER — everything the eye sees.
// The look: a dark night field with pools of warm lantern light. The world is
// drawn first, then a darkness map (an offscreen canvas with holes punched
// where the light is) is laid over it, then the wisps' glowing eyes are drawn
// on top so they pierce the dark. HUD and screens are always bright.

import { CONFIG } from './config.js';

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function glowCircle(ctx, x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawHeart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-9, -3, -5, -11, 0, -5);
  ctx.bezierCurveTo(5, -11, 9, -3, 0, 5);
  ctx.closePath();
  ctx.fillStyle = filled ? '#ff5d73' : 'rgba(255,93,115,0.18)';
  ctx.strokeStyle = '#ff5d73';
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.light = document.createElement('canvas');
    this.light.width = CONFIG.width;
    this.light.height = CONFIG.height;
    this.stars = [];
    const rng = mulberryLike(99);
    for (let i = 0; i < 90; i += 1) {
      this.stars.push({ x: rng() * CONFIG.width, y: rng() * CONFIG.height, r: rng() * 1.4 + 0.4, tw: rng() * Math.PI * 2 });
    }
    this.nebulae = [];
    for (let i = 0; i < 6; i += 1) {
      this.nebulae.push({ x: rng() * CONFIG.width, y: rng() * CONFIG.height, r: 120 + rng() * 110 });
    }
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    const s = Math.min(w / CONFIG.width, h / CONFIG.height);
    this.scale = s * dpr;
    this.offsetX = (w * dpr - CONFIG.width * this.scale) / 2;
    this.offsetY = (h * dpr - CONFIG.height * this.scale) / 2;
    return { scale: this.scale, offsetX: this.offsetX / dpr, offsetY: this.offsetY / dpr };
  }

  beginFrame(time) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);
    this.time = time;
  }

  drawBackground(world) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
    g.addColorStop(0, '#0b1026');
    g.addColorStop(0.55, '#0d1128');
    g.addColorStop(1, '#070a18');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    // Stars, twinkling.
    for (const s of this.stars) {
      const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(this.time * 1.3 + s.tw));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#cfe0ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Faint ground texture: darker patches and a soft centre glow.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowCircle(ctx, CONFIG.width / 2, CONFIG.height / 2, 420, 'rgba(38,52,110,0.25)', 1);
    for (const n of this.nebulae) {
      glowCircle(ctx, n.x, n.y, n.r, 'rgba(70,90,170,0.10)', 1);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(120,140,220,0.14)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(CONFIG.width / 2, CONFIG.height / 2, i * 130, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawBraziers(world) {
    const ctx = this.ctx;
    for (const b of world.braziers) {
      // Stone bowl on a post.
      ctx.fillStyle = '#232a45';
      ctx.fillRect(b.x - 4, b.y - 6, 8, 44);
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - 4, 26, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#2e3757';
      ctx.fill();
      if (b.lit) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glowCircle(ctx, b.x, b.y - 26, 90, 'rgba(255,150,50,0.30)', 1);
        ctx.restore();
        const flick = 1 + 0.12 * Math.sin(this.time * 9 + b.x);
        this.drawFlame(b.x, b.y - 14, 13 * flick, 30 * flick);
        ctx.fillStyle = '#ffd98a';
        ctx.font = 'bold 11px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('LIT', b.x, b.y + 52);
      } else {
        ctx.fillStyle = 'rgba(190,205,245,0.8)';
        ctx.font = '11px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(`LIGHT — ${CONFIG.brazier.cost} EMBERS`, b.x, b.y + 52);
        ctx.fillStyle = 'rgba(160,175,220,0.45)';
        ctx.beginPath();
        ctx.arc(b.x, b.y - 8, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawFlame(x, y, w, h) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.bezierCurveTo(w, -h * 0.4, w * 0.7, 0, 0, 0);
    ctx.bezierCurveTo(-w * 0.7, 0, -w, -h * 0.4, 0, -h);
    ctx.closePath();
    ctx.fillStyle = '#ff9a2e';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.62);
    ctx.bezierCurveTo(w * 0.55, -h * 0.3, w * 0.4, 0, 0, 0);
    ctx.bezierCurveTo(-w * 0.4, 0, -w * 0.55, -h * 0.3, 0, -h * 0.62);
    ctx.closePath();
    ctx.fillStyle = '#ffe27a';
    ctx.fill();
    ctx.restore();
  }

  drawEmbers(world) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const e of world.embers) {
      const pulse = 0.75 + 0.25 * Math.sin(this.time * 6 + e.x);
      glowCircle(ctx, e.x, e.y, 14, 'rgba(255,170,60,0.5)', pulse);
      ctx.fillStyle = '#ffd98a';
      ctx.beginPath();
      ctx.arc(e.x, e.y, CONFIG.ember.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawWisp(ctx, w) {
    const t = this.time;
    // Wobbly shadow body.
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.beginPath();
    const points = 10;
    for (let i = 0; i <= points; i += 1) {
      const a = (i / points) * Math.PI * 2;
      const r = w.radius * (1 + 0.14 * Math.sin(a * 3 + w.wobble * 2));
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(0, 0, w.radius * 0.2, 0, 0, w.radius * 1.15);
    g.addColorStop(0, '#3a2560');
    g.addColorStop(0.75, '#1d1236');
    g.addColorStop(1, 'rgba(29,18,54,0)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,110,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (w.burn > 0) {
      ctx.strokeStyle = `rgba(255,150,50,${0.75 * w.burn})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    if (w.hitFlash > 0) {
      ctx.globalAlpha = w.hitFlash * 4;
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawWispEyes(ctx, w) {
    // Eyes pierce the darkness: drawn after the light map.
    const dx = Math.cos(this.time * 0.8 + w.wobble) * 2;
    const eyeY = -w.radius * 0.15;
    const eyeX = w.radius * 0.38;
    ctx.save();
    ctx.translate(w.x + dx, w.y);
    ctx.globalCompositeOperation = 'lighter';
    for (const s of [-1, 1]) {
      glowCircle(ctx, s * eyeX, eyeY, 9, 'rgba(183,140,255,0.85)', 1);
      ctx.fillStyle = '#efe6ff';
      ctx.beginPath();
      ctx.arc(s * eyeX, eyeY, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawWisps(world) {
    const ctx = this.ctx;
    for (const w of world.wisps) this.drawWisp(ctx, w);
  }

  drawBoss(world) {
    const ctx = this.ctx;
    const b = world.boss;
    if (!b) return;
    const pulse = 1 + 0.05 * Math.sin(this.time * 4);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(pulse, pulse);
    ctx.beginPath();
    ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(0, 0, 8, 0, 0, b.radius);
    g.addColorStop(0, '#1a0f33');
    g.addColorStop(0.8, '#0d0719');
    g.addColorStop(1, 'rgba(13,7,25,0)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(183,140,255,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
    // The maw: a glowing open mouth.
    const open = 0.5 + 0.3 * Math.sin(this.time * 3);
    ctx.beginPath();
    ctx.moveTo(-b.radius * 0.45, 6);
    ctx.quadraticCurveTo(0, 6 + b.radius * open, b.radius * 0.45, 6);
    ctx.quadraticCurveTo(0, 6 + b.radius * open * 0.4, -b.radius * 0.45, 6);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,80,120,0.85)';
    ctx.fill();
    if (b.hitFlash > 0) {
      ctx.globalAlpha = b.hitFlash * 3;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawBossEyes(world) {
    // Eyes pierce the darkness: drawn after the light map.
    const ctx = this.ctx;
    const b = world.boss;
    if (!b) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of [-1, 1]) {
      glowCircle(ctx, b.x + s * b.radius * 0.4, b.y - b.radius * 0.35, 14, 'rgba(255,120,160,0.9)', 1);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x + s * b.radius * 0.4, b.y - b.radius * 0.35, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPlayer(world) {
    const ctx = this.ctx;
    const p = world.player;
    const blink = p.touchTimer > 0 && Math.floor(this.time * 14) % 2 === 0;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.35;
    // Warm pool of light under the keeper.
    ctx.globalCompositeOperation = 'lighter';
    glowCircle(ctx, p.x, p.y, p.lanternRadius * 1.05, 'rgba(255,190,90,0.30)', 1);
    ctx.restore();
    ctx.save();
    if (blink) ctx.globalAlpha = 0.35;
    // Cloak: a hooded triangle-body.
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 20);
    ctx.quadraticCurveTo(p.x + 15, p.y - 6, p.x + 13, p.y + 14);
    ctx.quadraticCurveTo(p.x, p.y + 19, p.x - 13, p.y + 14);
    ctx.quadraticCurveTo(p.x - 15, p.y - 6, p.x, p.y - 20);
    ctx.closePath();
    ctx.fillStyle = '#3d2b1f';
    ctx.fill();
    ctx.strokeStyle = '#ffd98a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Face: two warm eyes in the hood.
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(p.x - 4, p.y - 6, 2, 0, Math.PI * 2);
    ctx.arc(p.x + 4, p.y - 6, 2, 0, Math.PI * 2);
    ctx.fill();
    // The lantern, swinging ahead of the keeper.
    const lx = p.x + Math.cos(p.facing) * 26;
    const ly = p.y + Math.sin(p.facing) * 26 + Math.sin(this.time * 3) * 2;
    ctx.strokeStyle = '#8a6a3b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 2);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    glowCircle(ctx, lx, ly, 26, 'rgba(255,200,100,0.9)', 1);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(lx, ly, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6a3b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lx, ly, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // Flare ring: a bright core with a soft outer halo.
    if (world.flareRing) {
      const r = world.flareRing;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, r.alpha) * 0.4;
      ctx.strokeStyle = '#ff9a2e';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = Math.max(0, r.alpha);
      ctx.strokeStyle = '#ffe27a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawParticles(world) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const pt of world.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawFloaters(world) {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 17px Georgia, serif';
    for (const f of world.floaters) {
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawLightMap(world) {
    const lctx = this.light.getContext('2d');
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, CONFIG.width, CONFIG.height);
    lctx.fillStyle = 'rgba(4,6,16,0.70)';
    lctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    lctx.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, strength) => {
      const g = lctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${strength})`);
      g.addColorStop(0.7, `rgba(0,0,0,${strength * 0.7})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = g;
      lctx.beginPath();
      lctx.arc(x, y, r, 0, Math.PI * 2);
      lctx.fill();
    };
    const p = world.player;
    hole(p.x, p.y, p.lanternRadius + 70, 0.97);
    for (const b of world.braziers) {
      if (b.lit) hole(b.x, b.y - 10, CONFIG.brazier.radius + 30, 0.95);
    }
    if (world.flareRing) {
      hole(p.x, p.y, world.flareRing.r + 60, 0.9);
    }
    this.ctx.drawImage(this.light, 0, 0);
  }

  drawWorld(world) {
    const ctx = this.ctx;
    ctx.save();
    if (world.shake > 0) {
      ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
    }
    this.drawBackground(world);
    this.drawBraziers(world);
    this.drawEmbers(world);
    this.drawWisps(world);
    this.drawBoss(world);
    this.drawPlayer(world);
    this.drawParticles(world);
    this.drawLightMap(world);
    // Eyes pierce the darkness.
    for (const w of world.wisps) this.drawWispEyes(ctx, w);
    this.drawBossEyes(world);
    this.drawFloaters(world);
    ctx.restore();
  }

  drawHud(world) {
    const ctx = this.ctx;
    ctx.save();
    // Top bar.
    ctx.fillStyle = 'rgba(5,8,20,0.62)';
    roundRect(ctx, 12, 10, CONFIG.width - 24, 46, 10);
    ctx.fill();
    // Hearts.
    for (let i = 0; i < world.player.maxHp; i += 1) {
      drawHeart(ctx, 36 + i * 28, 33, 20, i < world.player.hp);
    }
    // Embers.
    ctx.fillStyle = '#ffd98a';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(`◉ ${world.emberCount}`, 36 + world.player.maxHp * 28 + 18, 40);
    // Wave + score, right side.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText(`${world.score}`, CONFIG.width - 24, 33);
    ctx.fillStyle = 'rgba(220,228,255,0.8)';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillText(`WAVE ${Math.max(1, world.wave)}/${CONFIG.totalWaves}`, CONFIG.width - 24, 50);
    // Combo.
    if (world.combo >= 2) {
      const mult = Math.min(1 + Math.min(world.combo, 20) * CONFIG.combo.step, CONFIG.combo.max);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 20px Georgia, serif';
      ctx.fillText(`COMBO x${world.combo}  ·  ${mult.toFixed(1)}x SCORE`, CONFIG.width / 2, 40);
      ctx.fillStyle = 'rgba(255,217,138,0.35)';
      roundRect(ctx, CONFIG.width / 2 - 90, 46, 180, 5, 2);
      ctx.fill();
      ctx.fillStyle = '#ffd98a';
      roundRect(ctx, CONFIG.width / 2 - 90, 46, 180 * (world.comboTimer / CONFIG.combo.window), 5, 2);
      ctx.fill();
    }
    // Flare cooldown, bottom left.
    const p = world.player;
    const ready = p.flareTimer <= 0;
    ctx.textAlign = 'left';
    ctx.fillStyle = ready ? '#ffd98a' : 'rgba(220,228,255,0.55)';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillText(ready ? 'SPACE — FLARE READY' : `FLARE … ${p.flareTimer.toFixed(1)}s`, 20, CONFIG.height - 18);
    ctx.fillStyle = 'rgba(220,228,255,0.55)';
    ctx.font = '13px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillText('WASD / ARROWS move · E light a brazier · P pause', CONFIG.width - 20, CONFIG.height - 18);
    // Boss bar.
    if (world.boss) {
      const b = world.boss;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffb0c0';
      ctx.font = 'bold 16px Georgia, serif';
      ctx.fillText('☠  THE GLOOM MAW  ☠', CONFIG.width / 2, 82);
      ctx.fillStyle = 'rgba(255,93,115,0.25)';
      roundRect(ctx, CONFIG.width / 2 - 200, 90, 400, 12, 6);
      ctx.fill();
      ctx.fillStyle = '#ff5d73';
      roundRect(ctx, CONFIG.width / 2 - 200, 90, 400 * Math.max(0, b.hp / b.maxHp), 12, 6);
      ctx.fill();
    }
    ctx.restore();
  }

  drawBanner(text, sub, alpha) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 54px Georgia, serif';
    ctx.shadowColor = 'rgba(255,180,80,0.8)';
    ctx.shadowBlur = 24;
    ctx.fillText(text, CONFIG.width / 2, CONFIG.height / 2 - 10);
    ctx.shadowBlur = 0;
    if (sub) {
      ctx.fillStyle = 'rgba(220,228,255,0.9)';
      ctx.font = '20px Georgia, serif';
      ctx.fillText(sub, CONFIG.width / 2, CONFIG.height / 2 + 30);
    }
    ctx.restore();
  }
}

// A tiny mulberry32 twin for the star field (render-only, no import cycle).
function mulberryLike(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
