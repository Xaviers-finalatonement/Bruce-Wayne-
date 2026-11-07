# Compilations: five shorts become one long YouTube video

```
python3 engine/compile.py channels/<channel>/compilations/c01.json [--out DIR] [--keep]
```

Needs `ffmpeg`, `ffprobe` and Pillow (if Pillow is missing it re-runs itself with `~/.cache/studio/venv/bin/python`).
Every episode in the spec must already have `out/ep*.mp4`; otherwise it stops and says which one.

## Spec (`channels/<channel>/compilations/c01.json`)

```json
{ "channel": "pan-theory", "number": 1, "title": "…",
  "episodes": ["channels/pan-theory/ep01-…", "…"],
  "titles": ["fallback titles, used only when an episode has no script.json"],
  "hashtags": ["optional"], "description_intro": "optional", "footer": "optional last line" }
```

## Output (`channels/<channel>/compilations/cNN/out/`)

| File | What |
|---|---|
| `cNN.mp4` | 2560x1440, 30 fps, H.264 High, CRF 16, preset slow, tune film, yuv420p, BT.709, AAC 48 kHz 320 kb/s, +faststart, about -14 LUFS, true peak under -1 dBTP |
| `thumbnail.jpg` | 1280x720 |
| `chapters.txt` | YouTube chapter lines, first one `0:00` |
| `compilation.json` | title, description (with chapters and hashtags), hashtags, duration, chapters, measured loudness |

Layout: intro card (3.5 s), then per short a chapter card (1.8 s) and the full short, then an outro card (3.5 s); 0.3 s crossfades at every join.
The 9:16 short sits full height in the centre; the side areas are drawn in the channel's palette and fonts (read from `docs/style/channels/*.md` and `assets/fonts/`): chapter number and title on the left, channel name and compilation title on the right, a progress strip along the bottom, static film grain.

## Size and git

Expect roughly 600 MB to 1.2 GB for a six-minute video (CRF 16 at 1440p). The mp4 is git-ignored (`channels/*/compilations/*/out/*.mp4`);
commit only `compilation.json`, `chapters.txt` and `thumbnail.jpg`. The studio shows "built locally, not uploaded yet" until the mp4 is on the server's disk.

## Length

Five shorts of 70-75 s come to about 6:15 with the cards. Anything over 6:15 or under 5:00 prints a note.
