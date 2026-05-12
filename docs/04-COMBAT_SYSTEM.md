# 04 — Combat System

**Project:** Master of Music
**Document version:** 1.0 (2026-05-11)

> Combat is the game's most distinctive system. This document specifies it in detail because every other system (audio, UI, content tools) is downstream of these choices.

---

## 1. Design intent in one paragraph

A battle is a **jam session**. The turn-based scaffolding of Pokémon gives the player time to think, choose, and read; the timed-action layer of Cuphead gives each chosen action a moment of physical performance; the rhythm overlay turns the whole encounter into music. The player should be able to **win on tactics** if they're bad at rhythm, **shine on rhythm** if their tactics are average, and feel that **every battle composed a song they could replay in their head**.

---

## 2. Combat loop (per encounter)

```
┌────────────────┐
│  Encounter     │  cinematic intro, music starts, beat-clock anchored
│  cold-open     │
└────────┬───────┘
         │
┌────────▼───────────────────────────────────────────┐
│  ROUND                                              │
│  ├─ 1. Player party turn order resolved (by Tempo) │
│  ├─ 2. Each ally selects: Attack / Move / Item /   │
│  │     Defend / Improvise / Flee                    │
│  ├─ 3. Selected actions execute in tempo order:    │
│  │       a. Cue beats appear                        │
│  │       b. Player hits beats (timing -> quality)  │
│  │       c. Damage / effect resolves                │
│  │       d. Counter-rhythm window for enemy        │
│  └─ 4. End-of-round: status ticks, music transition │
└────────┬───────────────────────────────────────────┘
         │
   victory / defeat / flee / capture
```

---

## 3. Core mechanics

### 3.1 Stats per combatant

| Stat | Range | Purpose |
|------|-------|---------|
| HP | 10–999 | Health |
| RES (Resonance) | 0–200 | Resource for moves, regenerates on rhythm hits |
| TEMPO | 1–200 | Turn order; also defines the local beat BPM |
| ATTACK | 1–999 | Outgoing damage scaling |
| DEFEND | 1–999 | Incoming damage reduction |
| HARMONY | 0–100 | Same-genre party synergy bonus |
| FOCUS | 0–100 | Rhythm-window width modifier |

### 3.2 Genre / type table (8 genres)

```
            Jazz  Blues  Class. Rock  HipHop Elec.  Folk  Discord
Jazz         —     w      w      n     s      n      w     S
Blues        s     —      n      w     n      w      s     S
Classical    s     s      —      s     n      n      n     S
Rock         n     s      s      —     w      n      s     S
Hip-Hop      n     s      s      s     —      w      n     S
Electronic   s     s      s      s     s      —      w     S
Folk         s     n      s      n     s      s      —     S
Discord      W     W      W      W     W      W      W     —
```

`s` = strong (1.5×), `w` = weak (0.66×), `n` = neutral, `S/W` = super strong/weak (2×/0.5×).

**Reading the table:** each cell shows the matchup multiplier when the ROW genre attacks the COLUMN genre. So `row=Discord, col=Jazz = W` means "Discord attacking Jazz → 0.5×" — but our implementation (spec 09 `getMatchupMultiplier`) inverts this: Discord is the antagonist's strong identity and is super-strong attacker (×2.0) against any non-discord defender, super-weak defender (×0.5) against any non-discord attacker. The prose intent (Discord = strong) takes precedence over the table letters. Future doc revision will re-render the table to match.

**Intent:** Discord is strong against everything except itself — that's the antagonist's whole identity. Players win by matching genres in cross-genre combos (see §3.5).

### 3.3 Rhythm windows

Every attack has 1–4 **rhythm cues** that appear in sync with the music. Each cue is hit with `beat-press` (Space). Hit quality:

| Quality | Window (s before/after target) | Damage modifier | RES return |
|---------|--------------------------------|-----------------|------------|
| Critical (on the beat) | ±0.04 | ×2.0, no resist | +6 |
| Perfect | ±0.08 | ×1.5 | +4 |
| Good | ±0.16 | ×1.0 | +2 |
| Off | ±0.30 | ×0.6 | 0 |
| Miss | else | ×0.2 | 0, build dissonance |

**Focus stat widens these windows additively (max +50% width).**

**Accessibility:** Settings includes "Relaxed Rhythm" which doubles every window. The game tracks both raw and effective hits internally for analytics.

### 3.4 Dissonance meter

A shared meter per combatant. Each missed cue adds dissonance; each landed crit removes it. At max dissonance, the combatant becomes "out of key" for 1 round (no rhythm bonuses possible). The enemy boss has its own dissonance meter — at max, the boss enters a vulnerable "stutter phase" for a Cuphead-grade visual sequence.

#### 3.4.1 Routing

BattleScene v2 (AGENT-battle-v2, Wave 2) implements dissonance routing per the spec 11 accumulation table:

- **Every combatant has their own dissonance meter.**
- A combatant's OWN action quality updates their OWN meter (miss/off raises, perfect/critical lowers, per the spec 11 table).
- A critical or perfect hit BY the active party member ALSO routes a positive-delta quality (`miss`-equivalent) to the OPPONENT's meter. This is how a strong-rhythm party drives the boss toward stutter.
- A parry by the defender does NOT route to the attacker's meter (defense doesn't shake the attacker's rhythm; it's the attacker's miss/off that does).

### 3.5 Improvise (cross-genre combos)

When an ally selects **Improvise**, they spend RES to play a cross-genre move drawn from their **personality affinities**, not their native genre. Successful improvisation triggers:

- **Solo:** one ally, double effect.
- **Duet:** two allies of compatible genres, AoE.
- **Trio / Quartet:** rare, scripted-feel — full party AoE with cutscene-grade VFX.

Combo eligibility is data-driven (`src/game/content/combos/*.json`). MVP ships 6 combos: 2 solo, 3 duet, 1 trio.

### 3.6 Counter-rhythm (defense)

When an enemy attacks, the player gets a **parry window**. Same beat-press button, this time defending. Quality of parry reduces incoming damage and, on Critical, **steals** one cue from the enemy's attack and replays it as the player's next-turn bonus. Encourages active defense, mirrors Cuphead's parry.

---

## 4. Move taxonomy

Every move belongs to one taxonomy entry. Loader validates.

| Category | Effect | Examples |
|----------|--------|----------|
| **Attack** | Damage | Brass Burst (jazz), Power Chord (rock), Walking Bass (blues) |
| **Buff** | +stat to ally | Crescendo (+ATK), Pianissimo (+DEF) |
| **Debuff** | -stat to enemy | Flat (-TEMPO), Sharp (-FOCUS) |
| **Heal** | +HP/RES | Reprise (+HP), Reverb (+RES over time) |
| **Status** | Inflict condition | Stun (skip turn), Off-Key (no crits), Echo (action repeats next turn) |
| **Field** | Battlefield modifier | Tempo Shift (changes BPM), Key Change (rotates type table) |
| **Improv** | Cross-genre solo/duet | (see §3.5) |
| **Signature** | Per-character ultimate | Sol's "Sol's Phrase"; unlocked at character lvl 30 |

---

## 5. Boss design (the Cuphead piece)

Bosses do not share the standard turn structure. Each boss is a **bespoke encounter** with multiple phases, each phase a hand-crafted pattern.

### 5.1 Phase template

1. **Pattern intro** — boss plays a musical phrase; the player learns it by listening (8–16 beats).
2. **Pattern execution** — boss replays the phrase as attack cues; player parries or attacks during gaps.
3. **Vulnerable window** — when boss's dissonance peaks, a 4-beat opening for player burst.
4. **Phase transition** — boss key-changes; music and animation shift.

### 5.2 Boss requirements (all four Quartet + Cacophony)

- ≥3 phases each.
- Unique music track per boss, dynamic to phase.
- Hand-animated key frames (24fps for actions, 30fps for set-pieces).
- A "tell" sound effect for every pattern (audio-only players must be able to play).
- A defeat sequence ≥6 seconds long.

### 5.3 Final boss (Cacophony) — special structure

Three phases mapped to the three pillars:

1. **"Combat is music"** — standard rhythm fight; phase ends on dissonance peak.
2. **"Instruments are characters"** — the party must duet across genres; failing combos lets Cacophony silence party members one-by-one.
3. **"Every genre is a culture"** — non-combat. The player improvises a duet response to Cacophony's grief. Dialogue choices + rhythm phrasing decide the ending.

### 5.4 Implementation note: phase-clock priming

`BossPhaseRunner.tick(beat, hpFraction)` anchors `phaseStartBeat` on its FIRST call. The battle scene MUST call `runner.start()` once on `enter()`, then call `runner.tick(currentBeat, 1.0)` at least once BEFORE any cue beat would fire. Without this priming tick, the first cue arrives one tick late. This is by design — see `src/game/combat/boss-phase.ts` JSDoc for rationale.

---

## 6. Capture mechanic (recruitment, not capture)

Master of Music does **not** have Pokéballs. Instruments are not caught — they are **convinced to join**. Recruitment requires:

1. Reducing the enemy to <25% HP without killing.
2. Playing a specific genre signal (a 3-cue improvise on their preferred genre).
3. Passing a dialogue prompt (1–3 options, story-aware).

A failed recruitment results in the enemy retreating, not dying. The instrument may be re-encountered later. **No instrument is gated by a single missed encounter.**

---

## 7. Difficulty & accessibility

| Setting | Effect |
|---------|--------|
| Easy | Rhythm windows ×1.5, enemy ATK ×0.7 |
| Standard | Default |
| Hard | Rhythm windows ×0.75, enemy adds +1 cue per attack |
| Symphonic (NG+) | Hard + permadeath option |

**Accessibility-specific:**
- High-contrast cue glyphs (settings toggle).
- Audio-only cue mode (cues are sound-described, no visual required).
- "Auto-rhythm" — selecting Auto on a cue line plays it at Good quality automatically.
- Colorblind-safe palette enforced for all combat UI.

---

## 8. AI design

- **Mooks (trash enemies):** weighted-random action selection biased by their personality archetype. No deep AI.
- **Mid-bosses:** scripted opening 3 turns, then weighted by player state.
- **Quartet bosses:** deterministic phase scripts; player learns and counters.
- **Cacophony:** full scripted; the only "ML-feel" boss in the MVP is bespoke.

No actual neural-network/ML at runtime. Combat is fully deterministic given inputs + seed.

---

## 9. Failure modes & balance levers

| Risk | Lever |
|------|-------|
| Rhythm feels too punishing | Increase default windows; Relaxed-Rhythm default-on for Easy |
| RPG feels too grindy | XP gain scales with battle quality, not battle count |
| Type table feels arbitrary | Tooltip on every move shows current matchup |
| Boss feels unfair | Add a "tell" 0.5s earlier; test with audio-only mode |

---

## 10. Data contract (the one the asset & content tools must respect)

Every move and enemy is a JSON record validated by zod at load. See [`03-TECHNICAL_ARCHITECTURE.md`](03-TECHNICAL_ARCHITECTURE.md) §6 for the schema.

Every boss fight is **also** a JSON encounter spec referencing phase scripts, music cues, animation triggers, and a parry script. Encounter specs live in `src/data/encounters/`. Phase 1 ships the first boss encounter as the schema-defining example.

---

## 11. Out of scope (V1)

- PvP / online play.
- Real-time multiplayer combat.
- Player-vs-player rhythm duels.
- Permadeath as default.
- Player-composable moves (player writes their own MIDI). Cool idea, post-MVP.
