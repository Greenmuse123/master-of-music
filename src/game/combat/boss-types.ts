export type BossPhase = {
  id: string;
  patternIntroBeats: number;
  patternBeats: number[];
  vulnerableBeats: number;
  hpThreshold?: number;
};

export type BossScript = {
  id: string;
  phases: BossPhase[];
  finalDefeatBeats: number;
};

export type BossEvent =
  | { kind: 'phase-enter'; phaseId: string }
  | { kind: 'cue'; beatIndex: number }
  | { kind: 'vulnerable'; remainingBeats: number }
  | { kind: 'phase-exit'; phaseId: string }
  | { kind: 'defeated' };
