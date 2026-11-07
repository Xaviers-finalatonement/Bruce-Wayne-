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


def speech_segments(s, sr, t0, thr_db=-42, min_pause=0.12):
    """Voiced segments [(start, end)] in film time, from 10 ms RMS; pauses >= min_pause split the beat."""
    h = int(sr * 0.01); n = len(s) // h
    r = np.sqrt(np.mean(np.asarray(s[:n * h]).reshape(n, h) ** 2, axis=1)) + 1e-9
    on = 20 * np.log10(r) > thr_db
    idx = np.where(on)[0]
    if len(idx) == 0: return [(t0, t0 + len(s) / sr)]
    segs, a, prev = [], idx[0], idx[0]
    for i in idx[1:]:
        if (i - prev) * 0.01 >= min_pause: segs.append((a, prev + 1)); a = i
        prev = i
    segs.append((a, prev + 1))
    return [(t0 + x * 0.01, t0 + y * 0.01) for x, y in segs]


def map_speech(segs, u):
    """Time at which fraction u (0..1) of the voiced duration has been spoken; snaps to the end of a nearby pause."""
    D = sum(b - a for a, b in segs); target = u * D; res = segs[-1][1]
    for a, b in segs:
        if target <= b - a: res = a + target; break
        target -= b - a
    for (a0, b0), (a1, b1) in zip(segs, segs[1:]):
        if b0 - 0.55 <= res <= a1 + 0.1: return a1
    return res


SENT = r"(?<=[.?!])\s+(?=[A-Z])"


def trim(x, sr, thr=0.004):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0: return x
    a = max(0, idx[0] - int(0.02 * sr)); b = min(len(x), idx[-1] + int(0.03 * sr))
    return x[a:b]


def synth_beat(k, text, vo, voice, speed):
    """One TTS call per sentence (exact sentence onsets for caption/picture sync), joined with short pauses."""
    st, sv = re.split(SENT, text), re.split(SENT, vo)
    if len(st) != len(sv): st = [text]; sv = [vo]
    parts, sents, t, sr_, c = [], [], 0.0, 24000, 0
    for i, (a, v) in enumerate(zip(st, sv)):
        x, sr_ = k.create(a, voice=voice, speed=speed, lang="en-us"); x = trim(np.asarray(x, dtype=np.float32), sr_)
        if i: pause = 0.24 if sv[i - 1].rstrip().endswith("?") else 0.14; parts.append(np.zeros(int(pause * sr_), dtype=np.float32)); t += pause
        c0 = vo.find(v, c); c = c0 + len(v)
        sents.append(dict(s=t, e=t + len(x) / sr_, c0=c0, c1=c)); parts.append(x); t += len(x) / sr_
    return np.concatenate(parts), sr_, sents


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
            res.append(synth_beat(k, b.get("tts", b["vo"]), b["vo"], voice, speed * float(b.get("speed_mul", 1.0))))
        return res

    def layout(res, gap):
        t = LEAD; beats = []
        for b, (s, sr, _) in zip(sc["beats"], res):
            d = len(s) / sr
            hold = (sc.get("end_hold", EXTRA_HOLD) if b is sc["beats"][-1] else EXTRA_HOLD) if (b["id"] in HOLD_AFTER or b is sc["beats"][-1]) else 0
            g = float(sc.get("gaps", {}).get(b["id"], gap))
            beats.append(dict(id=b["id"], start=round(t, 3), end=round(t + d, 3), next=round(t + d + g + hold, 3)))
            t += d + g + hold
        return beats, t - float(sc.get("gaps", {}).get(sc["beats"][-1]["id"], gap))  # no trailing gap

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
    for b, bt, (s, sr, sents) in zip(sc["beats"], beats, res):
        sf.write(os.path.join(wavs, b["id"] + ".wav"), s, sr)
        chunks = split_chunks(b["vo"])
        wanted = set(norm(x) for x in kws.get(b["id"], []))
        bt["sents"] = [dict(s=round(bt["start"] + x["s"], 3), e=round(bt["start"] + x["e"], 3), c0=x["c0"], c1=x["c1"]) for x in sents]
        def at(ci):
            for x in bt["sents"]:
                if ci < x["c1"] or x is bt["sents"][-1]: return x["s"] + (x["e"] - x["s"]) * max(0, min(1, (ci - x["c0"]) / max(1, x["c1"] - x["c0"])))
        cur = 0; caps = []
        for i, c in enumerate(chunks):
            ci = b["vo"].find(c, cur); cur = ci + len(c)
            caps.append(dict(text=c, start=round(bt["start"] if i == 0 else at(ci), 3), key=pick_key(c, wanted)))
        for i in range(len(caps)): caps[i]["end"] = caps[i + 1]["start"] if i + 1 < len(caps) else bt["end"]
        bt["captions"] = caps
        bt["vo"] = b["vo"]; bt["screen"] = b.get("screen", [])
    json.dump(dict(duration=round(total, 3), fps=30, speed=speed_used, gap=gap, sample_rate=res[0][1], beats=beats),
              open(os.path.join(out, "timeline.json"), "w"), indent=1, ensure_ascii=False)
    print("wrote timeline; duration %.2f speed %.2f gap %.2f" % (total, speed_used, gap))


if __name__ == "__main__":
    main(sys.argv[1])
