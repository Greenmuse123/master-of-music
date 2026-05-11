# 08 — Audio Design

**Project:** Master of Music
**Document version:** 1.0 (2026-05-11)

> Audio is **gameplay**, not background. This document specifies the audio engine, the dynamic music system, and the score's compositional brief. Implementation lives in `src/engine/audio/` and `src/game/audio/`.

---

## 1. Architectural overview

```
┌──────────────────────────────────────────┐
│  Howler.js  (decoded, scheduled, mixed)   │
└────────┬───────────────────────────────────┘
         │
┌────────▼─────────────────────────────────┐
│  AudioManager (engine/audio)              │
│    - load/unload by manifest              │
│    - mixer buses (music, sfx, ui, voice) │
│    - volume / mute / settings binding     │
└────────┬─────────────────────────────────┘
         │
┌────────▼─────────────────────────────────┐
│  MusicClock (engine/audio)                │
│    - BPM, beat index, beat phase          │
│    - drift-corrects from Howler position  │
│    - emits `beat` events                  │
└────────┬─────────────────────────────────┘
         │
┌────────▼─────────────────────────────────┐
│  DynamicMusic (game/audio)                │
│    - stems per track (bass/drums/keys/sax)│
│    - crossfade, layer in/out by state     │
│    - phase transitions on boss            │
└──────────────────────────────────────────┘
```

**Inviolable:** combat rhythm reads only from `MusicClock`. Combat never reads `performance.now()` for beat timing.

---

## 2. MusicClock contract

```ts
class MusicClock {
  // start the clock at the start of an audio sprite
  start(soundId: string, bpm: number, anchorMs?: number): void;

  // current beat index since start
  beat(): number;

  // phase within the current beat, [0,1)
  beatPhase(): number;

  // seconds until the next on-beat moment from now
  msUntilBeat(target: number): number;

  // subscribe to beat events
  on(event: 'beat'|'bar'|'phase', cb: (data) => void): () => void;

  // drift correction: pull from Howler.seek every 250ms
  reanchor(seekMs: number, bpm: number): void;
}
```

Tests must cover: anchor accuracy ≤2ms, drift recovery within 500ms after a 50ms jitter, monotonicity (beat() never decreases).

---

## 3. Dynamic music system

A track is **not** one MP3. It is a set of **stems**:

| Stem | Always on? | Toggled by |
|------|-----------|------------|
| **Drums** | Yes | Combat starts |
| **Bass** | Yes | Combat starts |
| **Keys** | Default on | Off during enemy parry windows |
| **Lead (Sax)** | Off | On when Sol attacks |
| **FX layer** | Off | On at >50% damage to enemy |

Stems are played as parallel Howler sounds, all anchored to the same `MusicClock`. Volume crossfades are 200–400ms.

Boss fights are special: **phase transitions** key-change and swap stem sets. The MusicClock re-anchors at each key change.

---

## 4. Score brief

The composer (human or AI-assisted) must respect:

- **Five-note motif:** Re-Do-Mi-Sol-Re (transposed per region). The motif appears in every track at least once. Sol's idle sax riff *is* this motif.
- **Per-region tonality:**
  - Jazz City: Bb major / minor 7 jazz vocabulary.
  - Bayou: E minor blues scale.
  - Conservatory: D major, fugue-friendly.
  - Rock Citadel: A minor pentatonic, distortion.
  - Hip-Hop Bloc: Modal, sample-friendly loops.
  - Electronic Wastes: Atonal, 4/4 with polyrhythms.
  - Folk Heartlands: D mixolydian, 6/8 favored.
- **Tempo:** Most combat themes 96–120 BPM. Boss themes may push 140. Beat-based gameplay tightens at higher BPM.
- **Loop hygiene:** All looping tracks have seamless A↔B markers in the OGG metadata. Pipeline tool `loop-edit.ts` enforces.
- **Stem balance:** Each stem mixed standalone to -18 LUFS; combined mix targets -14 LUFS.

---

## 5. SFX design

**Categories:**

| Bus | Examples | Volume default |
|-----|----------|----------------|
| `ui` | Cursor move, confirm, cancel | 80% |
| `sfx-attack` | Sax burst, drum hit, power chord | 100% |
| `sfx-defense` | Parry chime, dissonance flare | 90% |
| `sfx-world` | Doors, ambient drips, wind | 70% |
| `voice` | Brass dialogue chirps, NPC chirps | 90% |
| `music` | Stem mix | 70% |

SFX format: OGG, mono, 22.05kHz, peak -3dBFS. **Every SFX in the pipeline goes through `normalize.ts`.**

**Diegetic SFX = on-beat preferred.** Door slams, weapon impacts, dialogue chirps should align to the nearest beat in combat scenes. The `playOnBeat()` helper schedules them.

---

## 6. Accessibility

| Setting | Effect |
|---------|--------|
| Audio-only cue mode | Cues described in audio ("on the 3 — now"); visual cues become optional |
| Subtitle all SFX | Combat SFX get a small caption ("[sax burst]") |
| Per-bus volume | Independent sliders, persistent |
| Reduce dissonance | Caps the dissonance audio effect intensity |
| Mono mix | One-button mono fold |

---

## 7. Implementation order (Phase mapping)

| Phase | Audio deliverable |
|-------|-------------------|
| 0 | Howler installed, AudioManager facade, mixer buses, settings binding |
| 1 | MusicClock + 1 placeholder loop + 4 SFX (cursor, confirm, hit, miss) |
| 2 | Dynamic stems for combat-jazz + boss-Diminuendo theme; on-beat SFX |
| 3 | Bayou theme + transitions; settings menu audio panel + accessibility toggles |
| 4 | Audio asset pipeline (normalize, loop-edit, sprite-pack) |
| 5 | Remaining region themes + remaining boss themes + dynamic transitions |
| 6 | Polish; subtitle SFX pass; final mix |

---

## 8. AI music generation notes (if used)

- Suno / Udio / MusicGen are valid for *demos*. Final tracks should ideally be human-composed; AI tracks need explicit license confirmation and human EQ/mix pass.
- For MVP placeholder tracks, AI is fine. Mark every AI-generated track as **placeholder** in provenance.
- Generative music *during* gameplay (real-time AI) is **out of scope** — non-deterministic and audio-glitch-prone.

---

## 9. Reference recordings (for moodboard, not for use)

The fresh session should listen to these *before* writing music briefs (note: these are real artists; their music is not assets, only references):

- *Cuphead* OST — for genre-fidelity benchmarks of 1930s jazz reimagined for gameplay.
- *Crypt of the NecroDancer* OST — for rhythm-tied design integration.
- *Sea of Stars* OST — for orchestral pixel-art emotional range.
- *Undertale* OST — for motif reuse across regions.
- *Persona 5* OST — for stylistic confidence within a genre.

This is moodboard work only. Use as briefs to composers, not for direct emulation, and never sample.
