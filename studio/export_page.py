#!/usr/bin/env python3
"""Export a one-page snapshot of the studio (all channels, episodes, platform text)
for viewing inside Claude. Usage: python3 studio/export_page.py OUT_DIR
Expects preview videos (<=15 MB) already placed at OUT_DIR/media/<episode-id>.mp4."""
import glob, html, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1]
REPO_URL = "https://github.com/Xaviers-finalatonement/Bruce-Wayne-/blob/claude/charming-bell-j61a42/"
FONTS = {"pan-theory": "'Rubik', sans-serif", "skin-receipts": "'Albert Sans', sans-serif",
         "unreal-actually": "'Anton', Impact, sans-serif"}
# accent readable on light surface, accent readable on dark surface
ACCENTS = {"pan-theory": ("#B53A25", "#F08A6E"), "skin-receipts": ("#0B7270", "#4CC7C3"),
           "unreal-actually": ("#A84A08", "#FF8A2A")}
esc = lambda s: html.escape(str(s or ""), quote=True)

cat = json.load(open(os.path.join(ROOT, "studio/data/catalog.json")))
os.makedirs(os.path.join(OUT, "img"), exist_ok=True)


def folder(ch, n):
    hits = sorted(glob.glob(os.path.join(ROOT, "channels", ch, f"ep{n:02d}-*")))
    return hits[0] if hits else None


def is_todo(v):
    return not v or "TODO" in json.dumps(v)


def copy_block(label, text, key):
    return (f'<div class="field"><div class="field-head"><span>{esc(label)}</span>'
            f'<button type="button" class="copy" data-target="{key}">Copy</button></div>'
            f'<textarea id="{key}" readonly rows="{min(9, max(1, str(text).count(chr(10)) + 1 + len(str(text)) // 44))}">{esc(text)}</textarea></div>')


cards = {}
counts = {"video": 0, "script": 0, "planned": 0}
for e in cat["episodes"]:
    ch, n, eid = e["channel"], e["number"], e["id"]
    f = folder(ch, n)
    plat, script = {}, {}
    if f and os.path.exists(os.path.join(f, "platform.json")):
        plat = json.load(open(os.path.join(f, "platform.json")))
    if f and os.path.exists(os.path.join(f, "script.json")):
        script = json.load(open(os.path.join(f, "script.json")))
    yt = plat.get("youtube") if not is_todo(plat.get("youtube")) else e.get("youtube")
    tt = plat.get("tiktok") if not is_todo(plat.get("tiktok")) else e.get("tiktok")
    title = (script.get("title") or e["title"])
    hook = script["beats"][0]["vo"] if script.get("beats") else ""
    preview = os.path.join(OUT, "media", f"{eid}.mp4")
    cover = os.path.join(f, "out", "cover.png") if f else None
    thumb = None
    if cover and os.path.exists(cover):
        thumb = f"img/{eid}.jpg"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", cover, "-vf", "scale=540:960", "-q:v", "4",
                        os.path.join(OUT, thumb)], check=True)
    if os.path.exists(preview):
        state, chip = "video", "Draft video · in review"
    elif script:
        state, chip = "script", "Script ready · checked"
    else:
        state, chip = "planned", "Planned"
    counts[state] += 1
    if state == "planned":
        cards.setdefault(ch, []).append(f'<li class="planned"><span class="num">{n}</span>{esc(title)}</li>')
        continue
    if state == "video":
        media = (f'<video controls playsinline preload="metadata" poster="{thumb or ""}" '
                 f'src="media/{eid}.mp4" aria-label="{esc(title)}"></video>')
    elif thumb:
        media = f'<img src="{thumb}" alt="Cover: {esc(title)}">'
    else:
        media = f'<div class="placeholder"><span class="ph-kicker">Hook</span><span class="ph-hook">{esc(hook)}</span></div>'
    text = ""
    if yt and not is_todo(yt):
        text += '<section class="plat"><h4>YouTube</h4>' + copy_block("Title", yt.get("title"), f"{eid}-yt-t") + copy_block("Description", yt.get("description"), f"{eid}-yt-d") + "</section>"
    if tt and not is_todo(tt):
        text += '<section class="plat"><h4>TikTok</h4>' + copy_block("Title", tt.get("title"), f"{eid}-tt-t") + copy_block("Hashtags", " ".join(tt.get("hashtags", [])), f"{eid}-tt-h") + "</section>"
    link = ""
    if state == "video" and e.get("video"):
        link = f'<a class="ext" href="{REPO_URL}{esc(e["video"])}" target="_blank" rel="noopener">Full-quality file on GitHub</a>'
    words = sum(len(b["vo"].split()) for b in script.get("beats", []))
    cards.setdefault(ch, []).append(
        f'<article class="ep {state}"><div class="media">{media}</div><div class="body">'
        f'<div class="meta"><span class="num">Ep {n}</span><span class="chip {state}">{chip}</span></div>'
        f'<h3>{esc(title)}</h3>' + (f'<p class="hook">“{esc(hook)}”</p>' if hook else "") +
        (f'<p class="small">{words} words · {len(script.get("beats", []))} beats</p>' if words else "") +
        f'<details><summary>Posting text</summary>{text}</details>{link}</div></article>')

sections = []
order = sorted(cat["channels"], key=lambda c: -sum("<video" in i for i in cards.get(c["id"], [])))
for c in order:
    ch = c["id"]; light, dark = ACCENTS[ch]
    items = cards.get(ch, [])
    full = "".join(i for i in items if i.startswith("<article"))
    planned = "".join(i for i in items if i.startswith("<li"))
    comp = (c.get("compilations") or [{}])[0]
    sections.append(
        f'<section class="channel" id="{ch}" style="--ch:{light};--ch-dark:{dark};--ch-font:{FONTS[ch]}">'
        f'<header class="ch-head"><h2>{esc(c["name"])}</h2><p>{esc(c["subject"])}</p></header>'
        f'<div class="eps">{full}</div>'
        + (f'<h3 class="later">Coming next</h3><ul class="plist">{planned}</ul>' if planned else "") +
        f'<p class="long"><strong>Long video 1</strong> · {esc(comp.get("title", "Episodes 1–5"))} · about 6 min, 1440p. Builds once episodes 1–5 are finished.</p></section>')

nav = "".join(f'<a href="#{c["id"]}">{esc(c["name"])}</a>' for c in order)
tpl = open(os.path.join(ROOT, "studio/page_template.html")).read()
page = (tpl.replace("{{NAV}}", nav).replace("{{SECTIONS}}", "".join(sections))
        .replace("{{N_VIDEO}}", str(counts["video"])).replace("{{N_SCRIPT}}", str(counts["script"]))
        .replace("{{N_PLANNED}}", str(counts["planned"])))
open(os.path.join(OUT, "index.html"), "w").write(page)
print("wrote", os.path.join(OUT, "index.html"), counts)
