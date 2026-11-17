// LUMEN KEEPER — small seeded random number generator.
// mulberry32: tiny, fast, deterministic. One seed drives a whole wave, a whole
// screenshot scene, or a whole run, so replays and screenshots are repeatable.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickWeighted(rng, weights) {
  // weights: { key: share } with shares summing to ~1. Returns a key.
  let roll = rng();
  for (const key of Object.keys(weights)) {
    roll -= weights[key];
    if (roll <= 0) return key;
  }
  return Object.keys(weights)[0];
}

export function range(rng, min, max) {
  return min + rng() * (max - min);
}

export function pickEdgePoint(rng, width, height, margin) {
  // A point just outside one of the four edges, where wisps crawl in from.
  const side = Math.floor(rng() * 4);
  if (side === 0) return { x: range(rng, 0, width), y: -margin };
  if (side === 1) return { x: width + margin, y: range(rng, 0, height) };
  if (side === 2) return { x: range(rng, 0, width), y: height + margin };
  return { x: -margin, y: range(rng, 0, height) };
}
