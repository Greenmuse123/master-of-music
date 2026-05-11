# 01 — Game Design Document

**Project:** Master of Music
**Working title status:** Final unless playtest objects
**Document version:** 1.0 (2026-05-11)

---

## 1. Vision statement

> *In a universe held together by music, the silence is winning. You are the last jazz saxophonist who can play it back into being — one improvised duel, one resurrected instrument, one rediscovered genre at a time.*

Master of Music is a **single-player 2D pixel-art action-RPG** that fuses three pillars: the **collectible-party loop of Pokémon**, the **timed, hand-crafted boss spectacle of Cuphead**, and an original **rhythm-improvisation layer** in which every combat input is also a musical phrase. The world is an ensemble of living instruments and the musicians who play them; combat is performance; storytelling is genre.

---

## 2. Design pillars

The three pillars below are inviolable. Every feature, asset, and line of dialogue must serve at least one. Features that serve none get cut.

### Pillar 1 — "Combat is music"
Every action in a battle produces a musical note or phrase. The player's button presses build melodies; enemies counter with their own. Rhythm timing modifies damage (early/late/perfect/critical-on-the-beat). Boss themes are dynamic — they respond to what the player plays. *If a screenshot shows combat with no visible musical feedback, the design has failed.*

### Pillar 2 — "Instruments are characters"
Every party member is a living instrument (sax, trumpet, piano, drum, bass, violin, etc.) with personality, dialogue, preferred genre, and a unique combat moveset. They are not weapons. They have arcs. They can refuse to fight. They can quit the band. *If you can swap an instrument's sprite without changing the story, the design has failed.*

### Pillar 3 — "Every genre is a culture"
The world is divided into musical kingdoms — Jazz City, the Blues Bayou, the Classical Conservatory, the Rock Citadel, the Hip-Hop Bloc, the Electronic Wastes, etc. — each with its own visual style, dialect, NPCs, side-quests, and combat rules. The protagonist must respect, learn from, and ultimately unify these cultures, not conquer them. *If a region's only difference is a palette swap, the design has failed.*

---

## 3. Unique selling proposition

1. **Dynamic music as the core mechanic.** Not background — *the* mechanic. The closest reference is *Crypt of the NecroDancer*, but Master of Music is turn-based-with-action-windows, not on-rails, and the music is jazz-improvised rather than fixed-loop.
2. **A Pokémon-shaped narrative with a Cuphead-shaped spectacle.** You build a band, you grow attached to it, you face hand-animated boss encounters that look like album covers come alive.
3. **A music-theory-rich setting that is welcoming, not gatekept.** No prior musical knowledge required to play. The game teaches concepts (call-and-response, key, tempo, dissonance, syncopation) through gameplay verbs.

---

## 4. Genre fusion summary

| Pokémon contributes | Cuphead contributes | Master of Music adds |
|---|---|---|
| Party of 4–6 companions | Boss-focused encounter design | Beat-clock rhythm windows |
| Overworld + town + battle structure | Hand-crafted boss animation | Genre-specific combat rules |
| Type / element matchup table | Bullet-hell defensive patterns | Improvisation phrases as moves |
| Long-arc, optimistic JRPG story | Surreal, art-forward visuals | Music-theory progression |
| Turn-based core | Parry + dodge mini-games | Branching narrative by genre allegiance |

---

## 5. Target audience

- **Primary:** Indie-game players 18–40 who own and love both Pokémon and Cuphead and are hungry for fresh hybrids (Hades, Sea of Stars, Crypt of the NecroDancer, Undertale audience).
- **Secondary:** Musicians, music students, jazz fans who rarely buy games but would buy this one. Marketing should reach them via music YouTube and Bandcamp, not gaming press alone.
- **Tertiary:** Streamers and Let's-Players — the dynamic music is inherently watchable.

**Excluded:** Children under 10 (combat reading load too high), competitive-PvP audiences (no PvP in scope).

---

## 6. Scope (MVP definition)

The **MVP / vertical-slice / "first playable"** must contain, end-to-end:

1. Title screen → save select → intro cinematic (in-engine) → first town.
2. **One overworld region** (Jazz City + 1 surrounding zone), fully traversable.
3. **One full battle system implementation** with: party of up to 3, 4 moves each, rhythm windows, type/genre table, win/lose/flee.
4. **One boss fight** of Cuphead-grade craft.
5. **3 instrument companions** recruitable, each with unique movesets and dialogue.
6. **Save/load** to IndexedDB.
7. **Settings menu** (volume, key remap, accessibility — high-contrast mode, reduced-rhythm-strictness mode).
8. **1 hour of playable content minimum, 2 hours target.**

Anything beyond this is **post-MVP** and lives in [`07-ROADMAP.md`](07-ROADMAP.md).

### Explicitly out of scope (forever or for V1)
- Multiplayer (PvP or co-op) — out of V1.
- Mobile port — out of V1; design considers it for V2.
- Procedural dungeon generation — out forever. This is a hand-crafted game.
- DLC content delivery system — out of V1.
- Real-money microtransactions — out forever.

---

## 7. Platform & tech summary

- **Build target:** Web (browser, desktop-class). Itch.io distribution first. Steam wrapper (Tauri or Electron) later.
- **Resolution:** Native render 480×270 (16:9, scales cleanly to 1920×1080 = 4x). Letterbox at non-16:9.
- **Frame rate:** 60fps locked. 30fps fallback toggle in settings.
- **Input:** Keyboard primary, gamepad supported (Xbox + DualSense), touch deferred to mobile port.

Full stack rationale in [`03-TECHNICAL_ARCHITECTURE.md`](03-TECHNICAL_ARCHITECTURE.md).

---

## 8. Visual direction

**Reference triangulation:** *Cuphead* (line quality, expressive faces, surreal staging) ⇄ *Octopath Traveler* (HD-2D depth, dramatic lighting) ⇄ *Hyper Light Drifter* (palette discipline, silhouette readability).

**Constraints:**
- Sprite resolution: characters 32×48 base, bosses up to 128×128, world tiles 16×16.
- Palette: per-region palettes of 24 colors max, locked at design time.
- Animation: 12fps for character idles, 24fps for combat actions, 30fps for boss set-pieces.
- No anti-aliasing. No sub-pixel positioning.

The visual direction is described as **"a Pokémon Gen-3 sprite that escaped into a 1930s cartoon."**

---

## 9. Tone & rating

- **ESRB target:** E10+. Comic mischief, mild fantasy violence (no blood), no language stronger than "damn."
- **Tone:** Earnest, warm, occasionally absurd. Cuphead's visual surrealism, *Undertale*'s emotional sincerity, Pokémon's optimism. Not grimdark.
- **Themes addressed:** Unity-through-difference, artistic legacy, the relationship between performer and instrument, grief (the loss of the Great Unison), creativity as resistance.

---

## 10. Success criteria

The game ships successful when:

1. A player who has never used a metronome can complete the MVP without consulting external help.
2. A player who plays a real instrument tells us the combat "feels like jamming."
3. The game has a Metacritic-equivalent or itch.io rating ≥4.5/5 across ≥100 reviews within 6 months.
4. At least one music YouTube channel (not a gaming channel) covers the game on its own merits.

Tracked in [`07-ROADMAP.md`](07-ROADMAP.md) Phase 6 (Beta).
