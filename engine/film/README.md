# engine/film: shared 3D film building blocks

ES modules (served over http by `engine/render.js`; three.js 0.169 is vendored in `engine/vendor/three/`, resolved by an importmap in the episode's `index.html`: `three` and `three/addons/`).
An episode only writes `scene.js` (shots + camera paths), `overlay.js` (labels), `timing.js` (phrase times, cues), `theme.js`.

| File | What it gives you |
|---|---|
| `timing.js` | easing (`eio`, `eo3`, `eob`, `smooth`), seeded `hash`, `makeBeatTiming(timeline)` -> `S/E/END(id)`, `W(id, phrase)` (time a spoken phrase starts), `DUR` |
| `post.js` | `createPost({canvas, theme})`: WebGL renderer, MSAA half-float target, DOF (`bokeh`), `bloom`, ACES `OutputPass`, `filmPass` (chroma, halation, vignette, seeded grain) |
| `camera.js` | `evalPath(keys, t)` / `applyCamera(camera, bokeh, keys, t)`: eased keyframes in real focal lengths (36 mm sensor height), motivated rack focus (`fp`), tiny drift; `shakeAt(shakes, t)` for impact-only shake |
| `props.js` | `createProps(renderer)`: PMREM studio env, scratch/noise/glow textures, PBR helpers (`mat`, `emis`, `addMat`), `makeClock` (bezel, scratched face, glass, hands), `makeFigure` (extruded rim-lit silhouette), `makeEarth` (procedural + atmosphere), `lightCone`, `dustField`, `glowSprite` |
| `type.js` | `createType(canvas, theme)`: Anton/Barlow 2D overlay helpers (`txt`, `tag`, `slam`, `ring`, `tabText`), `hookHeadline`, `stampCard` (case-file verdict stamp), DOM `captions` driven by `timeline.json` + `theme.caption` |

Page contract: `window.__ready`, `window.__seek(t)` (pure function of t), `window.__cues`, `window.__duration`. Preview: `node engine/render.js <ep> --frames 1,2 [--q nobokeh&nobloom]`. Sound palette per channel: `"sound"` key in `script.json` (see `PALETTES` in `engine/sound.py`).
