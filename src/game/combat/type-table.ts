import { Genre } from './genres';

export type MatchupMultiplier = 0.5 | 0.66 | 1.0 | 1.5 | 2.0;

type MatchupRow = Readonly<Record<Genre, MatchupMultiplier>>;
type MatchupTable = Readonly<Record<Genre, MatchupRow>>;

export const MATCHUP_TABLE: MatchupTable = Object.freeze({
  [Genre.Jazz]: Object.freeze({
    [Genre.Jazz]: 1.0,
    [Genre.Blues]: 0.66,
    [Genre.Classical]: 0.66,
    [Genre.Rock]: 1.0,
    [Genre.HipHop]: 1.5,
    [Genre.Electronic]: 1.0,
    [Genre.Folk]: 0.66,
    [Genre.Discord]: 0.5,
  }),
  [Genre.Blues]: Object.freeze({
    [Genre.Jazz]: 1.5,
    [Genre.Blues]: 1.0,
    [Genre.Classical]: 1.0,
    [Genre.Rock]: 0.66,
    [Genre.HipHop]: 1.0,
    [Genre.Electronic]: 0.66,
    [Genre.Folk]: 1.5,
    [Genre.Discord]: 0.5,
  }),
  [Genre.Classical]: Object.freeze({
    [Genre.Jazz]: 1.5,
    [Genre.Blues]: 1.5,
    [Genre.Classical]: 1.0,
    [Genre.Rock]: 1.5,
    [Genre.HipHop]: 1.0,
    [Genre.Electronic]: 1.0,
    [Genre.Folk]: 1.0,
    [Genre.Discord]: 0.5,
  }),
  [Genre.Rock]: Object.freeze({
    [Genre.Jazz]: 1.0,
    [Genre.Blues]: 1.5,
    [Genre.Classical]: 1.5,
    [Genre.Rock]: 1.0,
    [Genre.HipHop]: 0.66,
    [Genre.Electronic]: 1.0,
    [Genre.Folk]: 1.5,
    [Genre.Discord]: 0.5,
  }),
  [Genre.HipHop]: Object.freeze({
    [Genre.Jazz]: 1.0,
    [Genre.Blues]: 1.5,
    [Genre.Classical]: 1.5,
    [Genre.Rock]: 1.5,
    [Genre.HipHop]: 1.0,
    [Genre.Electronic]: 0.66,
    [Genre.Folk]: 1.0,
    [Genre.Discord]: 0.5,
  }),
  [Genre.Electronic]: Object.freeze({
    [Genre.Jazz]: 1.5,
    [Genre.Blues]: 1.5,
    [Genre.Classical]: 1.5,
    [Genre.Rock]: 1.5,
    [Genre.HipHop]: 1.5,
    [Genre.Electronic]: 1.0,
    [Genre.Folk]: 0.66,
    [Genre.Discord]: 0.5,
  }),
  [Genre.Folk]: Object.freeze({
    [Genre.Jazz]: 1.5,
    [Genre.Blues]: 1.0,
    [Genre.Classical]: 1.5,
    [Genre.Rock]: 1.0,
    [Genre.HipHop]: 1.5,
    [Genre.Electronic]: 1.5,
    [Genre.Folk]: 1.0,
    [Genre.Discord]: 0.5,
  }),
  [Genre.Discord]: Object.freeze({
    [Genre.Jazz]: 2.0,
    [Genre.Blues]: 2.0,
    [Genre.Classical]: 2.0,
    [Genre.Rock]: 2.0,
    [Genre.HipHop]: 2.0,
    [Genre.Electronic]: 2.0,
    [Genre.Folk]: 2.0,
    [Genre.Discord]: 1.0,
  }),
});

export function getMatchupMultiplier(attacker: Genre, defender: Genre): MatchupMultiplier {
  return MATCHUP_TABLE[attacker][defender];
}
