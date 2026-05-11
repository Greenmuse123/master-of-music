import { describe, expect, it } from 'vitest';
import { generateSolidColorPng } from './procedural';

describe('procedural provider', () => {
  it('returns a valid PNG buffer header', async () => {
    const buffer = await generateSolidColorPng({ width: 1, height: 1, color: '#112233' });

    expect([...buffer.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });
});
