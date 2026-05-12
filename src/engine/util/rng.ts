/**
 * Deterministic PRNG for game logic. Seeded per save per docs/03 §4.4 and
 * the Phase-1 rubric §8 determinism rule. `Math.random()` is forbidden in
 * `src/game/`; all randomness routes through a function constructed here.
 *
 * Implementation: mulberry32 — fast, well-distributed, and reproducible from
 * a 32-bit seed. Good enough for combat dice and procedural decoration.
 */

export type Prng = () => number;

export function mulberry32(seed: number): Prng {
  let state = seed >>> 0;
  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
