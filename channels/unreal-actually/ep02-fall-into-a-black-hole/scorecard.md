# Scorecard — Unreal, Actually · Ep 2 "What happens if you fall into a black hole"

## Round 1 — 2026-11-07

**Reviewer:** independent gate pass (did not build the episode).
**Reviewed:** `out/wip/ep02.mp4` (70.61 s, 1080×1920, 30 fps, 2118 frames, 90.1 MB), `out/ep02.srt`, `out/timeline.json`, `script.json`, `claims.md`, `out/render-report.md`, `out/cover.png`, `overlay.js` (label sizes), `scene.js` (Sun-scale maths, wrist shot), `timing.js`, `engine/sound.py`.
**Method:** I pulled stills at 0.0 / 0.5 / 1.0 / 1.5 / 2.0 s and one frame every 1.5 s from 3.0 to 69.0 s, with the safe-area lines drawn on (top 8 % = y 154, bottom 20 % = y 1536, right 12 % = x 950). I took full-resolution crops of the countdown (37.9–39.3 s), the hedge labels, the hero astronaut (1.0 s), the wrist shot (22.5 s), the Sun-to-scale dot (28.5 s), the far observer (5.5 s), the stretch (43.2 s), the small-hole split (50.3 s), the payoff split (67.8 s) and the cover.
**Audio caveat:** I cannot hear the film. I judged voice and sound only from `script.json`, the loudness numbers in the render report and the synth code in `engine/sound.py`.

### Scores

| | Criterion | Score | Evidence |
|---|---|---|---|
| a | Hook in first 2 s | **4** | The picture is there from frame 0: the lensed black hole reads at once. The VO starts at 0.2 s and the Anton "TO EVERYONE WATCHING, YOU'D **FREEZE** AT THE EDGE" lands by 0.5 s. That is a real "wait, what?" in words. Weak spots: title, caption and VO all say the same words (0.5–2.9 s), and the 1.5 s caption crossfade ghosts over the lower ring. The astronaut stands on the top of the disc like a figurine on a donut, so the scale reads as a toy (0–3 s). The freeze itself isn't shown yet. The hook claim also over-reaches the source (F2). |
| b | One thread | **4** | The fall works as a single journey: freeze seen from outside → horizon → why → your own clock (3 h) → scale → cross → 12.8 s → stretch → centre → payoff. The ending rings back to the hook. Two problems: the small-black-hole aside (47.2–51.8 s) is a side trip, and the verdict "Unproven" (58.4 s) follows straight after "Nobody knows if it's real" about the singularity. So the stamp reads as a verdict on the singularity. The claim on trial (the freeze) is never named. |
| c | Picture moves with the sentence | **4** | Many hits land on their word: SLOWS / STOPS (≈5–6.1), EVENT HORIZON (≈9.5), a light streak on "Not even light" (10.5–13), ≈ 3 HOURS on "fall take" (23.2), the reveal pull-back on "giant" (25.5–31), the inward rush on "Cross the edge" (31.5), 12.8 on "twelve point" (37.8), stretch growing through b09, SPAGHETTIFICATION (≈45.9), split on "small black hole" (48), tear on "tear" (49.6), "?" on "Nobody knows" (55.1), stamp on "Unproven" (58.4). Misses: "Friends far away" (3.4–6.1) is a tiny grey blob at the bottom edge. "Like the one in our galaxy's center" (28.9–31.1) shows nothing new. "To you, you'd fall right through" (67.0–68.8): the right panel's astronaut sits on the rim just like the left one, so the payoff difference isn't visible. |
| d | Motivated camera | **4** | Every move has a reason: the hard push-in on the hook, the locked-off long lens for the far observer, a follow on the light streak, the lateral slide for lensing, the over-the-shoulder push, the reveal pull-back for scale, the dive across the edge, the push to the pin, and the pull-back from the stamp. The split frames are compares. Shake is used only on the tear. Framing slips: the stretched figure's helmet is cut at the left edge (40–46 s), and the b03 push crops the hole until the edge fills the frame with no subject (12–14 s). |
| e | Voice carries meaning, screen carries figures | **3** | The figures are on screen (≈ 3 HOURS, ≈ 4.3 MILLION SUNS, 12.8 s) and the voice mostly gives their meaning. Problems: "Then the simulation gives you twelve point eight seconds" never says *until what* (being torn apart). The countdown shows "7.3 s" at 39.0 and "3.1 s" at 39.3 while the caption still reads "twelve point eight seconds", so screen and voice disagree. Heavy duplication: hook title + caption + VO, "point of no return" pill + caption (10.6–12.2), "math, not a memory" label + caption (62.8–64.5), "Unproven." caption + stamp. Most labels are 26–38 px and do little at phone size: WHAT THEY SEE, HIS CLOCK, (NASA simulation), the Sun, to scale, space flows inward…, singularity = ?, frozen at the edge / falls right through. The one comparison (the Sun dot) is about 3–6 px, so nobody will see it. |
| f | Rhythm | **3** | The pace is fine: 175 words, 149 wpm overall and about 170 wpm while speaking, at 70.6 s (the bottom of the 70–80 range). But every gap between beats is exactly 0.45 s and every gap inside a beat 0.14 s. The one exception is 1.25 s after "Unproven", so the read is still metronomic. Near-static stretches break the channel's "new beat every 1.5–2.5 s": 31.5–37.8 s (≈6 s of the same warp-streak field with only a small label), 39.8–44.2 (slow stretch), 51.8–55.1 (pin) and 61.5–64.9 (an empty outline ring, partly with no caption). The 12.8 → 0 countdown flashes past in about 0.6 s (38.9–39.5). |
| g | Ending | **4** | The verbal payoff is the best part of the film. "To the world, you'd freeze at the edge. To you, you'd fall right through." is a clean ring with the hook and a line people will repeat. The end card carries the stamp and the channel name. Weak spots: the payoff picture doesn't show the difference (see c). The verdict lands 12 s before the end and the stamp is shown twice (58.4 and 68.9 s). "This is math, not a memory" is said, labelled and printed three times, and "not a memory" is vague. The end card adds an unsourced line (F3). |
| h | Production value | **3** | The hero asset is genuinely strong: a geodesic black-hole shader with a lensed disc and photon ring, bloom, grain and an on-palette Horizon glow. It is derivative of *Interstellar*'s Gargantua but looks high-end. The figures undo it. The over-the-shoulder "astronaut" (20.1–25.5 s) is an untextured lavender mannequin built from capsules and spheres (`CapsuleGeometry` arm, `SphereGeometry` glove and head), filling about 60 % of the frame on a key beat. Its clock has a slab-shaped hour hand. The far friend (3.4–8.5 s) is the same primitive mannequin on a flat slab. The hero astronaut is a generic white figure perched on the disc rim at the wrong scale (0–8.5, 18–20, 47–51, 64.9–68.8). The stretched astronaut reads as a white rocket or torpedo, not a person (40–46). The warp-speed star streaks (31.5–37.8, 52–57) are a stock "hyperspace" look. Nothing reads as filmed. |

### Verdict: **FAIL**

1. (h) = 3. The gate needs ≥ 4.
2. Three factual items are open (F1–F3 below).

No score is under 3, and (a) and (g) are at the minimum of 4.

### Factual and ethical items

- **F1 — OPEN (blocking).** The on-screen label "the Sun, to scale" (b06, ≈27–31 s) is a scale claim, and `claims.md` has no row for it. The maths in `scene.js` line 169 is right: Sun radius ÷ shadow radius = 0.1096 ÷ 5.196 ≈ 0.0211 for 4.3 M Suns. The 1.6 px floor and 1.1 px glow pad make the dot up to about 1.6× too big at the end of the pull-back. Either add a sourced row (Sun radius, GM/c² for 4.3 M Suns, and the shadow at about 5.2 GM/c²) and draw the dot at the true size, or drop the words "to scale".
- **F2 — OPEN (blocking): the hedge goes past the source.**
  - The source says "to anyone observing **from afar** … would slow and then **seem to** freeze just shy of it."
  - The hook VO and title (0.2–2.9 s) and the cover say "To everyone watching, you'd freeze". That drops "far away", and an observer falling with you would see you cross. The cover also drops "at the edge".
  - "Friends far away" in b02 repairs this 3.4 s later in the film, but the cover stands on its own.
  - Smaller, in the same family: the label "tears you apart early" (49.6–51.8 s) drops the source's "can".
- **F3 — OPEN (blocking, small).** The end card line "Nobody has fallen in." (≈68.9–70.6 s) is not an OK row. C12's wording is "nobody has watched anyone fall in", and neither S2 nor S4 contains that line. Replace it with C13 ("Nothing from inside can reach us.") or source it.
- **F4 — not blocking.** The 12.8 s countdown runs from 12.8 to 0 in about 0.6 s, roughly 20× real time, while labelled "s". It is a stylisation, but it puts "7.3 s" and "3.1 s" on screen against a voice saying 12.8 (see fix 6).
- **F5 — process note for Bruce (not counted as open).** `claims.md` is self-certified by Claude. It has a header line, but not the per-row "checked by" and "date" columns that studio.md §5 asks for.
- C1–C13 as spoken match their quoted sources, and the simulation figures are hedged in both VO and screen ("NASA's simulation", "(NASA simulation)", "the simulation gives you"). ≈ 4.3 M Suns matches S1. No ethical issues.

### Defects, ranked by impact

1. **Primitive placeholder figures:**
   - The capsule/sphere mannequin with the wrist clock (20.1–25.5 s).
   - The mannequin friend on a slab (3.4–8.5 s).
   - These are the cheapest frames in the film and the clearest "default 3D" tell.
2. **Open factual items:** F1 Sun to scale, F2 hook/cover hedge, F3 "Nobody has fallen in."
3. **The payoff split doesn't show the payoff (64.9–68.8 s).** Both astronauts sit on the top rim in near-identical poses. Nothing on the right falls through, and nothing on the left visibly freezes, dims or reddens.
4. **Hero-figure staging:**
   - The astronaut stands on the disc rim like a toy at an impossible scale (0–8.5 s and the split frames).
   - The stretched figure reads as a rocket (40–46 s).
5. **Verdict attached to the wrong question (55.1–58.4 s).** "Nobody knows if it's real. The verdict? Unproven." makes the stamp judge the singularity. The case file never states the claim on trial.
6. **Countdown and 12.8 s meaning (37.8–39.8 s).**
   - The countdown races and contradicts the caption.
   - The VO never says what the 12.8 s is until.
7. **Stock or static stretches:**
   - Warp-streak "hyperspace" tunnel, about 6 s (31.5–37.8 s) and again at 52–57 s.
   - Near-empty outline ring (61.5–64.9 s; 64.5 s has no caption).
   - Uniform 0.45 s beat gaps.
8. **Duplicated text:**
   - Hook title = caption = VO (0.5–2.9 s).
   - "point of no return" (10.6–12.2 s).
   - "math, not a memory" (62.8–64.5 s).
   - "Unproven." caption under the stamp.
   - The stamp is shown twice.
9. **Labels too small to read on a phone (26–38 px, several in Haze):**
   - (NASA simulation), the Sun, to scale, WHAT THEY SEE, HIS CLOCK, space flows inward…, singularity = ?, giant / small black hole, frozen at the edge / falls right through.
   - "HIS CLOCK" (4.5–8 s) also clashes with the VO's "you".
10. **Safe area:**
    - The hook title exits upward into the top 8 % (≈3.0 s, top line at y ≈ 110 px).
    - "≈ 4.3 MILLION SUNS" reaches x ≈ 977 px, into the right 12 % (25.5–31 s).
    - "YOU'D FREEZE" (0.5–2.9 s) and the rotated UNPROVEN stamp (58.4–60.5, 68.9–70.6 s) touch or cross x = 950 with their glow.
    - The far observer and its ledge sit in the bottom 20 % under the app UI (3.4–8.5 s).
    - Captions stay inside the safe area throughout.
11. **Caption breaks:**
    - "NASA's simulation has the / fall take…" (21.4–25.1 s) ends a cue on "the".
    - "you'd freeze at the / edge." and "Then the simulation gives you" both split a phrase across cues.
12. **Cover:**
    - It carries the F2 hedge drift.
    - It never names "black hole" in words.
    - The bottom ~35 % is empty.
    - The channel pill (y ≈ 200 px) would be cut by a 3:4 profile-grid crop.
13. **Sound (inferred, not heard):**
    - Round-2 engine fixes are in: a phone-audible 2–5 kHz click and 150–400 Hz knock on hits, and a Dm9 pad bed about 24 dB under the VO.
    - LRA is 1.8 LU, which is very flat.
    - The voice is still stock Kokoro `am_michael`, which works against "not AI-generated".
    - Loudness −14.4 LUFS and true peak −1.4 dBTP pass. The render report matches the reviewed file.

### FIX LIST (round 1 → round 2)

1. **Close F1–F3 (blocking).**
   - **Hook, title and cover (0.2–2.9 s):** change to "To anyone far away, you'd freeze at the edge." Re-check that "freeze" still lands before 2 s.
   - **Small-hole label (49.6 s):** change it to "can tear you apart early".
   - **Sun dot (27–31 s):** add a sourced `claims.md` row for "the Sun, to scale" and remove the 1.6 px floor and glow pad so the dot is true to size, or drop "to scale".
   - **End card (≈68.9 s):** replace "Nobody has fallen in." with "Nothing from inside can reach us." (C13).
2. **Replace both mannequins with the real astronaut model.**
   - **Over-the-shoulder shot (20.1–25.5 s):** the suited shoulder and helmet back in soft focus at frame left, the gloved forearm with a proper cuff, and the disc reflected in the watch crystal. Give the clock a real tapered hour hand in place of the slab.
   - **Far friend (3.4–8.5 s):** a suited figure, or a lit spacecraft window, rim-lit in Horizon, standing above y = 1500 so the app UI doesn't cover it. Rename "HIS CLOCK" to "YOUR CLOCK".
3. **Re-stage the hero astronaut (0–8.5, 15–20, 47–51, 64.9–68.8 s).**
   - Float it free in front of the disc, never standing on the rim.
   - Use a slow tumble, its own key light from the disc, a dark shadow side and a little motion blur.
   - Keep it small against the hole so the scale reads.
   - In b09 (39.8–44.2 s), show the stretch from a 3/4 angle with helmet, arms and legs readable. Start at normal proportions and lengthen on "You stretch", so it reads as a person, not a rocket.
4. **Make the payoff visible (64.9–68.8 s).**
   - **Left:** the astronaut holds at the rim, redshifts and dims, and its clock stops.
   - **Right:** on "fall right through" (≈67.4 s), the astronaut visibly drops past the edge into the shadow while its clock keeps ticking.
   - Push in on the join as scripted. Enlarge the two panel labels to ≥ 44 px or cut them.
5. **Put the right claim on trial (51.8–64.9 s).**
   - Reorder to b12 (singularity) → b14 ("Nothing from inside can reach us…") → b13 (verdict) → b15, so "Unproven" follows the reason nobody can check.
   - Add a claim line above the stamp, e.g. "CLAIM: you'd freeze at the edge" (Static, ≥ 48 px).
   - Show the full stamp only once, either mid-film or on the end card.
6. **Fix the 12.8 s beat (36.1–39.8 s).**
   - Change the VO to "Then the simulation gives you twelve point eight seconds before you're torn apart." (C7 supports this: "destruction by spaghettification is just 12.8 seconds away".)
   - Hold "12.8 s" until "seconds" ends.
   - Then run a small corner timer in real time through b09–b10 (12.8 → ≈ 5), so the screen never contradicts the voice.
7. **Kill the stock and static stretches and loosen the read.**
   - **Inside the horizon (31.5–37.8 s):** replace the warp-streak tunnel with the geodesic shader's inside view, with the outside sky shrinking to a bright ring behind you as in NASA's visualisation. Add an event about every 2 s.
   - **Singularity (52–55 s):** reuse that inside view.
   - **Empty ring (61.5–64.9 s):** give it a slow drift of the faint photon ring plus the astronaut silhouette, or cut 1 s.
   - **Gaps:** vary them, about 0.15 s inside an idea and 0.5–0.7 s before "Why?", "The verdict?" and "To the world". The film stays within 70–80 s.
8. **Text, safe area and captions.**
   - **Hook (0.5–2.9 s):** hide the burned caption while the hook title is up, and fade the title out instead of sliding it into the top 8 % (≈2.9–3.3 s).
   - **Duplicate labels:** delete the "point of no return" pill (10.6–12.2 s) and the "math, not a memory" label (62.8–64.5 s).
   - **Fit widths:** fit "≈ 4.3 MILLION SUNS" to ≤ 820 px (25.5–31 s), and cap the UNPROVEN stamp width so the rotated text plus glow stays left of x = 940.
   - **Remaining labels:** raise them to ≥ 40 px in Static.
   - **Caption chunks:** re-chunk at phrase breaks: "On your own clock," / "NASA's simulation says" / "the fall takes about three hours"; "you'd freeze at the edge." on one cue.
   - **Cover:** add a small Static "BLACK HOLE" line, fill the empty bottom third with the disc, and move the channel pill below y ≈ 260.
