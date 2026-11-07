#!/usr/bin/env python3
"""Build a 16:9 YouTube compilation from finished 9:16 shorts.

    python3 engine/compile.py channels/<channel>/compilations/c01.json [--out DIR] [--keep]

See engine/COMPILE.md. Needs ffmpeg/ffprobe and Pillow (re-runs itself with
~/.cache/studio/venv/bin/python when Pillow is missing from the current python).
"""
import argparse
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:  # fall back to the studio venv, if it has Pillow
    venv = Path.home() / ".cache/studio/venv/bin/python"
    if venv.exists() and Path(sys.executable).resolve() != venv.resolve() and not os.environ.get("COMPILE_REEXEC"):
        os.environ["COMPILE_REEXEC"] = "1"
        os.execv(str(venv), [str(venv)] + sys.argv)
    sys.exit("Pillow is missing. Run: python3 -m venv ~/.cache/studio/venv && ~/.cache/studio/venv/bin/pip install pillow")

ROOT = Path(__file__).resolve().parent.parent
W, H, FPS = 1920, 1080, 30
SHORT_W = 608                      # 9:16 at 1080 high (607.5 rounded up to an even number)
SLOT_X = (W - SHORT_W) // 2        # 656
XF = 0.3                           # crossfade at every join, seconds
T_INTRO, T_CHAPTER, T_OUTRO = 3.5, 1.8, 3.5
TARGET_LUFS, TARGET_TP = -14.0, -1.5

DEFAULT_TAGS = {
    "pan-theory": ["#Cooking", "#FoodScience", "#Science", "#PanTheory"],
    "skin-receipts": ["#Skincare", "#SkinScience", "#Science", "#SkinReceipts"],
    "unreal-actually": ["#Science", "#Physics", "#Space", "#UnrealActually"],
}


class Stop(Exception):
    """A problem the user must fix; printed without a traceback."""


def run(cmd, **kw):
    r = subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)
    if r.returncode != 0:
        raise Stop(f"command failed ({r.returncode}): {' '.join(str(c) for c in cmd[:6])} ...\n{r.stderr[-1500:]}")
    return r


def ffmpeg(*args):
    return run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args])


def probe(path, entries, stream="v:0"):
    r = run(["ffprobe", "-v", "error", "-select_streams", stream, "-show_entries", entries, "-of", "json", path])
    return json.loads(r.stdout)


def duration(path):
    return float(json.loads(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", path]).stdout)["format"]["duration"])


def ts(sec):
    s = int(round(sec))
    h, m, s = s // 3600, (s % 3600) // 60, s % 60
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


# ---------------------------------------------------------------- style sheet
def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))


def read_style(channel):
    files = sorted((ROOT / "docs/style/channels").glob(f"*{channel}*.md"))
    if not files:
        raise Stop(f"No style sheet for channel '{channel}' in docs/style/channels/")
    src = files[0].read_text(encoding="utf8")
    m = re.match(r"#\s*(.+?)\s+[—-]\s+style sheet", src)
    name = m.group(1) if m else channel.replace("-", " ").title()
    roles = {}
    for row in re.findall(r"^\|([^|]+)\|\s*`(#[0-9A-Fa-f]{6})`\s*\|([^|]+)\|", src, re.M):
        use = row[2].strip().lower()
        roles.setdefault(use, hexrgb(row[1]))

    def find(*keys):
        for k in keys:
            for use, v in roles.items():
                if k in use:
                    return v
        return None
    bg, ink = find("background"), find("text")
    accent, muted = find("key word"), find("secondary")
    if not (bg and ink and accent):
        raise Stop(f"Could not read background/text/key-word colours from {files[0].name}")
    muted = muted or mix(ink, bg, 0.45)
    fm = re.search(r"^## Fonts\s*\n+(.+)", src, re.M)
    fams = re.findall(r"\*\*([^*]+)\*\*", fm.group(1)) if fm else []
    if not fams:
        raise Stop(f"No '## Fonts' section in {files[0].name}")
    fonts = [font_file(f) for f in fams[:2]]
    if len(fonts) == 1:
        fonts.append(fonts[0])
    return {"name": name, "bg": bg, "ink": ink, "accent": accent, "muted": muted, "display": fonts[0], "body": fonts[1]}


def font_file(family):
    d = ROOT / "assets/fonts" / family.lower().replace(" ", "-")
    files = sorted(d.glob("*-latin-*-normal.woff2"), key=lambda p: int(re.search(r"latin-(\d+)", p.name).group(1)))
    if not files:
        raise Stop(f"Font '{family}' not found in assets/fonts/")
    return str(files[-1])  # heaviest weight


# ---------------------------------------------------------------- drawing
def F(path, size):
    return ImageFont.truetype(path, size)


def wrap(draw, text, font, maxw):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=font) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def fit(draw, text, path, maxw, maxlines, hi, lo):
    for size in range(hi, lo - 1, -2):
        f = F(path, size)
        lines = wrap(draw, text, f, maxw)
        if len(lines) <= maxlines and all(draw.textlength(l, font=f) <= maxw for l in lines):
            return f, lines
    f = F(path, lo)
    lines = wrap(draw, text, f, maxw)[:maxlines]
    return f, lines


def draw_lines(d, x, y, lines, font, fill, lead=1.08, anchor_right=False):
    asc, desc = font.getmetrics()
    step = int((asc + desc) * lead)
    for ln in lines:
        xx = x - d.textlength(ln, font=font) if anchor_right else x
        d.text((xx, y), ln, font=font, fill=fill)
        y += step
    return y


def tile(src, w, h, st, radius=10):
    im = Image.open(src).convert("RGB")
    r = max(w / im.width, h / im.height)
    im = im.resize((math.ceil(im.width * r), math.ceil(im.height * r)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    im = im.crop((x, y, x + w, y + h))
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius, fill=255)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(im, (0, 0), m)
    ImageDraw.Draw(out).rounded_rectangle((0, 0, w - 1, h - 1), radius, outline=mix(st["ink"], st["bg"], 0.7) + (255,), width=2)
    return out


def grain(im, amount=0.06):
    """Subtle static film grain baked into the panel (keeps the side areas cheap to encode)."""
    g = Image.effect_noise(im.size, 40).convert("RGB")
    return Image.blend(im, Image.blend(im, g, 0.5), amount)


def base_canvas(st, size=(W, H)):
    return Image.new("RGB", size, st["bg"])


def side_chrome(im, st, comp):
    """Right-hand channel mark, shared by every 16:9 panel."""
    d = ImageDraw.Draw(im)
    f = F(st["display"], 40)
    right = W - 72
    d.text((right - d.textlength(st["name"], font=f), 76), st["name"], font=f, fill=st["ink"])
    d.rectangle((right - 44, 134, right, 140), fill=st["accent"])
    fb = F(st["body"], 28)
    ln = wrap(d, f"Compilation {comp['number']:02d}", fb, 500) + wrap(d, comp["title"], fb, 500)[:3]
    y = H - 72 - int(sum(sum(fb.getmetrics()) * 1.25 for _ in ln))
    draw_lines(d, right, y, ln, fb, st["muted"], 1.25, True)


def chapter_panel(st, comp, idx, total, title):
    """Full 1920x1080 background for chapter `idx` (1-based): number + title on the left."""
    im = base_canvas(st)
    d = ImageDraw.Draw(im)
    x0, maxw = 72, SLOT_X - 72 - 56
    fl = F(st["body"], 30)
    d.text((x0, 84), f"CHAPTER {idx:02d} / {total:02d}", font=fl, fill=st["muted"])
    fn = F(st["display"], 300)
    d.text((x0 - 6, 96), f"{idx:02d}", font=fn, fill=st["accent"])
    asc, desc = fn.getmetrics()
    ry = 96 + int((asc + desc) * 0.98) + 14
    d.rectangle((x0, ry, x0 + 120, ry + 6), fill=st["ink"])
    ft, lines = fit(d, title, st["display"], maxw, 5, 78, 44)
    draw_lines(d, x0, ry + 34, lines, ft, st["ink"])
    bw, gap = 56, 16
    for i in range(total):
        col = st["accent"] if i + 1 == idx else (st["ink"] if i + 1 < idx else mix(st["ink"], st["bg"], 0.78))
        d.rectangle((x0 + i * (bw + gap), H - 84, x0 + i * (bw + gap) + bw, H - 76), fill=col)
    side_chrome(im, st, comp)
    edge = mix(st["ink"], st["bg"], 0.82)
    d = ImageDraw.Draw(im)
    d.rectangle((SLOT_X - 3, 0, SLOT_X - 1, H), fill=edge)
    d.rectangle((SLOT_X + SHORT_W, 0, SLOT_X + SHORT_W + 2, H), fill=edge)
    return im


def tiles_row(im, st, srcs, x, y, tw, th, gap, numbered=True):
    d = ImageDraw.Draw(im)
    fb = F(st["body"], 26)
    for i, s in enumerate(srcs):
        t = tile(s, tw, th, st)
        im.paste(t, (x + i * (tw + gap), y), t)
        if numbered:
            d.text((x + i * (tw + gap), y + th + 14), f"{i + 1:02d}", font=fb, fill=st["accent"])


def card_panel(st, comp, srcs, kind):
    im = base_canvas(st)
    d = ImageDraw.Draw(im)
    x0 = 96
    d.text((x0, 84), st["name"].upper(), font=F(st["body"], 34), fill=st["accent"])
    if kind == "intro":
        big, sub = comp["title"], f"Compilation {comp['number']:02d}  ·  {len(srcs)} shorts in one watch"
    else:
        big, sub = "Thanks for watching", f"New shorts every week on {st['name']}."
    f, lines = fit(d, big, st["display"], 1500, 2, 150, 70)
    y = draw_lines(d, x0, 150, lines, f, st["ink"], 1.0)
    d.rectangle((x0, y + 18, x0 + 160, y + 26), fill=st["accent"])
    d.text((x0, y + 52), sub, font=F(st["body"], 42), fill=st["muted"])
    n = len(srcs)
    tw = 190
    gap = 30
    th = round(tw * 16 / 9)
    tiles_row(im, st, srcs, x0, H - th - 130, tw, th, gap)
    return im


def thumbnail(st, comp, srcs, path, minutes):
    tw_, th_ = 1280, 720
    im = base_canvas(st, (tw_, th_))
    d = ImageDraw.Draw(im)
    x0 = 56
    d.text((x0, 52), st["name"].upper(), font=F(st["body"], 30), fill=st["accent"])
    f, lines = fit(d, comp["title"], st["display"], 500, 6, 92, 44)
    y = draw_lines(d, x0, 104, lines, f, st["ink"], 1.0)
    d.rectangle((x0, y + 14, x0 + 110, y + 20), fill=st["accent"])
    pill = f"{len(srcs)} SHORTS  ·  {minutes} MIN"
    fp = F(st["body"], 30)
    d.text((x0, th_ - 82), pill, font=fp, fill=st["muted"])
    n = len(srcs)
    tw, step = 236, 134
    th = round(tw * 16 / 9)
    x = tw_ - 40 - ((n - 1) * step + tw)
    for i, s in enumerate(srcs):
        t = tile(s, tw, th, st, 14)
        yy = (th_ - th) // 2 + (i - (n - 1) / 2) * 6
        # lift the tile from the one behind it
        sh = Image.new("RGBA", (tw + 24, th + 24), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle((12, 12, tw + 12, th + 12), 14, fill=(0, 0, 0, 90))
        im.paste(sh, (x + i * step - 12, int(yy) - 8), sh)
        im.paste(t, (x + i * step, int(yy)), t)
    im = grain(im, 0.07)
    im.save(path, quality=92)


# ---------------------------------------------------------------- inputs
def resolve_episode(channel, ref):
    p = Path(ref)
    cands = [p] if p.is_absolute() else [ROOT / ref, ROOT / "channels" / channel / ref]
    for c in cands:
        if c.is_dir():
            return c
    return cands[-1]


def load_episode(channel, ref, fallback_title):
    d = resolve_episode(channel, ref)
    mp4s = sorted((d / "out").glob("ep*.mp4")) if d.is_dir() else []
    if not mp4s:
        raise Stop(f"Episode not rendered: no out/ep*.mp4 in {d}\nRender it first (engine/run.sh), then run the compilation again.")
    title = fallback_title
    sj = d / "script.json"
    if sj.exists():
        title = json.loads(sj.read_text(encoding="utf8")).get("title") or title
    if not title:
        raise Stop(f"No title for {d.name}: add script.json with a title.")
    cover = d / "out" / "cover.png"
    return {"dir": d, "mp4": mp4s[0], "title": title, "cover": cover if cover.exists() else None}


# ---------------------------------------------------------------- segments
X264 = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-pix_fmt", "yuv420p", "-r", str(FPS), "-g", "30",
        "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709"]
AUDIO_FMT = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo"
BG_FX = "format=yuv420p"


def card_segment(panel, centre, secs, out):
    """Still panel (optionally with a 9:16 image in the centre slot), silent audio."""
    args = ["-loop", "1", "-framerate", str(FPS), "-t", f"{secs}", "-i", panel]
    if centre:
        args += ["-loop", "1", "-framerate", str(FPS), "-t", f"{secs}", "-i", centre]
        fc = f"[0:v]{BG_FX}[b];[1:v]scale={SHORT_W}:{H}:force_original_aspect_ratio=increase,crop={SHORT_W}:{H},format=yuv420p[c];[b][c]overlay={SLOT_X}:0,format=yuv420p[v]"
    else:
        fc = f"[0:v]{BG_FX}[v]"
    args += ["-f", "lavfi", "-t", f"{secs}", "-i", "anullsrc=r=48000:cl=stereo"]
    ffmpeg(*args, "-filter_complex", fc, "-map", "[v]", "-map", f"{2 if centre else 1}:a", *X264, "-c:a", "aac", "-b:a", "256k", "-shortest", out)


def short_segment(panel, mp4, out):
    d = duration(mp4)
    frames = math.ceil(d * FPS)
    secs = frames / FPS + XF                      # freeze the last frame for the crossfade
    fc = (f"[0:v]{BG_FX}[b];[1:v]scale={SHORT_W}:{H}:flags=lanczos,fps={FPS},tpad=stop_mode=clone:stop_duration={XF},format=yuv420p[s];"
          f"[b][s]overlay={SLOT_X}:0:eof_action=pass,format=yuv420p[v];[1:a]{AUDIO_FMT},apad=whole_dur={secs:.3f}[a]")
    ffmpeg("-loop", "1", "-framerate", str(FPS), "-t", f"{secs:.3f}", "-i", panel, "-i", mp4, "-filter_complex", fc,
           "-map", "[v]", "-map", "[a]", "-t", f"{secs:.3f}", *X264, "-c:a", "aac", "-b:a", "256k", out)


def build(spec_path, out_dir, keep):
    spec = json.loads(Path(spec_path).read_text(encoding="utf8"))
    for k in ("channel", "number", "title", "episodes"):
        if k not in spec:
            raise Stop(f"Spec is missing '{k}'")
    channel, number = spec["channel"], int(spec["number"])
    st = read_style(channel)
    titles = spec.get("titles", [])
    eps = [load_episode(channel, ref, titles[i] if i < len(titles) else None) for i, ref in enumerate(spec["episodes"])]
    n = len(eps)
    comp = {"number": number, "title": spec["title"]}
    out_dir = Path(out_dir) if out_dir else Path(spec_path).resolve().parent / f"c{number:02d}" / "out"
    out_dir.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix="compile-"))
    print(f"[compile] {st['name']} · compilation {number:02d} · {n} shorts · work dir {work}")
    try:
        # tile sources: cover.png when the episode has one, else a frame from the short
        srcs = []
        for i, e in enumerate(eps):
            if e["cover"]:
                srcs.append(str(e["cover"]))
            else:
                fr = work / f"frame{i}.png"
                ffmpeg("-ss", "2", "-i", e["mp4"], "-frames:v", "1", fr)
                srcs.append(str(fr))

        segs = []  # (path, seconds, label)
        p = work / "intro.png"
        grain(card_panel(st, comp, srcs, "intro")).save(p)
        card_segment(p, None, T_INTRO, work / "s00.mp4")
        segs.append((work / "s00.mp4", "Intro"))
        for i, e in enumerate(eps, 1):
            panel = work / f"ch{i}.png"
            grain(chapter_panel(st, comp, i, n, e["title"])).save(panel)
            print(f"[compile] chapter {i}/{n}: {e['title']}")
            card_segment(panel, srcs[i - 1], T_CHAPTER, work / f"c{i:02d}.mp4")
            short_segment(panel, e["mp4"], work / f"v{i:02d}.mp4")
            segs.append((work / f"c{i:02d}.mp4", f"{i:02d} · {e['title']}"))
            segs.append((work / f"v{i:02d}.mp4", None))
        p = work / "outro.png"
        grain(card_panel(st, comp, srcs, "outro")).save(p)
        card_segment(p, None, T_OUTRO, work / "s99.mp4")
        segs.append((work / "s99.mp4", "Outro"))

        durs = [duration(s[0]) for s in segs]
        offs, acc = [], 0.0
        for i, d in enumerate(durs):
            offs.append(0.0 if i == 0 else acc - XF)
            acc = d if i == 0 else acc - XF + d
        total = acc
        inputs = []
        for s, _ in segs:
            inputs += ["-i", s]

        # video: xfade chain
        parts, last = [], "0:v"
        for i in range(1, len(segs)):
            parts.append(f"[{last}][{i}:v]xfade=transition=fade:duration={XF}:offset={offs[i]:.3f}[x{i}]")
            last = f"x{i}"
        parts.append(f"[{last}]fade=t=in:st=0:d=0.3,fade=t=out:st={total - 0.6:.3f}:d=0.6,format=yuv420p[v]")
        print(f"[compile] encoding video ({total:.1f} s) ...")
        vid = work / "video.mp4"
        ffmpeg(*inputs, "-filter_complex", ";".join(parts), "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
               "-pix_fmt", "yuv420p", "-r", str(FPS), "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-t", f"{total:.3f}", vid)

        # audio: place every segment at its offset with linear fades at the joins, then two-pass loudnorm
        ap = []
        for i, d in enumerate(durs):
            fin = f"afade=t=in:d={XF}:curve=tri," if i > 0 else "afade=t=in:d=0.25,"
            fout = f"afade=t=out:st={d - XF:.3f}:d={XF}:curve=tri," if i < len(segs) - 1 else f"afade=t=out:st={d - 0.5:.3f}:d=0.5,"
            ap.append(f"[{i}:a]{AUDIO_FMT},{fin}{fout}adelay={int(round(offs[i] * 1000))}:all=1[a{i}]")
        ap.append("".join(f"[a{i}]" for i in range(len(segs))) + f"amix=inputs={len(segs)}:normalize=0:duration=longest,atrim=0:{total:.3f}[m]")
        mixwav = work / "mix.wav"
        ffmpeg(*inputs, "-filter_complex", ";".join(ap), "-map", "[m]", "-vn", "-c:a", "pcm_f32le", mixwav)
        final = loudnorm(mixwav, work, TARGET_TP)

        mp4 = out_dir / f"c{number:02d}.mp4"
        ffmpeg("-i", vid, "-i", final, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
               "-movflags", "+faststart", "-shortest", mp4)
        lufs, tp = measure(mp4)
        if tp > -1.0:  # AAC overshoot: pull the true-peak target down once and redo
            print(f"[compile] true peak {tp:.2f} dBTP is over -1, renormalising lower")
            final = loudnorm(mixwav, work, TARGET_TP - (tp + 1.0) - 0.5)
            ffmpeg("-i", vid, "-i", final, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                   "-movflags", "+faststart", "-shortest", mp4)
            lufs, tp = measure(mp4)

        # outputs
        thumb = out_dir / "thumbnail.jpg"
        thumbnail(st, comp, srcs, thumb, round(total / 60))
        chapters = []
        for i, (_, label) in enumerate(segs):
            if label is not None and label != "Outro":
                chapters.append({"seconds": int(round(offs[i])), "time": ts(offs[i]), "title": label})
        chapters[0]["seconds"], chapters[0]["time"] = 0, "0:00"
        (out_dir / "chapters.txt").write_text("\n".join(f"{c['time']} {c['title']}" for c in chapters) + "\n", encoding="utf8")
        tags = spec.get("hashtags") or DEFAULT_TAGS.get(channel, ["#Science"])
        mins = round(total / 60)
        intro = spec.get("description_intro") or f"{n} {st['name']} shorts back to back (about {mins} minutes)."
        desc = intro + "\n\nChapters\n" + "\n".join(f"{c['time']} {c['title']}" for c in chapters)
        if spec.get("footer"):
            desc += "\n\n" + spec["footer"]
        desc += "\n\n" + " ".join(tags)
        meta = {"channel": channel, "number": number, "title": spec["title"], "description": desc, "hashtags": tags,
                "duration": round(total, 2), "chapters": chapters, "episodes": [{"dir": str(e["dir"].name), "title": e["title"]} for e in eps],
                "loudness_lufs": round(lufs, 1), "true_peak_dbtp": round(tp, 2)}
        (out_dir / "compilation.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
        print(f"[compile] done: {mp4}  {ts(total)} ({total:.1f} s), {lufs:.1f} LUFS, {tp:.2f} dBTP")
        if not 300 <= total <= 375:
            print(f"[compile] NOTE: length {ts(total)} is outside the 5:00-6:15 target; shorts of ~70-75 s each give about 6:15.")
        return meta
    finally:
        if keep:
            print(f"[compile] kept work dir {work}")
        else:
            shutil.rmtree(work, ignore_errors=True)


def loudnorm_json(wav, tp):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(wav), "-af", f"loudnorm=I={TARGET_LUFS}:TP={tp}:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
    if not m:
        raise Stop("loudnorm measurement failed:\n" + r.stderr[-800:])
    return json.loads(m.group(0))


def loudnorm(wav, work, tp):
    j = loudnorm_json(wav, tp)
    af = (f"loudnorm=I={TARGET_LUFS}:TP={tp}:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
          f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=48000,alimiter=limit={10 ** ((tp - 0.2) / 20):.4f}:level=disabled")
    out = work / "final.wav"
    ffmpeg("-i", wav, "-af", af, "-c:a", "pcm_f32le", out)
    return out


def measure(mp4):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4), "-af", "ebur128=peak=true", "-vn", "-f", "null", "-"], capture_output=True, text=True)
    s = r.stderr[r.stderr.rfind("Summary:"):]
    i = re.search(r"I:\s+(-?[\d.]+) LUFS", s)
    p = re.search(r"Peak:\s+(-?[\d.]+) dBFS", s)
    if not (i and p):
        raise Stop("loudness measurement failed")
    return float(i.group(1)), float(p.group(1))


def main():
    ap = argparse.ArgumentParser(description="Build a 16:9 compilation from finished shorts.")
    ap.add_argument("spec", help="compilation spec JSON, e.g. channels/pan-theory/compilations/c01.json")
    ap.add_argument("--out", help="output folder (default: <spec dir>/cNN/out)")
    ap.add_argument("--keep", action="store_true", help="keep the temporary work folder")
    a = ap.parse_args()
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            sys.exit(f"{tool} is not installed")
    try:
        build(a.spec, a.out, a.keep)
    except Stop as e:
        sys.exit(f"compile stopped: {e}")


if __name__ == "__main__":
    main()
