# Scorecard — Skin Receipts · Ep 1 "What's growing on your towel"

## Round 1 — 2026-11-08

**Reviewer:** independent gate pass (did not build the episode).
**Reviewed:** `out/wip/ep01.mp4` (69.90 s, 1080×1920, 30 fps, 2097 frames, 77.1 MB), `out/ep01.srt`, `out/timeline.json`, `out/cues.json`, `script.json`, `claims.md`, `platform.json`, `out/render-report.md`, `out/cover.png`, `overlay.js` (label sizes, counter and end-card logic), `engine/sound.py` (`sr_*` palette).
**Method:**
- Stills at 0.0 / 0.5 / 1.0 / 1.5 / 2.0 s.
- Two contact sheets, one frame every 1.5 s (frame-exact, every 45th frame), 0–69 s.
- Exact frames at 5.9, 6.3, 13.9, 14.3, 17.0, 20.5, 27.5, 32.0, 35.5, 43.0, 44.5, 48.5, 53.5, 58.6, 66.8, 68.5 and 69.5 s.
- Detail crops of the hook towel (1.0 s) and the microbe dishes (35.5 s), plus the cover.

The burned-in timestamps on my sheets ran 1.0 s late (a drawtext artifact; the stream starts at 0.000). All times below are corrected true video times.
**Audio caveat:** I cannot hear the film. I judged sound only from the render report (−14.0 LUFS, LRA 2.0 LU, TP −1.4 dBTP), `out/cues.json` and the `sr_*` synth code in `engine/sound.py`.

### Scores

| | Criterion | Score | Evidence |
|---|---|---|---|
| a | Hook in first 2 s | **3** | **Words:** "Your towel grows a film of bacteria." (0.2–2.25 s) is a real "wait, what?" for a skin channel, and it is close to the 2 s line. **Picture:** 0.0–2.3 s is one flat beige texture of white squiggles: no loops, no depth, no film, no microbes, no touch. Only a light band drifts in at 1.5–2.0. Nothing in the picture says "film" or "bacteria". **Title:** it repeats the VO word for word (0.5–2.3). The script's screen line was the shorter question "Your towel grows a film?". |
| b | One thread | **4** | **Spine:** the receipt structure is clear: claim (2.7–7.3) → Line 1, does the film form (7.7–30.1) → Line 2, is it your skin's bacteria (30.5–40.6) → Line 3, does it hurt skin (41.0–51.0) → total UNKNOWN (56.9). **Gaps:** the episode says it is checking "disposable towels for ideal skin", but disposables get 3.5 s (47.4–50.9) and are missing from the summary (59.8–65.7) and the end card. Line 2 (where the bacteria come from) is the loosest link to the claim. |
| c | Picture moves with the sentence | **3** | **Lands on its word:** the microscope push on "Under a microscope: biofilm" (≈21.7–24); the month-6 bar grows and the "highest" tag lands on "highest" (≈25.7–27); the HOLDS UP stamp on "holds up" (29.5); the dishes on "Staph" (34.3); microbes settle on "move in and settle" (38.7–40.5); the "?" ring on "never looked at" (≈44.5); the UNKNOWN stamp on "unknown" (57.9). **Misses:** the "biofilm" tag is up from ≈19.5 s, 3 s before the word and before any microscope. The household counter reaches 26 after "twenty-six" (F4). "Does that film really form?" lands on a toy house (8.6–10.3). "Is it your own skin's bacteria?" lands on a flat brown wall (31.4–34.2). "Does the film hurt your skin?" plays over one orange wall with a towel roll for 6 s (41.0–47.0). "Pat your skin dry" (54.5–56.5) shows no skin and no pat. "Never share towels" shows two towels sharing one rail (51.4–56.5). |
| d | Motivated camera | **3** | **Works:** the push into the weave on "microscope" (21.7–24.2) is motivated. The locked bar chart and the static stamp follow the sheet. **Missing:** the sheet's signature moves never happen. There is no lateral slide across skin, no macro push to pore scale, and no move motivated by touch: the mid-brown hand that should lift the towel is not visible (5.9–6.3 shows the towel corner rising on its own), and the cheek pat (41–47) has no cheek. Most other shots are locked rail shots (2.7–7.7, 14.4–21.6, 47.4–58.5, 63–66) with no reason to hold so long. |
| e | Voice carries meaning, screen carries figures | **3** | **Good:** the figures go on screen: 26 households, 6 months, "tested every 2 months", month 2/4/6, "Staph: under 1%", "not tested here". **Wrong figures:** the bar heights invent a ≈3× magnitude (F1). The counter shows "1 households" (≈10.5) and 13–25 while "twenty-six" is spoken (F4). **Layout:** the month-tick "0 / month" is clipped at the left frame edge (≈16.4–18.6). "Staph: under 1%" is small and reaches x ≈ 1030, inside the right 12 % UI zone (34.5–36.3). "not tested here" is grey text on a grey towel with no backing at 48.0–48.8. **Words:** "Staph" is never explained (§4). **Repeats:** the receipt strip repeats each caption in 30 px Courier 400, which is hard to read on a phone. |
| f | Rhythm | **3** | **Pace:** 171 words in 69.9 s is ≈147 wpm, on the sheet's ≈150. Speech itself runs ≈175–180 wpm, with tidy 0.45 s gaps, and the captions change every 1.5–2.5 s. **Sags in the picture:** the brown wall (31.4–34.2), the orange wall (41.0–47.0, 6 s) and one two-towel rail shot (51.4–58.5, 7 s with only a stamp) hold far longer than the 2–2.5 s beat. **Ending:** the end card is up for only ≈1.5 s (68.4–69.9), and its five lines are all in only ≈0.4 s before the cut. **Runtime:** 69.9 s, under the 70–80 s target. |
| g | Ending | **3** | **Payoff:** "The film is real. Harm to your skin? Unproven." (59.8–63.2) answers the hook and is a line you would repeat. **What weakens it:** the claim the episode set out to check (disposables) is not in the summary or the end card. The UNKNOWN stamp, the signature moment, is a small box at the receipt's corner, partly on the towel (57.9–58.6). The summary plays over the same static rail shot. "A dermatologist can check your skin" lands on a stack of egg-shaped pebbles (66.1–68.3). The end card cannot be read in the time it is up. "Education, not medical advice." is present on the end card. |
| h | Production value | **2** | **What works:** the type, palette and receipt motif are on-sheet (Albert Sans, Courier Prime, Receipt, Navy, Teal, Slate), and the fibre macro (36.5–41) is the best shot in the film. **Overall:** nothing reads as filmed macro cinematography. It reads as a template CG explainer. **Hook and cover towel (0–2.3):** a procedural squiggle-noise texture, not cotton terry. **Towels (2.7–21, 47–66):** flat slabs with a noise texture on a plain rail in a white void, with no weight, drape, pile depth or window key. **Houses (8.6–14.4):** low-poly toy houses. **Bars (24.6–30.6):** a stock 3D infographic. **Skin (31.4–34.2, 41–47):** flat brown and orange walls with no pores, hair, sheen or light fall-off; no skin is recognisable anywhere in a skin channel. **Microbes:** primitive spheres and capsules in white dishes (34.3–36.5). **Skin-tone ending (66.1–68.3):** stacked egg-shaped pebbles. This is far from the owner's "premium macro cinematography" brief. |

### Factual and ethical items

- **F1 — OPEN (blocking): bar heights (≈24.6–30.6 s).**
  - **What's on screen:** month 2 and month 4 are short grey bars of almost equal height. Month 6 is a teal bar about 3× as tall. There is no axis and no "illustration" label.
  - **Source gap:** S1's text says only that viable counts at 6 months were significantly higher than at 2 or 4 months, and that they "increased over time". `claims.md` C4 itself notes the film gives no counts because the page gives a plot, not a number. The ≈3× ratio is invented. This is the same class as Pan Theory F1.
- **F2 — OPEN (blocking): the cover reads as "disposable towels: HOLDS UP" (`out/cover.png`).**
  - **What's on screen:** the cover's receipt strip shows "CLAIM: disposable towels for ideal skin", then Line 1, with a HOLDS UP stamp over it, beside the headline "What's growing on your towel?".
  - **Problem:** at thumbnail size the stamp reads as the verdict on the disposable claim. That is the opposite of the episode's UNKNOWN, and it drifts toward advice to buy a product ("never sells products").
- **F3 — OPEN (blocking): the Staph hedge does not match `claims.md` (34.3–36.0 VO; "Staph: under 1%" tag 34.5–36.3).**
  - **Mismatch:** C5's "hedge used" column says "median across towels; Japanese households only", but neither hedge is in the VO or on screen. As spoken, "Staph was well under one percent" reads as true of every towel, while the source gives a median (0.04 %).
  - **§4:** "Staph" is a technical term with no explanation in the same breath. The C5 quote already calls Staphylococcus one of the "major bacteria comprising the … skin microbiota", so the explanation is sourced.
- **F4 — fix required (not blocking on its own): the household counter contradicts the voice (≈10.3–14.4 s).**
  - **What's on screen:** "1 households" on "One study" (≈10.5), 13 at 12.0 s, about 16–25 while "twenty-six" is spoken (≈12.4–13.5). It reaches 26 only at ≈13.6, and 26 is held for under 1 s.
  - **Problem:** a paused frame shows a wrong number next to the caption "twenty-six households". The final number is right, so this is not an unsourced claim.
- **F5 — fix required (ethics, framing): the disposable beat favours disposables (47.4–51.0 s).**
  - **What's on screen:** the dull grey, used-looking cotton towel sits front and centre. A pristine white paper roll stands beside it.
  - **Problem:** the VO says "not tested", but the picture says clean disposable vs. dirty cotton. Both items are unbranded, which is good.
- **F6 — fix required (representation, §5): no skin is shown, so the skin-tone range exists only as colour swatches.**
  - **Planned vs. built:** b02's mid-brown hand is not visible (5.9–6.3). b08's deep-brown forearm is a flat brown wall (31.4–34.2). b10's "light-olive" cheek is an orange-tan wall with a towel roll, so the tone is also wrong (41.0–47.0). b15's range of skin tones is stacked pebbles (66.1–68.3).
  - **Rule:** the letter of "a range of skin tones" is met by colour only. The spirit (real skin surfaces across tones) is not.
- **F7 — minor accuracy (fix in the rebuild): where the film sits, and microbe shapes.**
  - **Placement:** S1 found aggregation "not … in the pile structure but only in the ground warp structure". The macro shots (21.7–24.2, 36.5–41) put the microbes on and among the loops.
  - **Shapes:** the dishes (34.3–36.5) code skin microbes as all spheres and towel microbes as all rods. That is a shape difference the study never reported (its difference is by sequencing, and the skin's Cutibacterium and Corynebacterium are rods). Code them by colour, or label the dishes "illustration".
- **F8 — paperwork:**
  - **Missing columns:** `claims.md` lacks the per-row "checked by" and "date" columns that §5 requires. There is only one header line.
  - **Process note for Bruce (not counted as open):** the claims were certified by Claude, not by a person (§5). Bruce should spot-check C4, C5, C6 and C8, or accept an AI check. This is the same as Pan Theory F7.
  - **Voice speed:** `timeline.json` uses 0.95, but `script.json` says 0.97.
  - **Title:** b01 `screen` says "Your towel grows a film?", but the build shows the full sentence.
  - **Not done yet:** `out/ep01.mp4` does not exist; only the WIP file does.
- **Note, not a defect: the hook generalises.** "Your towel grows…" generalises from 26 households. It is acceptable as a hook because the end card says "on towels in daily use".
- **Spoken lines:** C1, C2, C3, C4 (words only), C6–C13 as spoken match their quotes and hedges ("one study", "mostly", "the authors think", "this study", "unproven").
- **Clean areas:**
  - No brand, product, dosing or diagnosis anywhere.
  - "Education, not medical advice." is on screen from 0.05 s to the end (30 px Slate on a pill, y ≈ 1470–1516, clear of the bottom 20 %) and on the end card.
  - The `platform.json` text is hedged and also carries the disclaimer.
  - The C0 claim is framed as a claim to check.

### Verdict: **FAIL**

1. **Scores:** (h) = 2 is below the floor of 3. (a) = 3 and (g) = 3, where the gate needs ≥ 4.
2. **Facts:** three items are open: F1 (bar magnitudes), F2 (cover verdict), F3 (Staph hedge).

### Defects, ranked by impact

1. **Unsourced magnitude:** month-6 bar ≈ 3× the others, with no scale or illustration label (24.6–30.6, F1).
2. **Misleading cover:** HOLDS UP over "CLAIM: disposable towels" (`out/cover.png`, F2).
3. **No skin in a skin channel:**
   - Flat brown wall for the forearm (31.4–34.2).
   - Orange wall plus towel roll for the cheek pat (41.0–47.0).
   - Invisible hand (≈6 s).
   - Pebbles for the tone range (66.1–68.3). See F6.
4. **Production value far below the brief:**
   - Procedural-noise hook and cover towel (0–2.3).
   - Slab towels in a void (2.7–21, 47–66).
   - Toy houses (8.6–14.4).
   - Stock bar infographic (24.6–30.6).
   - Primitive microbe dishes (34.3–36.5).
5. **Static hook picture:** nothing shows a film or microbes before 2.3 s, and the title repeats the VO word for word.
6. **Hedge and label errors:**
   - The Staph line has no "typically" or median, and Staph is never explained (F3).
   - The counter lags "twenty-six" and reads "1 households" (F4).
   - The "biofilm" tag is up 3 s early (≈19.5).
   - The disposable beat sets dirty cotton against a clean roll (F5).
7. **Weak signature ending:**
   - The UNKNOWN stamp is small (57.9).
   - Disposables are missing from the summary.
   - The end card is unreadable at ≈1.5 s.
   - The runtime is 69.9 s.
8. **Long dead holds:** 31.4–34.2, 41.0–47.0 and 51.4–58.5.
9. **Layout:**
   - The "0" month tick is clipped at the left edge (16.4–18.6).
   - "Staph: under 1%" sits inside the right 12 % (34.5–36.3).
   - "not tested here" has no backing (48.0–48.8).
   - The receipt lines are 30 px Courier 400.
   - The disclaimer is 30 px.
10. **Sound on paper (not heard):**
    - **Bed:** `sr_bed` is one static six-note chord pad (C3–D5), low-passed at 1.7 kHz, with no harmonic change for 70 s.
    - **Droplets:** the synthetic "droplets" fire every ≈1.7 s (≈40 chirps of the same type) and may read as a dripping tap.
    - **Foley:** all water and fabric sounds are band noise, with no recorded foley.
    - **Hook:** only a 2.2 s noise swell and one tick play under it.
    - **Dynamics:** LRA 2.0 LU is very flat.
    - **Voice:** stock Kokoro `af_heart`, which works against the "not AI-generic" brief.
11. **Paperwork:** see F8.

### FIX LIST (round 1 → round 2)

1. **Close the open facts (F1, F3, F4).**
   - **Bars (24.6–30.6):** replace the heights with an even step (month 2 < month 4 < month 6, each about 1.3× the last). Add an "illustration, not to scale" label at ≥ 40 px on a Receipt pill under the bars.
   - **Staph VO (34.3–36.0):** change it to "Staph, a common skin bacterium, was typically well under one percent." Change the tag to "Staph: typically < 1 %" at ≥ 40 px, with its right edge at x ≤ 940.
   - **Counter (10.3–14.4):** start the counter on "households" or freeze it, so that "26 households" is already up when "twenty-six" begins (≈12.4) and holds until 14.4. Never show "1 households".
   - **claims.md:** add an illustration note under C4. Set C5's hedge to "typically; median". Add per-row "checked by" and "date" columns.
2. **Rebuild the cover (F2).**
   - **Receipt:** show only the RECEIPT TOTAL line with the Slate UNKNOWN stamp, or no receipt at all.
   - **Remove:** drop the "CLAIM: disposable towels" line and the HOLDS UP stamp.
   - **Keep:** the headline and the disclaimer.
3. **Make the hook show the film by 2 s (0–2.3).**
   - **Towel:** replace the noise texture with a filmed-looking macro of real cotton terry: individual twisted loops with depth, a soft window key from one side, shallow depth of field.
   - **Move:** a slow lateral slide, then a push down between the loops from ≈0.8 s.
   - **Film:** a pale teal film is revealed in the base weave under the loops by "film" (≈1.2 s). This also fixes F7's placement.
   - **Title:** change it to "Your towel grows a film?", with "film" in Teal.
   - **Sound:** a cloth rub on the slide and a soft wet texture as the film appears.
4. **Put real skin on screen across the palette tones (F6; 5.0–7.3, 31.4–34.2, 41.0–47.0, 66.1–68.3).**
   - **5.0–7.3:** a visible mid-brown hand (`#A86F4C`) lifts the towel.
   - **31.4–34.2:** a macro lateral slide across a deep-brown forearm (`#3E271C` / `#6B4330`) with pores, fine hair and a soft sheen.
   - **41.0–47.0:** a light-skin cheek (`#F1D3BE` / `#D9A47F`) patted with a towel in close-up, with the dashed "?" ring on the cheek. Cut to a second angle at ≈44 s, so no shot holds for 6 s.
   - **66.1–68.3:** replace the pebbles with a lateral slide across 4–5 skin macros covering the full range. Matte and natural, not a beauty-ad look.
5. **Rebuild the towels, houses, bars and microbes as filmed-looking CG (2.7–30.6, 34.3–41).**
   - **Towels:** real drape and weight, visible pile and selvedge, and contact shadows on a real towel rail or hooks under a window key.
   - **New vs. month 2 (19.1–21.6):** the month-2 towel is clearly greyer and flatter.
   - **Houses:** replace the toy houses with a slide along 26 small, matte, real-looking towels or doorways.
   - **Bars:** make them printed receipt bars (thermal-paper texture), not stock 3D columns.
   - **Dishes:** real agar-plate or micrograph look, with the microbes coded by colour, not shape, and labelled "illustration" (F7).
6. **Neutral disposable beat and literal dermatologist beat (47.4–56.5; F5).**
   - **Disposable (47.4–51.0):** the same clean white cotton towel sits beside a plain, unbranded stack of paper towels with equal weight, light and framing.
   - **Never share (51.4–54.5):** two towels on two separate hooks with clear space between them.
   - **Pat dry (54.5–56.5):** a hand pats a cheek dry with a clean towel.
   - **Timing:** move the "biofilm" tag so it appears on the word "biofilm" (≈22.8), not at 19.5.
7. **Fix the labels and layout.**
   - **Month ticks:** move the "0 / 2 / 4 / 6 months" ticks so "0" is ≥ 60 px from the left edge (16.4–18.6).
   - **"not tested here" (from 47.9):** give it its pill backing from the first frame.
   - **Receipt:** set the current line to 36 px Courier Prime 700 and dim the older lines to 50 %.
   - **Disclaimer:** raise "Education, not medical advice." from 30 to 36 px.
8. **Strengthen the signature ending, runtime and sound (56.9–end).**
   - **Stamp (57.9):** the UNKNOWN stamp lands large, ≥ 50 % of the frame width, over the receipt total.
   - **New VO line:** add "Disposable towels? Not tested." to b14 after "Unproven." (C9 is OK). Also add it to the end card.
   - **Picture:** the summary plays over a calm pull-back from a towel macro, not the static rail.
   - **End card:** hold it ≥ 3.0 s after its last line is in. That brings the runtime to ≈72 s.
   - **Bed:** move the chord every 8 bars and randomise the droplet spacing, at 3–6 s and quieter.
   - **Foley:** use real cloth and water foley on the touch moves.
   - **Voice:** consider a less stock voice than `af_heart`. I can't hear it; this is about the "not AI-generic" brief.
   - **Paperwork:** fix the voice-speed and b01 mismatches (F8), regenerate the render report, and copy the approved render to `out/ep01.mp4`.
