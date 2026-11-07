#!/usr/bin/env python3
"""Kokoro TTS for one episode: per-beat wavs + timeline.json (beats and caption chunks).

usage: python engine/tts.py <episode_dir>
"""
import json, os, re, sys, urllib.request
import numpy as np, soundfile as sf

CACHE = os.path.expanduser("~/.cache/studio/kokoro")
BASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
FILES = ["kokoro-v1.0.onnx", "voices-v1.0.bin"]
LEAD = 0.20      # silence before first word
GAP = 0.25       # between beats
EXTRA_HOLD = 0.8  # after b13 and the final beat
HOLD_AFTER = {"b13"}
LINE_MAX = 24    # chars per caption line (fits the safe width at ~64 px); spec allows up to 32
STOP = set("the a an and or but so to of in on at it its it's is are was you your you're they their them one that this for with by as be those about there them took have more very just whole what which when will can do does did".split())


def ensure_models():
    os.makedirs(CACHE, exist_ok=True)
    for f in FILES:
        p = os.path.join(CACHE, f)
        if not os.path.exists(p):
            print("downloading", f, flush=True)
            urllib.request.urlretrieve(BASE + f, p + ".part")
            os.rename(p + ".part", p)
    return [os.path.join(CACHE, f) for f in FILES]


def wrap(words, width=LINE_MAX):
    lines, cur = [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > width:
            lines.append(cur); cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur: lines.append(cur)
    return lines


def split_chunks(text):
    """Split into chunks of <=2 lines of <=LINE_MAX chars, preferring punctuation breaks;
    long phrases are split into evenly sized pieces (no orphan words)."""
    text = text.replace("U.S.", "U\u00b7S\u00b7")
    phrases = [p for p in re.findall(r"[^.?!,]+[.?!,]?\s*", text) if p.strip()]
    chunks = []
    for ph in phrases:
        words = ph.split()
        n = 1
        while True:  # smallest n such that n even pieces each fit on 2 lines
            target = len(ph.strip()) / n
            pieces, cur = [], []
            for w in words:
                if cur and len(" ".join(cur + [w])) > target * 1.08 and len(pieces) < n - 1:
                    pieces.append(cur); cur = [w]
                else:
                    cur.append(w)
            pieces.append(cur)
            if all(len(wrap(p)) <= 2 for p in pieces) or n >= len(words): break
            n += 1
        chunks += pieces
    merged = []
    for c in chunks:
        if merged and len(wrap(merged[-1] + c)) <= 2 and not merged[-1][-1].endswith((".", "?", "!")):
            merged[-1] = merged[-1] + c
        else:
            merged.append(c)
    return [" ".join(c).replace("\u00b7", ".") for c in merged]


def norm(w): return re.sub(r"[^\w'-]", "", w.lower())


def pick_key(chunk, wanted):
    words = chunk.split()
    for i, w in enumerate(words):
        if norm(w) in wanted: return i
    best, bl = None, 0
    for i, w in enumerate(words):
        n = norm(w)
        if n not in STOP and len(n) > bl: best, bl = i, len(n)
    return best


def main(ep):
    sc = json.load(open(os.path.join(ep, "script.json")))
    kwf = os.path.join(ep, "keywords.json")
    kws = json.load(open(kwf)) if os.path.exists(kwf) else {}
    from kokoro_onnx import Kokoro
    m, v = ensure_models()
    k = Kokoro(m, v)
    voice = sc["voice"]["voice"]; speed = float(sc["voice"].get("speed", 1.0))
    out = os.path.join(ep, "out"); wavs = os.path.join(out, "audio"); os.makedirs(wavs, exist_ok=True)

    def synth(speed):
        res = []
        for b in sc["beats"]:
            s, sr = k.create(b["vo"], voice=voice, speed=speed, lang="en-us")
            res.append((np.asarray(s, dtype=np.float32), sr))
        return res

    def layout(res, gap):
        t = LEAD; beats = []
        for b, (s, sr) in zip(sc["beats"], res):
            d = len(s) / sr
            hold = (sc.get("end_hold", EXTRA_HOLD) if b is sc["beats"][-1] else EXTRA_HOLD) if (b["id"] in HOLD_AFTER or b is sc["beats"][-1]) else 0
            beats.append(dict(id=b["id"], start=round(t, 3), end=round(t + d, 3), next=round(t + d + gap + hold, 3)))
            t += d + gap + hold
        return beats, t - gap  # no trailing gap

    speed_used, gap = speed, GAP
    res = synth(speed_used)
    beats, total = layout(res, gap)
    print("total", total)
    if not 70 <= total <= 80:
        gap = 0.15 if total > 80 else 0.45
        beats, total = layout(res, gap)
        print("gap adjusted", gap, total)
        if not 70 <= total <= 80:
            for sp in ([1.05, 1.03] if total > 80 else [0.97, 0.95]):
                speed_used = sp; res = synth(sp); beats, total = layout(res, gap)
                print("speed", sp, total)
                if 70 <= total <= 80: break
    # fix last beat 'next' to the film end
    beats[-1]["next"] = round(total, 3)
    # write wavs, captions
    for b, bt, (s, sr) in zip(sc["beats"], beats, res):
        sf.write(os.path.join(wavs, b["id"] + ".wav"), s, sr)
        chunks = split_chunks(b["vo"])
        wanted = set(norm(x) for x in kws.get(b["id"], []))
        tot = sum(len(c) for c in chunks); t = bt["start"]; caps = []
        for c in chunks:
            d = (bt["end"] - bt["start"]) * len(c) / tot
            caps.append(dict(text=c, start=round(t, 3), end=round(t + d, 3), key=pick_key(c, wanted)))
            t += d
        bt["captions"] = caps
        bt["vo"] = b["vo"]; bt["screen"] = b.get("screen", [])
    json.dump(dict(duration=round(total, 3), fps=30, speed=speed_used, gap=gap, sample_rate=res[0][1], beats=beats),
              open(os.path.join(out, "timeline.json"), "w"), indent=1, ensure_ascii=False)
    print("wrote timeline; duration %.2f speed %.2f gap %.2f" % (total, speed_used, gap))


if __name__ == "__main__":
    main(sys.argv[1])
