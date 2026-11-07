# Scorecard — Unreal, Actually · Ep 1 "Your head is older than your feet"

## Round 1 — 2026-11-07

**Reviewer:** independent gate pass (did not build the episode).
**Reviewed:** `out/ep01.mp4` (shipped file: 73.41 s, 1080×1920, 30 fps, 2202 frames, 94.8 MB, 10.3 Mb/s), `out/ep01.srt`, `out/timeline.json`, `script.json`, `claims.md`, `out/render-report.md`, `out/cover.png`, `overlay.js`, `engine/film/timing.js`, `engine/sound.py`.
**Method:** I pulled stills at 0.0 / 0.5 / 1.0 / 1.5 / 2.0 s, then one frame every 1.5 s from 2.5 to 73.0 s with the safe-area lines drawn on. I also took full-resolution crops of all small text, measured motion per half-second, re-measured loudness on the shipped file, and ran pause detection on the per-beat voice WAVs.
**Audio caveat:** I cannot hear the film. I judged voice and sound only from the script, the loudness numbers, pause detection on `out/audio/b*.wav` and the synth code in `engine/sound.py`.

### Scores

| | Criterion | Score | Evidence |
|---|---|---|---|
| a | Hook in first 2 s | **4** | The VO line starts at 0.2 s and the Anton "YOUR HEAD IS **OLDER** THAN YOUR FEET" slams in by 0.5 s, so the words land hard and early. The picture is weaker. It is a neon-outline figure with two clocks that look almost the same (only the second hand differs). "AHEAD" (≈1.0 s) sits on the connector line and reads as a label for the line. The burned caption repeats the title word for word (0.5–2.2 s). |
| b | One thread | **4** | The thread is clear: head vs feet → gravity slows time → NIST proof → 90 ns → verdict → stairs → head again. GPS (45.4–57.6 s, about 17 % of runtime) is a detour from head vs feet. The head-vs-feet amount itself is never given, so "by a hair" has no figure behind it. |
| c | Picture moves with the sentence | **3** | Several slams land on their word: GRAVITY (≈7.9), 2010 · NIST (≈22.0), 79 YEARS, REAL (44.4), GPS (47.3), SET SLOW, WRONG, the "+" per step, the hair. The key moments miss. On "The higher clock ticked faster" (33.9–35.9) the lower clock is cut off at the left edge and the frame shows no difference between the clocks. On "And your phone feels it" (45.4–47.2) no phone appears, only an Earth limb and a dot. On "The closer you are to Earth" (11.3–12.6) the frame is an abstract line and a dot. |
| d | Motivated camera | **4** | Every move has a reason: push to the head clock for the counter (2.4–6.4), tilt up the clock column to compare (12.5–13.6), feet→head travel as each is named (15–19), push on the gap then pull back to orbit (36–51). Shakes happen only on impacts. The lab reframe loses the reference clock (lower clock half out of frame from ≈26.5 s), and the column tilt at 12.5–13.5 is close to a whip. |
| e | Voice carries meaning, screen carries figures | **3** | The figures are on screen: 2010 · NIST, 33 cm ≈ 1 ft, 79 YEARS, ≈ 0.000 000 09 s. But voice, caption and screen often say the same thing three times. The hook title and caption match. At 40.5–42.7 a "90 billionths of a second" label sits directly above the caption "ninety billionths of a second". The 90 ns figure gets a count but no comparison, which goes against studio.md §4. |
| f | Rhythm | **3** | The pace is in range: 192 words, 157 wpm overall and 172 wpm while speaking. The problems: about 7 s (22.6–29.8) with no new picture information in the lab, and 13.5 s of near-static lab overall (22.5–36.0), against the channel's "new beat every 1.5–2.5 s". Every gap between beats is exactly 0.25 s, which sounds metronomic and machine-made. The payoff beat b15 runs at 200 wpm, so "By a hair." gets only 0.63 s. |
| g | Ending | **4** | It pays off the hook as a clean ring: "Which means your head really is older than your feet. By a hair." The stairs line ("you just aged a little faster") is the one viewers will repeat, and the film ends on the CASE FILE stamp. Weak spots: the verdict lands 15 s before the end and the card is shown twice. The stairs image (64–67.5 s) is a silhouette walking up into a blown-out white doorway, which reads as "walking into the light" on the word "aged". |
| h | Production value | **3** | The channel look is consistent and on brand: Abyss ground, hard light cone, Horizon/Ultraviolet glow, Anton slams, grain and vignette. Nothing reads as filmed, though, and several assets look like default 3D or placeholders. The GPS satellite (47–51 s) is a box with a cork/noise texture and stock blue panels. The Earth is a soft blue-and-white globe (7–11 s, 46 s). The "map" is untextured purple boxes with a yellow ball (55–57.6 s). The doorway is a flat, clipped white rectangle (63–67.5 s). The neon-outline human silhouette is a stock explainer trope. |

### Verdict: **FAIL**

1. (h) = 3. The gate needs ≥ 4.
2. One factual item is open (F1 below).

All other scores are ≥ 3, and (a) and (g) are at the minimum of 4.

### Factual and ethical items

- **F1 — OPEN (blocking).** The on-screen counter "head +0.000 000 000 001 s" (b02, about 4.9–6.4 s) is not in `claims.md`. It is also wrong by orders of magnitude. Paired with "Every second you're standing", it suggests the head gains about 1 ps in about 2 s. The real rate for a 1.7 m height difference is gh/c² ≈ 1.9 × 10⁻¹⁶ s per second, so it takes about 1.5 hours of standing to gain 1 ps. The counter is thousands of times too fast. `overlay.js` line 29 hard-codes the digits.
- **F2 — weak hedge (fix required).** The required "speeds exaggerated" label (b04) is 28 px Haze text, on screen for only about 1.6 s (12.3–13.9), and partly covered by a clock rim at 13.0 s. In practice it can't be read. The hook and b05 clocks also run at stylised rates and carry no label.
- **F3 — process note for Bruce (not counted as open).** studio.md §5 says a *person* opens the source, but `claims.md` is self-certified by Claude. The table is also missing the required "checked by" and "date" columns. Bruce should spot-check C3–C5 and C7, or confirm that an AI check is enough.
- C1–C8 as spoken match their quoted sources. The numbers on screen that are covered by claims (2010, NIST, 33 cm ≈ 1 ft, 79 years, ≈ 0.000 000 09 s) are correct: 9.81 × 0.33 / c² × 79 yr ≈ 90 ns.

### Defects, ranked by impact

1. **False figure on screen:** the b02 picosecond counter (F1).
2. **Default-3D or placeholder assets:**
   - GPS satellite with cork texture and saturated blue panels (45.4–51 s).
   - Day-side blue/white Earth (7–11.3 s, 45.4–47 s), which is off palette.
   - Untextured box city with a yellow-ball "pin" that does not read as a map pin (54.8–57.6 s).
   - Clipped white doorway (63–67.5 s).
3. **The proof beat doesn't prove anything on screen:**
   - The lower reference clock is cropped at the left edge from ≈26.5 s to 36 s.
   - "33 cm ≈ 1 ft" floats beside a short white line instead of a dimension line spanning the two clocks.
   - Nothing shows the higher clock running faster (33.9–35.9 s).
4. **Morbid accidental read:** a silhouette climbs stairs into a white light on "you just aged a little faster" (64–67.5 s).
5. **Captions over key objects:**
   - Clocks 3–4 of the column (13.0–14.6 s).
   - The feet clock (17.4–18.5 s).
   - The climbing figure's torso (63–67.5 s).
   - Figure and connector at "By a hair." (71.0–71.6 s).
6. **Hedge label unreadable** (F2), 12.3–13.9 s.
7. **No phone on "your phone"** (45.4–47.2 s). Several frames are nearly empty: 11.5 s (line and dot), 37.0 s (ghosted 79 YEARS and a small ring), 46.0 s (Earth limb and a dot, top 60 % empty).
8. **Sync is estimated, not aligned.** `engine/film/timing.js` `W()` places words by character share of the beat. Pause detection on `b13.wav` shows the rule caption "The higher you are…" (58.9 s) leading the voice by about 0.3–0.4 s. `b06.wav` has a probable 0.39 s TTS pause after "U.S." (at ≈24.5 s, mid-phrase, likely the dotted abbreviation read as a sentence end).
9. **Duplicated text:**
   - Hook title and caption (0.5–2.2 s).
   - "90 billionths of a second" label plus caption (40.5–42.7 s).
   - Small decorative labels at about 28 px that do no work at phone size: FAST/SLOW knob tags (52–54 s).
10. **Off-palette or muddy colour:**
    - Blue Earth and blue panels.
    - Brown satellite body.
    - Blown-out white/yellow door.
    - "REAL" rendered as Horizon at low alpha, which reads brown and muddy (44.4–45 s).
11. **Safe area (minor):**
    - The hook title exits upward through the top 8 % (2.4–2.9 s; text reaches y ≈ 18 px).
    - "FASTER" sits at y ≈ 142–200 px (12.7–14.6 s), about 12 px into the top 8 % zone.
    - No text in the bottom 20 % or the right 12 %.
12. **Sound on phones (inferred, not heard):**
    - The hits are 31–106 Hz sines and the bed is a 43 Hz drone at −36 dB. Phone speakers barely reproduce that range, so on phones the mix will be close to dry TTS plus ticks and noise sweeps.
    - There is no music bed.
    - LRA is 2.1 LU (very flat).
    - The voice is the stock Kokoro `am_michael` voice, which works against "not AI-generated".
13. **Paperwork:**
    - `out/render-report.md` describes the 957 MB wip render (104 Mb/s), not the shipped 94.8 MB file at 10.3 Mb/s. I re-measured loudness on the shipped file: −14.2 LUFS, LRA 2.1, so that number holds.
    - The `script.json` visual notes still describe "paper and ink" and contradict both the channel sheet and the build.
    - Very short SRT cues: "True." 0.32 s, "Barely." 0.46 s.

### FIX LIST (round 1 → round 2)

1. **Remove or correct the b02 counter (2.4–6.4 s).** Replace the digit string with a number-free "AHEAD" meter that creeps up slowly. If a figure stays, it must be sourced, added to `claims.md` as OK, and matched to its time base, e.g. "+0.000 000 000 001 s" labelled "after ~1.5 h standing". *(Unblocks F1.)*
2. **Make the hedge readable (11.3–14.6 s).** Show "speeds exaggerated" at ≥ 40 px in Static on an Abyss backing for all of b04, clear of every clock. Add the same small tag on the hook and b05 clocks if their hands run at visibly different rates. *(Closes F2.)*
3. **Rebuild the three weakest 3D assets on the channel palette.**
   - **GPS satellite (45.4–51 s):** near-black body with gold-foil or brushed-metal panels under a hard key light, an Ultraviolet rim, and dark solar cells with Horizon edge glints. No noise texture, no saturated blue.
   - **Earth (7–11.3 s and 45.4–47 s):** the night side, with city lights in Horizon and a thin Ultraviolet atmosphere rim.
   - **Map (54.8–57.6 s):** a flat phone-map street grid in Haze lines with a proper Horizon pin and shadow. The pin drifts along a dashed trail, then snaps back.
4. **Make the NIST compare legible (20.2–36.1 s).**
   - Lock a wider frame so both clocks stay fully in shot from 26.5 s to 36 s.
   - Draw a true dimension line with arrowheads from the lower clock face to the upper one, with "33 cm ≈ 1 ft" at ≥ 56 px.
   - On "The higher clock ticked faster" (33.9 s), show the difference: reuse the b04 rate bars (upper 3 lit vs lower 2), or make the upper tick spray visibly denser.
   - Break the static 22.6–29.8 s stretch with an event every ~2 s: bench draws in, clock A lands, clock B lands, "atomic clock" tag, staircase draws.
5. **Re-stage the stairs beat (62.9–67.5 s).** Show the figure side-on climbing lit steps on Abyss, with the head clock beside it and a Horizon "+" per step. No glowing doorway, no white clipping, and the caption kept off the figure.
6. **Put a phone on "And your phone feels it" (45.4–47.2 s).** A hand-held phone with the map pin, then the pull-back and rise to the satellite. This sets up the map payoff at 54.8 s.
7. **Clear caption collisions and safe-area edges.**
   - Keep key objects above about y = 1250, or move the caption band per shot, at 13.0–14.6, 17.4–18.5, 63–67.5 and 71.0–71.6 s.
   - Move "FASTER" (b04) down to y ≥ 170 px.
   - Fade the hook title instead of sliding it up through the top 8 % (2.4–2.9 s).
8. **Align sync to the real audio.**
   - Replace the character-share `W()` timing with forced word alignment of `out/audio/b*.wav`, then re-time captions and slams. In b13 the rule caption must start when "The higher" is spoken (≈59.3 s).
   - Respell "a U.S. lab" as "a US lab" to remove the mid-phrase pause.
   - Vary the gaps between beats: about 0.1 s inside an idea, 0.5–0.7 s before "Sounds made up.", "The verdict?" and "So next time".
   - Slow b15 to about 0.92 so "By a hair." breathes.
9. **Cut duplicate text and add one comparison.**
   - Hide the burned caption while the hook title is on screen, or drop the title to a single key word (0.5–2.2 s).
   - Delete the "90 billionths of a second" label (40.5–42.7 s).
   - If a comparison for 90 ns is wanted, per §4 (e.g. how far light travels in that time), source it and add it to `claims.md` first.
10. **Make the sound work on a phone and refresh the paperwork.**
    - Give hits and swells audible upper content: a 100–300 Hz body with saturation and a 2–4 kHz transient.
    - Add a quiet tonal music bed under the VO, and allow more dynamics than LRA 2.1.
    - Regenerate `out/render-report.md` and the contact sheet from the shipped `out/ep01.mp4`.
    - Update the `script.json` visual notes to match the build.
    - Add "checked by" and "date" columns to `claims.md` (F3).
