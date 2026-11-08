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

---

## Round 2 — 2026-11-08

**Reviewer:** independent gate pass (did not build the episode).
**Reviewed:** `out/wip/ep01.mp4` (73.10 s, 1080×1920, 30 fps, 2193 frames, 84.7 MB, 9.27 Mb/s), `out/ep01.srt`, `out/timeline.json`, `script.json`, `claims.md`, `out/render-report.md`, `out/cover.png`, `overlay.js`, `engine/film/timing.js`, `engine/sound.py`.
**Method:** I pulled stills at 0.0 / 0.5 / 1.0 / 1.5 / 2.0 s, then one frame every 1.5 s from 2.5 to 73.0 s, plus closer frames at 8.5, 17.6, 32.8, 34.6, 45.2, 47.6 and 70.8 s and the cover. I also ran pause detection on `out/audio/b13.wav` against the SRT cues.
**Audio caveat:** I cannot hear the film. I judged sound only from the render report, `engine/sound.py` and pause detection.

### Scores

| | Criterion | R1 | R2 | Evidence |
|---|---|---|---|---|
| a | Hook in first 2 s | 4 | **4** | **What works:** the VO starts at 0.2 s and the Anton title is up by 0.5 s. The burned caption no longer repeats the title (0.5–2.4 s). **What's unchanged from R1:** the neon-outline figure; two clocks that differ only by hand position; "AHEAD" still sitting on the connector line (1.0 s); and the bottom ~55 % of the frame is empty floor. |
| b | One thread | 4 | **4** | Same script, same clean thread. GPS (44.5–56 s, ~16 % of runtime) is still a side trip, tied back through "your phone" and the map. The head-vs-feet amount is still never given. |
| c | Picture moves with the sentence | 3 | **4** | **Now landing on its word:** rate bars plus FASTER/SLOWER (13.0–14.6); feet→head travel (16–19); the clock rises on "raised one by about a foot" (31.0); a pin "phone" on "your phone" (44.5); pin plus WRONG (55.0); "+" per step (64–67); a hair grows on "By a hair" (70.8). **Misses:** both atomic clocks arrive at 22.0 / 23.5 s, about 5 s before "two super-precise atomic clocks" (27.5–29.3), which then gets nothing new. "The higher clock ticked faster" (33.1–34.9) is shown only by a small orange bar over a clock about 135 px wide. 35.0–36.8 is a near-empty frame (a small ring) under "Over a whole seventy-nine year life". |
| d | Motivated camera | 4 | **4** | Moves are still motivated: push to the head clock (2.4–6.4), the clock column, feet→head travel, pull back to orbit. The lab is now a locked wide with both clocks fully in shot. At that size the clocks are tiny, and the frame holds for about 14 s (20.4–34.9). The b05 travel crops the figure at the left edge and the feet clock at the bottom (16–18.5). |
| e | Voice carries meaning, screen carries figures | 3 | **4** | The worst repeats are gone: the hook caption and the "90 billionths" label. The figures are on screen (2010 · NIST, 33 cm ≈ 1 ft, 79 YEARS, ≈ 0.000 000 09 s), and the voice says what they mean ("far too small to feel"). **Still repeated:** SET SLOW / BEFORE LAUNCH sits over a caption with the same words (52–53.7). The 90 ns figure still has no comparison (§4). |
| f | Rhythm | 3 | **4** | **Fixed:** gaps now vary from 0.15 to 0.6 s; b15 is slowed to 0.92, so "By a hair." holds ≈ 0.87 s; lab events land at 22 / 23.5 / 25 / 31 / 32.5 / 34 s. 192 words in 73.1 s is ≈ 158 wpm, on target. **Holes left:** 25–31 s (only the laser drifts), 35.0–36.8 (near-empty), and the rack unit (50–53.7), which is one frame with a knob turning. |
| g | Ending | 4 | **4** | It rings back to the opening frame (68.5–70), and a single Horizon hair sprouts on "By a hair" (70.8), which is a good button. The stairs no longer read as "walking into the light" (62.5–67). **What keeps it off 5:** the verdict lands at 58 s; the case-file card plays twice (56.4–61 and 71.3–73.1); and "By a hair." gets under 1 s before the cut to the card. |
| h | Production value | 3 | **3** | **Better and on palette:** the map grid and pin (55), the stairs (62–67), the rack unit (50–54), the verdict card and the 79-year filament all look designed. **Still a motion-graphics template, not filmed CG:** <br>• **Earth** is still the day-side blue globe with white clouds (7–11.4, 46 s). <br>• **Satellite** is a box with a noisy texture and a literal clock face, flat blue-grey panels and a disc-on-a-stick dish (46–50). <br>• **"Lab"** is a row of neon bars with a floating sine wave and tiny clocks (20–35). <br>• **"Phone"** is a wireframe grid rectangle in orange haze over a flat pink plane (44.5–45.9). <br>• **Neon-outline human** is a stock explainer trope, and it carries the most-seen frames (hook, cover, b05, stairs, ending). |

### Round-1 fix list: status

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Remove the b02 counter | **Done** | A number-free AHEAD meter is on screen (4.0–5.5 s). **Leftover:** `script.json` b02 `screen` still lists "head +0.000 000 000 001 s". |
| 2 | Readable hedge | **Partly** | **Done:** the b04 tag is 40 px. **Not done:** it shows only ≈ 12.6–14.1 s (about 1.5 s of the 3.2 s beat). On the hook, b05 and the ending it is 30 px (`overlay.js` l.22) and overlaps the connector or FEET label (17.6, 19.0). |
| 3 | Rebuild satellite / Earth / map | **Partly** | **Map:** done (55.0). **Satellite:** partly. It is darker and has a dish, but keeps the noise texture, blue-grey panels and a clock face, with no foil and no hard key. **Earth:** not done, still day-side blue and white (8.5). |
| 4 | Legible NIST compare | **Partly** | **Done:** both clocks are in shot and events were added. **Not done:** the "dimension line" is a leader from the label, not an arrowed line spanning the clocks. The "faster" proof is a small bar. The clocks are about 135 px and land about 5 s before the line that names them. |
| 5 | Re-stage the stairs | **Done** | Side-on figure, lit steps, "+" per step, no doorway, caption clear of the figure. |
| 6 | Phone on "your phone" | **Partly** | It is a wireframe grid with a pin. There is no device body and no hand, and it sits in a muddy orange and pink frame. |
| 7 | Captions and safe area | **Partly** | **Done:** FASTER moved to y ≈ 245; the hook title fades; 13.0–14.6 and the stairs are clear. **Not done:** 17.4–18.5, where the caption still covers the feet clock (17.6). "By a hair." slightly overlaps the figure's arm. |
| 8 | Sync to real audio | **Done (phrase level)** | The b13 cues "True." and "The higher…" sit within ≈ 20 ms of the voiced onsets in `b13.wav`. "US" is respelled for TTS, gaps are varied, and b15 is at 0.92. Word slams inside a phrase still use character share (`timing.js` l.14), but now only over the voiced spans. |
| 9 | Cut duplicate text | **Done** | No hook caption under the title, and no "90 billionths" label. A §4 comparison was not added (it was optional). |
| 10 | Phone-audible sound and paperwork | **Partly** | **Done:** hits gained a 2–5.5 kHz click and a 150–400 Hz knock; a Dm9 pad plus pulse bed was added at −30 dB; the render report now describes this render; claims.md has "checked by" and "date" columns. **Not done:** LRA is now 1.9 LU (it was 2.1). `out/ep01.mp4` is still the round-1 file (94.8 MB, 7 Nov). `script.json` `screen` fields are stale. claims.md is still titled "Reality Rulebook". |

### Factual and ethical items

- **F1 — CLOSED.** No figure is shown for the head's gain. The AHEAD meter has no units. Delete the stale string from `script.json` so a rebuild can't bring it back.
- **F2 — partly fixed, not blocking.** The hedge is present and readable at 40 px in b04, and tiny (30 px) elsewhere. It is on the fix list below.
- **F3 — process note for Bruce (unchanged).** `claims.md` is still certified by Claude, not by a person (§5). Bruce should spot-check C3–C5 and C7, or accept an AI check.
- **On-screen and spoken audit:** every line maps to an OK claim. 2010 · NIST → C3; 33 cm ≈ 1 ft → C4; 79 YEARS and ≈ 0.000 000 09 s → C5 (90 × 10⁻⁹ s ✓); SET SLOW BEFORE LAUNCH → C7; WRONG → C8; TRUE plus the rule → C2; FASTER/SLOWER/AHEAD → C1/C2; the stairs line → C4. **Nothing factual is open.**

### Verdict: **FAIL**

(h) = 3, and the gate needs ≥ 4. Everything else clears: no score < 3, (a) = 4, (g) = 4, nothing factual open.

### FIX LIST (round 2 → round 3)

1. **Night-side Earth (7.0–11.4 s and 45.9–49 s).** This is round-1 fix 3, not yet done.
   - Near-black land and ocean, with Horizon city-light clusters (an emissive map or instanced points).
   - A thin Ultraviolet fresnel atmosphere rim, and a hard terminator with the sun behind the limb.
   - No blue ocean, no white clouds.
2. **Rebuild the lab as a real optical-clock bench, and make the proof readable on a phone (20.4–35.0 s).**
   - Build an optical table with a breadboard hole grid and steel posts and mounts under a hard key light. Show the laser with visible haze scatter. Delete the neon bars and the floating sine wave.
   - Push in until each clock housing is ≥ 300 px wide.
   - Use 20.4–27.5 for the bench, the laser and 2010 · NIST. Land the two clocks on "two super-precise atomic clocks" (≈ 27.5–29.3).
   - Draw a vertical dimension line with arrowheads between the two clock centres, labelled "33 cm ≈ 1 ft".
   - On "The higher clock ticked faster" (33.1–34.9), give each clock a b04-size rate bar or tick train: upper 3 lit, lower 2.
3. **Replace the hollow neon-outline human (0–2.4, 15–20, 62–71.3 s and the cover).**
   - Make it a solid dark figure lit like a person on a stage: a hard key from above-left, a Horizon rim on one edge and an Ultraviolet rim on the other, a floor contact shadow, light haze, and a slight breathing or weight shift. Give the stairs figure the same treatment.
   - Keep the clocks, the HEAD/FEET tags and the hair gag.
   - On the hook, move "AHEAD" off the connector line and raise the composition so empty floor doesn't fill the bottom half.
4. **Satellite and phone (44.5–50 s).**
   - **Satellite:** swap the noisy body texture for crinkled gold/black foil (metallic, roughness ≈ 0.35, normal map). Use near-black solar cells with a fine grid and a specular glint that travels with the camera, and a hard sun key from one side. Remove the literal clock face from the body; use a small inset or tick ring instead.
   - **Phone:** a solid black-glass handset with rounded corners and a bezel, held in a dark hand. Its screen shows the same dark map and pin as 55 s, on Abyss. No wireframe rectangle, no orange haze over a pink plane.
5. **Captions, hedge and empty frames.**
   - At 17.4–18.5, move the caption band to the top, or frame the feet clock above y ≈ 1250.
   - Make "speeds exaggerated" ≥ 40 px everywhere (`overlay.js` l.22 is 30 px). Keep it up for all of b04 (11.4–14.6) and clear of the connector and FEET label (19.0).
   - Start the 79-year filament on "Over a whole" so 35.0–36.8 isn't empty.
   - Optional (§4): a comparison for 90 ns, sourced and added to `claims.md` as OK first.
6. **Sound, paperwork and shipping.**
   - Raise the hits, swells and the TRUE stamp 4–6 dB above the bed, with the bed ducking under the VO. Target LRA ≥ 4 at −14 LUFS (now 1.9 LU).
   - Consider a less stock voice than Kokoro `am_michael`. I can't hear it; this is about the owner's "not AI-generic" brief.
   - Delete the stale `script.json` `screen` entries: b02 "head +0.000 000 000 001 s" and b09 "90 billionths of a second".
   - Retitle `claims.md`, which is still titled "Reality Rulebook".
   - Copy the approved render over `out/ep01.mp4`, which is still the round-1 file.

---

## Round 3 — 2026-11-08

**Reviewer:** independent gate pass (did not build the episode).
**Reviewed:** `out/wip/ep01.mp4` (73.10 s, 1080×1920, 30 fps, 2193 frames, 86.7 MB, 9.49 Mb/s), `out/ep01.srt`, `out/timeline.json`, `script.json`, `claims.md`, `out/render-report.md`, `out/cover.png`, `overlay.js`, `scene.js`, `engine/sound.py`.
**Method:** I pulled stills at 0.0 / 0.5 / 1.0 / 1.5 / 2.0 s and two contact sheets with one frame every 1.5 s from 3.0 to 72.0 s, each with its exact timestamp burned in. I also took closer frames at 18.0, 25.5, 30.5, 31.8, 33.8, 45.0, 47.5, 69.0 and 70.9 s, a verdict strip from 56.4 to 57.7 s, and the cover.
**Audio caveat:** I cannot hear the film. I judged sound only from the render report and `engine/sound.py`.

### Scores

| | Criterion | R1 | R2 | R3 | Evidence |
|---|---|---|---|---|---|
| a | Hook in first 2 s | 4 | 4 | **4** | **What works:** the VO starts at 0.2 s and the title is up by 0.5 s. The figure is now solid and rim-lit. "AHEAD" sits to the right of the connector, not on it (1.0). The 40 px hedge is visible from 0.0 s. Empty floor is down to about the bottom 25 %. **What keeps it off 5:** the two clocks still differ only by hand position and glow colour, so the picture doesn't show "older" at a glance. |
| b | One thread | 4 | 4 | **4** | The script is unchanged and the thread is still clean. GPS (44.5–56 s) is still a side trip, tied back through the phone and the map. |
| c | Picture moves with the sentence | 3 | 4 | **5** | **All three R2 misses are fixed:** <br>• The atomic clocks land on "two super-precise atomic clocks" (26.7–27.5). <br>• "The higher clock ticked faster" gets b04-size rate bars, upper 3 lit and lower 2 (33.8). <br>• The 79-year filament is already up when "Over a whole" starts (34.5). <br>**Also landing on its word:** a real handset on "your phone" (45.0); the FAST inset on "clocks run fast" (47.5); the TRUE stamp at 57.45 on "True." (cue 57.44); "+" per step on the stairs; the hair on "By a hair" (70.9). |
| d | Motivated camera | 4 | 4 | **4** | **Better:** the lab now pushes in, so the clocks are about 320 px wide (31.8). **Still cropped:** the b05 travel cuts the figure at the left edge (15–18). In the hair payoff the figure is half out of frame (70.9). |
| e | Voice carries meaning, screen carries figures | 3 | 4 | **4** | The figures are on screen and the voice says what they mean. **Still repeated:** SET SLOW / BEFORE LAUNCH sits over a caption with the same words (51.0–53.7). The 90 ns figure still has no comparison (§4, optional). |
| f | Rhythm | 3 | 4 | **4** | **Fixed:** the 35–36.8 hole is gone. The lab now has an event every ~1.5 s from 27 to 34 s. **Still slow:** 21.0–26.5 is a sparse bench with small events and the top ~40 % of the frame empty. The rack unit (49.5–53.7) is still one frame with a knob turning. The mix is still flat (LRA 1.9 LU). |
| g | Ending | 4 | 4 | **4** | **Works:** it rings back to the opening frame, and the hair gag lands (70.9). **What keeps it off 5:** the verdict card plays twice (57.4–61 and 71.3–73.1). "By a hair." gets about 0.87 s before the cut. The ending captions now cross the feet clock (67.5–69.0, "is older than your feet." runs over the FEET clock face). |
| h | Production value | 3 | 3 | **4** | **Every asset flagged in R2 is rebuilt, on palette:** <br>• **Earth:** night side, Horizon city clusters, thin rim, no blue and no clouds (7.5–10.5). <br>• **Lab:** optical breadboard with a hole grid, steel posts and a laser. The neon bars and sine wave are gone (25.5, 30.5). <br>• **Figure:** solid, with a hard key, two-colour rims and a contact shadow, on the hook, b05, stairs, ending and cover. <br>• **Satellite:** crinkled gold-foil body, dark gridded cells with a travelling glint, and no clock face on the body (47.5). <br>• **Phone:** a black-glass handset in a hand, with the same dark map and pin as 54 s (45.0). <br>Nothing now reads as a placeholder. **4, not 5. It reads as polished stylised CG, not filmed:** <br>• The figure is a ball-jointed artist's mannequin. <br>• The clock housings are grey boxes with wall-clock faces. <br>• The satellite is two stacked blocks with a glowing saucer dish. <br>• The hand has capsule fingers. <br>• "REAL" is still muddy brown (43.5). <br>• Sets are sparse: the upper halves at 21–26.5 and 45.0 are empty, and 42.0 is a lone streak. |

### Round-2 fix list: status

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Night-side Earth | **Done** | 7.5–10.5 and the 46.5 limb: dark sphere, Horizon city clusters, thin rim. |
| 2 | Optical-clock bench, readable proof | **Done** | **Done:** breadboard, posts and laser; clocks about 320 px; the clocks land on their line (26.7–27.5); an arrowed dimension line between the clock heights with "33 cm ≈ 1 ft" (31.8); rate bars 3 vs 2 (33.8). **Leftovers:** no visible haze scatter on the laser; the top ~40 % of the frame is empty from 21 to 34 s; the label is about 40 px. |
| 3 | Replace the neon-outline human | **Done** | A solid rim-lit figure with a contact shadow in every figure scene and on the cover. AHEAD is off the connector (1.0) and the composition is raised. **Leftover:** the figure is cropped at the left edge (15–18, 70.9). Breathing can't be judged from stills. |
| 4 | Satellite and phone | **Mostly done** | **Done:** foil body, dark cells, glint, and a FAST inset instead of a clock face (47.5); a handset in a hand with the map and pin (45.0). **Leftovers:** the dish is still a glowing disc on a stick; the hand is made of capsule shapes. |
| 5 | Captions, hedge, empty frames | **Mostly done** | **Done:** the feet clock is clear of the caption at 18.0; the hedge is 40 px everywhere (`overlay.js` l.22 and l.41) and up for all of b04; the filament starts on "Over a whole" (34.5). **New:** the ending captions cross the feet clock (67.5–69.0). The optional 90 ns comparison is not added. |
| 6 | Sound, paperwork, shipping | **Partly** | **Done:** the stale `script.json` screen strings are gone (b02, b09); `claims.md` is retitled; the render report matches this render (86.7 MB). **Not done:** LRA is still 1.9 LU against a target of ≥ 4. The voice is still Kokoro `am_michael`. `out/ep01.mp4` is still the round-1 file (94.8 MB, 73.41 s, 7 Nov). |

### Factual and ethical items

- **F1 — CLOSED** (unchanged).
- **F2 — CLOSED.** "speeds exaggerated" is 40 px and readable on the hook, all of b04, b05 and the ending.
- **F3 — process note for Bruce (unchanged).** `claims.md` is still certified by Claude, not by a person (§5). Bruce should spot-check C3–C5 and C7, or accept an AI check.
- **F4 — new, not blocking.** The lab rate bars (33.1–34.9) show the upper clock at 3 vs 2 for an effect of about 4 × 10⁻¹⁷, with no "speeds exaggerated" tag. That is the same kind of exaggeration as b04, but it sits on the real NIST clocks. The bars carry no figure and the spoken claim (C4) is OK, so this item is not open. I asked for these bars in R2, so the missing tag is partly my miss. Add the tag before upload.
- **On-screen and spoken audit:** <br>• AHEAD / HEAD / FEET / FASTER / SLOWER / SLOW / FAST → C1/C2 <br>• 2010 · NIST → C3 <br>• 33 cm ≈ 1 ft → C4 <br>• 79 YEARS and ≈ 0.000 000 09 s → C5 <br>• REAL → C5 <br>• GPS and the FAST inset → C6 <br>• SET SLOW BEFORE LAUNCH and the FAST/SLOW knob → C7 <br>• pin drift and "wrong" → C8 <br>• CASE FILE 001 / TRUE / the rule → C2 <br>• "+" per step → C4 <br>All are OK rows. **Nothing factual is open.**

### Verdict: **PASS**

No score is below 3. (a) = 4, (g) = 4 and (h) = 4. Nothing factual or ethical is open.

### Before upload (non-blocking; does not reopen the gate)

1. Copy `out/wip/ep01.mp4` over `out/ep01.mp4`, which is still the round-1 file, and regenerate `out/contact-sheet.jpg` from it.
2. Add the 40 px "speeds exaggerated" tag during the lab rate bars (33.1–34.9) (F4).
3. Keep the ending captions off the feet clock (67.5–69.0). Move the band up beside the connector, or frame the clocks higher.
4. Next episode, not this one: get LRA ≥ 4 (hits and the TRUE stamp 4–6 dB over the bed) and audition a less stock voice than `am_michael`.
