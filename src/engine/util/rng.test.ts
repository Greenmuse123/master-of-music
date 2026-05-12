import { describe, expect, it } from 'vitest';

import { mulberry32 } from './rng';

describe('mulberry32', () => {
  it('produces values in [0, 1)', () => {
    const rng = mulberry32(0);
    for (let i = 0; i < 200; i += 1) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic — same seed yields the same sequence', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    for (let i = 0; i < 20; i += 1) {
      expect(a()).toBe(b());
    }
  });

  it('produces a different sequence for a different seed', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    let diff = 0;
    for (let i = 0; i < 10; i += 1) {
      if (a() !== b()) {
        diff += 1;
      }
    }
    expect(diff).toBe(10);
  });

  it('treats the seed as unsigned 32-bit (negative seeds work)', () => {
    const a = mulberry32(-1);
    const b = mulberry32(0xffffffff);
    for (let i = 0; i < 5; i += 1) {
      expect(a()).toBe(b());
    }
  });
});
