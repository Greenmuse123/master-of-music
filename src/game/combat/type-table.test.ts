import { describe, expect, it } from 'vitest';

import { GENRES, Genre } from './genres';
import { getMatchupMultiplier, MATCHUP_TABLE, type MatchupMultiplier } from './type-table';

const DOCUMENTED_MATCHUPS: Readonly<Record<Genre, Readonly<Record<Genre, MatchupMultiplier>>>> = {
  [Genre.Jazz]: {
    [Genre.Jazz]: 1.0,
    [Genre.Blues]: 0.66,
    [Genre.Classical]: 0.66,
    [Genre.Rock]: 1.0,
    [Genre.HipHop]: 1.5,
    [Genre.Electronic]: 1.0,
    [Genre.Folk]: 0.66,
    [Genre.Discord]: 0.5,
  },
  [Genre.Blues]: {
    [Genre.Jazz]: 1.5,
    [Genre.Blues]: 1.0,
    [Genre.Classical]: 1.0,
    [Genre.Rock]: 0.66,
    [Genre.HipHop]: 1.0,
    [Genre.Electronic]: 0.66,
    [Genre.Folk]: 1.5,
    [Genre.Discord]: 0.5,
  },
  [Genre.Classical]: {
    [Genre.Jazz]: 1.5,
    [Genre.Blues]: 1.5,
    [Genre.Classical]: 1.0,
    [Genre.Rock]: 1.5,
    [Genre.HipHop]: 1.0,
    [Genre.Electronic]: 1.0,
    [Genre.Folk]: 1.0,
    [Genre.Discord]: 0.5,
  },
  [Genre.Rock]: {
    [Genre.Jazz]: 1.0,
    [Genre.Blues]: 1.5,
    [Genre.Classical]: 1.5,
    [Genre.Rock]: 1.0,
    [Genre.HipHop]: 0.66,
    [Genre.Electronic]: 1.0,
    [Genre.Folk]: 1.5,
    [Genre.Discord]: 0.5,
  },
  [Genre.HipHop]: {
    [Genre.Jazz]: 1.0,
    [Genre.Blues]: 1.5,
    [Genre.Classical]: 1.5,
    [Genre.Rock]: 1.5,
    [Genre.HipHop]: 1.0,
    [Genre.Electronic]: 0.66,
    [Genre.Folk]: 1.0,
    [Genre.Discord]: 0.5,
  },
  [Genre.Electronic]: {
    [Genre.Jazz]: 1.5,
    [Genre.Blues]: 1.5,
    [Genre.Classical]: 1.5,
    [Genre.Rock]: 1.5,
    [Genre.HipHop]: 1.5,
    [Genre.Electronic]: 1.0,
    [Genre.Folk]: 0.66,
    [Genre.Discord]: 0.5,
  },
  [Genre.Folk]: {
    [Genre.Jazz]: 1.5,
    [Genre.Blues]: 1.0,
    [Genre.Classical]: 1.5,
    [Genre.Rock]: 1.0,
    [Genre.HipHop]: 1.5,
    [Genre.Electronic]: 1.5,
    [Genre.Folk]: 1.0,
    [Genre.Discord]: 0.5,
  },
  [Genre.Discord]: {
    [Genre.Jazz]: 2.0,
    [Genre.Blues]: 2.0,
    [Genre.Classical]: 2.0,
    [Genre.Rock]: 2.0,
    [Genre.HipHop]: 2.0,
    [Genre.Electronic]: 2.0,
    [Genre.Folk]: 2.0,
    [Genre.Discord]: 1.0,
  },
};

describe('getMatchupMultiplier', () => {
  it('returns the documented multiplier for every attacker and defender pair', () => {
    for (const attacker of GENRES) {
      for (const defender of GENRES) {
        expect(getMatchupMultiplier(attacker, defender)).toBe(DOCUMENTED_MATCHUPS[attacker][defender]);
      }
    }
  });

  it('exposes the full documented table as a frozen lookup record', () => {
    expect(MATCHUP_TABLE).toEqual(DOCUMENTED_MATCHUPS);
    expect(Object.isFrozen(MATCHUP_TABLE)).toBe(true);

    for (const attacker of GENRES) {
      expect(Object.isFrozen(MATCHUP_TABLE[attacker])).toBe(true);
    }
  });

  it('matches the full table snapshot for future change detection', () => {
    expect(MATCHUP_TABLE).toMatchInlineSnapshot(`
      {
        "blues": {
          "blues": 1,
          "classical": 1,
          "discord": 0.5,
          "electronic": 0.66,
          "folk": 1.5,
          "hiphop": 1,
          "jazz": 1.5,
          "rock": 0.66,
        },
        "classical": {
          "blues": 1.5,
          "classical": 1,
          "discord": 0.5,
          "electronic": 1,
          "folk": 1,
          "hiphop": 1,
          "jazz": 1.5,
          "rock": 1.5,
        },
        "discord": {
          "blues": 2,
          "classical": 2,
          "discord": 1,
          "electronic": 2,
          "folk": 2,
          "hiphop": 2,
          "jazz": 2,
          "rock": 2,
        },
        "electronic": {
          "blues": 1.5,
          "classical": 1.5,
          "discord": 0.5,
          "electronic": 1,
          "folk": 0.66,
          "hiphop": 1.5,
          "jazz": 1.5,
          "rock": 1.5,
        },
        "folk": {
          "blues": 1,
          "classical": 1.5,
          "discord": 0.5,
          "electronic": 1.5,
          "folk": 1,
          "hiphop": 1.5,
          "jazz": 1.5,
          "rock": 1,
        },
        "hiphop": {
          "blues": 1.5,
          "classical": 1.5,
          "discord": 0.5,
          "electronic": 0.66,
          "folk": 1,
          "hiphop": 1,
          "jazz": 1,
          "rock": 1.5,
        },
        "jazz": {
          "blues": 0.66,
          "classical": 0.66,
          "discord": 0.5,
          "electronic": 1,
          "folk": 0.66,
          "hiphop": 1.5,
          "jazz": 1,
          "rock": 1,
        },
        "rock": {
          "blues": 1.5,
          "classical": 1.5,
          "discord": 0.5,
          "electronic": 1,
          "folk": 1.5,
          "hiphop": 0.66,
          "jazz": 1,
          "rock": 1,
        },
      }
    `);
  });
});
