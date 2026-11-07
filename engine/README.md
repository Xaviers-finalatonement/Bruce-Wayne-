# Render engine

Channel-agnostic: an episode folder holds `script.json`, `index.html`, `scene.js`, `theme.js` (all colours, fonts, caption style) and `keywords.json`.

One command (Linux, Node 22, Python 3, ffmpeg, Chromium + `playwright` for Node):

    bash engine/run.sh channels/<channel>/<episode>

Steps (each can be run alone):

1. `python engine/tts.py <ep>`: Kokoro TTS (model auto-downloads to `~/.cache/studio/kokoro/`), per-beat wavs, `out/timeline.json` (beats + caption chunks).
2. `node engine/render.js <ep> --cues`: the scene reports its sound cues to `out/cues.json`.
3. `python engine/sound.py <ep>`: procedural foley, VO mix, loudnorm to -14 LUFS, `out/audio.m4a`.
4. `node engine/render.js <ep>`: every frame via `window.__seek(t)`, piped to ffmpeg, writes `out/epNN.mp4` and `.srt`.
5. `python engine/measure.py <ep>`: `out/render-report.md` and `out/contact-sheet.jpg`.

Previews: `node engine/render.js <ep> --frames 0.5,1.8,30 [--out dir]` (PNG stills), `node engine/render.js <ep> --cover` (`out/cover.png`).

Python env: `run.sh` makes `~/.cache/studio/venv` from `engine/requirements.txt` (+ Pillow) unless `STUDIO_PY` points at a python. The page contract: `window.__ready`, `window.__seek(t)`, `window.__cues`, `window.__duration`; it must be a pure function of `t`.

Output: the full render is written to `out/wip/epNN.mp4` (atomic: `.epNN.partial.mp4`, renamed when ffmpeg succeeds). `out/wip/` is git-ignored; the gate-passed film is copied to `out/epNN.mp4` and committed once by hand. Shared 3D building blocks: `engine/film/README.md`.
