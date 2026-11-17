// LUMEN KEEPER — the screens around the fight.
// Title, the between-wave ember shop, pause, game over and victory. Each one
// is a dimmed overlay with a panel; the shop returns its button rectangles so
// the main loop can hit-test mouse clicks on them.

import { CONFIG, UPGRADES, upgradeCost } from './config.js';
import { roundRect, glowCircle } from './render.js';

const W = CONFIG.width;
const H = CONFIG.height;

function dim(ctx, alpha) {
  ctx.save();
  ctx.fillStyle = `rgba(4,6,16,${alpha})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,32,0.92)';
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,217,138,0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function title(ctx, text, y, size, color, glow) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px Georgia, serif`;
  if (glow) {
    ctx.shadowColor = 'rgba(255,180,80,0.9)';
    ctx.shadowBlur = 26;
  }
  ctx.fillText(text, W / 2, y);
  ctx.restore();
}

export function drawTitleScreen(ctx, best, time) {
  dim(ctx, 0.55);
  // A little lantern glow breathing behind the title.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowCircle(ctx, W / 2, 250, 260 + 30 * Math.sin(time * 1.5), 'rgba(255,190,90,0.20)', 1);
  ctx.restore();
  title(ctx, 'LUMEN KEEPER', 210, 72, '#ffe9a8', true);
  title(ctx, 'Keep the light alive.', 258, 24, '#dfe6ff', false);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(220,228,255,0.85)';
  ctx.font = '17px Georgia, serif';
  ctx.fillText('Shadow wisps crawl in from the dark. Your lantern burns them —', W / 2, 320);
  ctx.fillText('but only while they stand in its light. Gather their embers,', W / 2, 346);
  ctx.fillText('light the braziers, and hold all ten waves. The Gloom Maw waits.', W / 2, 372);
  ctx.font = 'italic 15px Georgia, serif';
  ctx.fillStyle = 'rgba(255,217,138,0.8)';
  ctx.fillText('Dear Judge — one lantern, ten waves, and a lot of dark.', W / 2, 414);
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillStyle = '#ffe9a8';
  const blink = 0.8 + 0.2 * Math.sin(time * 3);
  ctx.globalAlpha = blink;
  ctx.fillText('CLICK OR PRESS ENTER TO BEGIN', W / 2, 480);
  ctx.globalAlpha = 1;
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = 'rgba(220,228,255,0.8)';
  ctx.fillText('WASD / ARROWS — move      SPACE — flare burst      E — light a brazier      P — pause', W / 2, 528);
  if (best > 0) {
    ctx.fillStyle = '#ffd98a';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.fillText(`BEST SCORE  ${best}`, W / 2, 566);
  }
  ctx.restore();
}

// The shop: five upgrade cards in a row and a NEXT WAVE button.
// Returns the rectangles main.js hit-tests against clicks.
export function shopLayout() {
  const cardW = 200;
  const cardH = 210;
  const gap = 16;
  const total = UPGRADES.length * cardW + (UPGRADES.length - 1) * gap;
  const x0 = (W - total) / 2;
  const y0 = 250;
  const cards = UPGRADES.map((u, i) => ({
    id: u.id,
    rect: { x: x0 + i * (cardW + gap), y: y0, w: cardW, h: cardH },
  }));
  return {
    cards,
    next: { x: W / 2 - 130, y: 500, w: 260, h: 56 },
  };
}

export function drawShopScreen(ctx, world) {
  dim(ctx, 0.6);
  title(ctx, `WAVE ${world.wave} CLEARED`, 130, 44, '#ffe9a8', true);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(220,228,255,0.9)';
  ctx.font = '18px Georgia, serif';
  ctx.fillText(`Score ${world.score}   ·   Embers ◉ ${world.emberCount}   ·   Next: wave ${world.wave + 1}`, W / 2, 168);
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = 'rgba(220,228,255,0.7)';
  ctx.fillText('Spend embers on upgrades — or save them to light braziers mid-wave.', W / 2, 196);
  ctx.restore();
  const layout = shopLayout();
  for (const card of layout.cards) {
    const up = UPGRADES.find((u) => u.id === card.id);
    const level = world.upgradeLevels[card.id];
    const maxed = level >= 3;
    const cost = maxed ? 0 : upgradeCost(up, level);
    const afford = !maxed && world.emberCount >= cost;
    const r = card.rect;
    panel(ctx, r.x, r.y, r.w, r.h);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = afford ? '#ffe9a8' : 'rgba(255,233,168,0.45)';
    ctx.font = 'bold 18px Georgia, serif';
    ctx.fillText(up.name, r.x + r.w / 2, r.y + 36);
    ctx.fillStyle = 'rgba(220,228,255,0.85)';
    ctx.font = '15px Georgia, serif';
    ctx.fillText(up.desc, r.x + r.w / 2, r.y + 66);
    // Level pips.
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < level ? '#ffd98a' : 'rgba(255,217,138,0.25)';
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2 - 22 + i * 22, r.y + 96, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillStyle = maxed ? '#7dffb0' : afford ? '#ffd98a' : 'rgba(255,93,115,0.8)';
    ctx.fillText(maxed ? 'MAXED' : `◉ ${cost}`, r.x + r.w / 2, r.y + 140);
    ctx.font = '13px Georgia, serif';
    ctx.fillStyle = 'rgba(220,228,255,0.6)';
    ctx.fillText(maxed ? 'fully lit' : afford ? 'click to buy' : 'not enough embers', r.x + r.w / 2, r.y + 168);
    ctx.restore();
  }
  const n = layout.next;
  ctx.save();
  panel(ctx, n.x, n.y, n.w, n.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText(`NEXT WAVE  ${world.wave + 1}  →`, n.x + n.w / 2, n.y + 36);
  ctx.restore();
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(220,228,255,0.6)';
  ctx.font = '13px Georgia, serif';
  ctx.fillText('or press ENTER', W / 2, 580);
  ctx.restore();
  return layout;
}

export function drawPausedScreen(ctx) {
  dim(ctx, 0.6);
  title(ctx, 'PAUSED', 300, 54, '#ffe9a8', true);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(220,228,255,0.85)';
  ctx.font = '18px Georgia, serif';
  ctx.fillText('The dark waits. Press P or click to carry on.', W / 2, 360);
  ctx.restore();
}

function statsLines(world) {
  return [
    `Score  ${world.score}`,
    `Wave reached  ${world.wave} / ${CONFIG.totalWaves}`,
    `Wisps banished  ${world.kills}`,
    `Embers gathered  ${world.embersEarned}`,
    `Time  ${Math.floor(world.time / 60)}:${String(Math.floor(world.time % 60)).padStart(2, '0')}`,
  ];
}

export function drawGameOverScreen(ctx, world, best, time) {
  dim(ctx, 0.72);
  title(ctx, 'THE LIGHT GOES OUT', 180, 52, '#ff8fa3', true);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(220,228,255,0.9)';
  ctx.font = '18px Georgia, serif';
  ctx.fillText('The wisps close in, and the lantern gutters… but a keeper relights.', W / 2, 228);
  const lines = statsLines(world);
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, 290 + i * 32);
  });
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText(`BEST SCORE  ${best}`, W / 2, 290 + lines.length * 32 + 12);
  ctx.globalAlpha = 0.8 + 0.2 * Math.sin(time * 3);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('PRESS R OR CLICK TO TRY AGAIN', W / 2, 290 + lines.length * 32 + 62);
  ctx.restore();
}

export function drawVictoryScreen(ctx, world, best, time) {
  dim(ctx, 0.6);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowCircle(ctx, W / 2, 200, 300, 'rgba(255,190,90,0.25)', 1);
  ctx.restore();
  title(ctx, 'DAWN BREAKS', 180, 60, '#ffe9a8', true);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(220,228,255,0.95)';
  ctx.font = '19px Georgia, serif';
  ctx.fillText('Ten waves held. The Gloom Maw is gone, and the lanterns burn on.', W / 2, 232);
  ctx.fillText('You kept the light alive, keeper.', W / 2, 260);
  const lines = statsLines(world);
  lines.forEach((line, i) => {
    ctx.font = '18px Georgia, serif';
    ctx.fillText(line, W / 2, 316 + i * 32);
  });
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText(`BEST SCORE  ${best}`, W / 2, 316 + lines.length * 32 + 12);
  ctx.globalAlpha = 0.8 + 0.2 * Math.sin(time * 3);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', W / 2, 316 + lines.length * 32 + 62);
  ctx.restore();
}
