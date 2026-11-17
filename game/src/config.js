// LUMEN KEEPER — tuning, waves and upgrades.
// One place for every number that shapes how the game feels, so balancing is
// a matter of editing this file and nothing else.

export const CONFIG = {
  // Logical playfield. The canvas scales to the window, the world stays 1280x720.
  width: 1280,
  height: 720,

  player: {
    radius: 16,
    speed: 235, // px per second
    maxHp: 5,
    lanternRadius: 150, // light that burns wisps
    flameDps: 22, // damage per second to a wisp inside the light
    magnetRadius: 90, // embers drift to the keeper inside this radius
    flareRadius: 270, // Space burst radius
    flareDamage: 30,
    flareCooldown: 6, // seconds
    touchCooldown: 0.9, // seconds of mercy after a wisp touches the keeper
  },

  wisp: {
    drifter: { radius: 15, speed: 62, hp: 1, score: 10, embers: 1, touch: 1 },
    skitter: { radius: 11, speed: 138, hp: 1, score: 15, embers: 1, touch: 1 },
    brute: { radius: 26, speed: 42, hp: 4, score: 30, embers: 3, touch: 2 },
  },

  boss: {
    radius: 58,
    speed: 55,
    hp: 130, // wave 5; wave 10 scales up in wavesFor()
    score: 500,
    embers: 12,
    touch: 2,
    spawnInterval: 4.5, // seconds between minion spawns
    chargeCooldown: 7,
  },

  brazier: {
    radius: 120, // light zone a lit brazier guards
    dps: 26,
    cost: 15, // embers to light one
    trickle: 1, // embers earned every trickleSeconds while lit
    trickleSeconds: 2,
  },

  combo: {
    window: 2.5, // seconds between kills to keep the chain alive
    step: 0.1, // +10% score per chain step
    max: 3, // score multiplier cap
  },

  ember: { radius: 7, value: 1, life: 14, magnetSpeed: 320 },

  // Waves 1-10. count is how many wisps trickle in; mix is the share of each
  // kind; boss waves replace the last trickle with the Gloom Maw.
  waves: [
    { count: 8, mix: { drifter: 1.0, skitter: 0, brute: 0 }, interval: 1.6 },
    { count: 12, mix: { drifter: 0.7, skitter: 0.3, brute: 0 }, interval: 1.4 },
    { count: 16, mix: { drifter: 0.55, skitter: 0.35, brute: 0.1 }, interval: 1.25 },
    { count: 20, mix: { drifter: 0.45, skitter: 0.4, brute: 0.15 }, interval: 1.1 },
    { count: 10, mix: { drifter: 0.5, skitter: 0.35, brute: 0.15 }, interval: 1.2, boss: true },
    { count: 24, mix: { drifter: 0.4, skitter: 0.4, brute: 0.2 }, interval: 1.0 },
    { count: 28, mix: { drifter: 0.35, skitter: 0.4, brute: 0.25 }, interval: 0.9 },
    { count: 32, mix: { drifter: 0.3, skitter: 0.45, brute: 0.25 }, interval: 0.85 },
    { count: 36, mix: { drifter: 0.25, skitter: 0.45, brute: 0.3 }, interval: 0.8 },
    { count: 14, mix: { drifter: 0.3, skitter: 0.4, brute: 0.3 }, interval: 0.9, boss: true, bossHp: 220 },
  ],

  totalWaves: 10,
  waveClearBonus: 50, // score per wave number on clear
  victoryBonus: 1000,
};

// The four upgrades sold between waves. level caps at 3; cost grows with level.
export const UPGRADES = [
  {
    id: 'lantern', name: 'Wider Lantern', desc: '+30 light radius',
    base: 12, apply: (p) => { p.lanternRadius += 30; },
  },
  {
    id: 'flame', name: 'Hotter Flame', desc: '+45% burn damage',
    base: 14, apply: (p) => { p.flameDps *= 1.45; },
  },
  {
    id: 'boots', name: 'Swift Boots', desc: '+12% move speed',
    base: 10, apply: (p) => { p.speed *= 1.12; },
  },
  {
    id: 'magnet', name: 'Ember Magnet', desc: '+45 ember pull radius',
    base: 8, apply: (p) => { p.magnetRadius += 45; },
  },
  {
    id: 'mend', name: 'Mend & Harden', desc: '+1 max heart, heal 1',
    base: 16, apply: (p) => { p.maxHp += 1; p.hp = Math.min(p.maxHp, p.hp + 1); },
  },
];

export function upgradeCost(upgrade, level) {
  return upgrade.base + level * 6;
}
