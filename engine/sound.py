#!/usr/bin/env python3
"""Procedural dry-foley sound design + VO mix + loudnorm.  No samples, numpy only.

usage: python engine/sound.py <episode_dir>
reads  out/timeline.json, out/audio/<beat>.wav, out/cues.json (written by render.js --cues from the scene)
writes out/mix.wav (pre-master) and out/audio.m4a (AAC, -14 LUFS, TP <= -1 dBTP)

cues.json: [{"t": sec, "type": ...}]; palette chosen by script.json "sound" (see PALETTES).
"""
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf

SR = 48000
rng = np.random.default_rng(7)


def db(x): return 10 ** (x / 20)


def env_exp(n, tau): return np.exp(-np.arange(n) / (tau * SR))


def bandnoise(n, lo, hi):
    x = rng.standard_normal(n)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    y = np.fft.irfft(X, n)
    return y / (np.abs(y).max() + 1e-9)


def scratch(dur):
    n = int(dur * SR); x = bandnoise(n, 2500, 9000)
    # pencil: bursts of strokes, amplitude wobbling at 9-16 Hz
    t = np.arange(n) / SR
    m = 0.55 + 0.45 * np.sin(2 * np.pi * rng.uniform(9, 16) * t + rng.uniform(0, 6))
    m = np.clip(m, 0, 1) ** 1.5
    a = np.minimum(1, t / 0.03) * np.minimum(1, (dur - t) / 0.08)
    return x * m * a * db(-24)


def tick(tock=False):
    n = int(0.06 * SR); t = np.arange(n) / SR
    click = bandnoise(n, 1500, 9000) * env_exp(n, 0.004)
    f = 1500 if tock else 2100
    ping = np.sin(2 * np.pi * f * t) * env_exp(n, 0.008)
    return (0.7 * click + 0.4 * ping) * db(-27)


def thud():
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 48 + 40 * np.exp(-t / 0.05)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.11)
    slap = bandnoise(n, 800, 5000) * env_exp(n, 0.012)
    return (body + 0.35 * slap) * db(-17)


def pop():
    n = int(0.1 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (500 + 700 * t / 0.1) * t) * env_exp(n, 0.02) * db(-28)


def pulse():
    n = int(0.35 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 55 * t) * env_exp(n, 0.08) * np.minimum(1, t / 0.01) * db(-27)


def lowpass(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X[f > fc] = 0
    return np.fft.irfft(X, len(x))


# ---- palette "unreal-actually": deep hits, sub swells, glitchy risers, gentle ticks ----
def ua_hit(gain=1.0):
    n = int(1.1 * SR); t = np.arange(n) / SR
    f = 36 + 70 * np.exp(-t / 0.07)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.28)
    sub = np.sin(2 * np.pi * 31 * t) * env_exp(n, 0.5) * 0.6
    thump = lowpass(bandnoise(n, 40, 1800), 900) * env_exp(n, 0.05)
    air = bandnoise(n, 3000, 9000) * env_exp(n, 0.02) * 0.15
    return (body + sub + 0.5 * thump + air) * db(-9) * gain


def ua_swell(dur):
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    a = (u ** 2.2) * np.minimum(1, (dur - t) / 0.12)
    sub = np.sin(2 * np.pi * np.cumsum(38 + 22 * u) / SR)
    nz = lowpass(bandnoise(n, 60, 2500), 200 + 1800 * 1.0) * (0.3 + u)
    return (sub * 0.9 + nz * 0.25) * a * db(-17)


def ua_riser(dur):
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    f = 180 * (12 ** u)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
    rate = 8 + 36 * u * u
    gate = (np.sin(2 * np.pi * np.cumsum(rate) / SR + 3 * np.sin(2 * np.pi * 3 * t)) > -0.2 + 0.6 * (1 - u)).astype(float)
    gate = np.convolve(gate, np.ones(int(0.002 * SR)) / int(0.002 * SR), mode="same")
    nz = bandnoise(n, 1500, 9000)
    return (0.6 * tone + 0.5 * nz) * gate * (u ** 1.6) * db(-22) * np.minimum(1, (dur - t) / 0.01)


def ua_sweep(dur):
    n = int(max(.3, dur) * SR); t = np.arange(n) / SR; u = t / (n / SR)
    x = bandnoise(n, 500, 7000) * np.sin(np.pi * u) ** 2
    return lowpass(x, 5000) * db(-31)


def ua_tick(tock=False):
    n = int(0.05 * SR); t = np.arange(n) / SR
    click = bandnoise(n, 2000, 8000) * env_exp(n, 0.002)
    ping = np.sin(2 * np.pi * (1300 if tock else 1800) * t) * env_exp(n, 0.006)
    return (0.5 * click + 0.5 * ping) * db(-33)


def ua_pop():
    n = int(0.14 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (300 + 600 * t / 0.14) * t) * env_exp(n, 0.03) * db(-27)


def ua_bed(sfx, dur):
    n = len(sfx); t = np.arange(n) / SR
    drone = (np.sin(2 * np.pi * 43 * t) + 0.5 * np.sin(2 * np.pi * 43.7 * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * t / 9.0))
    fade = np.minimum(1, t / 1.5) * np.minimum(1, np.maximum(0, (dur + 0.4 - t)) / 1.0)
    sfx += drone * fade * db(-36)


PALETTES = {
    "unreal-actually": dict(hit=ua_hit, swell=ua_swell, riser=ua_riser, sweep=ua_sweep, tick=ua_tick, pop=ua_pop, bed=ua_bed, duck=0.6),
}


def put(buf, x, t):
    i = int(t * SR)
    if i < 0 or i >= len(buf): return
    j = min(len(buf), i + len(x)); buf[i:j] += x[:j - i]


def main(ep):
    out = os.path.join(ep, "out")
    tl = json.load(open(os.path.join(out, "timeline.json")))
    cues = json.load(open(os.path.join(out, "cues.json"))) if os.path.exists(os.path.join(out, "cues.json")) else []
    N = int((tl["duration"] + 0.6) * SR)
    vo = np.zeros(N); sfx = np.zeros(N)
    for b in tl["beats"]:
        s, sr = sf.read(os.path.join(out, "audio", b["id"] + ".wav"))
        s = np.interp(np.arange(int(len(s) * SR / sr)) / SR * sr, np.arange(len(s)), s)
        put(vo, s, b["start"])
    name = json.load(open(os.path.join(ep, "script.json"))).get("sound", "default")
    pal = PALETTES.get(name)
    if pal:
        pal["bed"](sfx, tl["duration"])
        for c in cues:
            k = c["type"]
            if k == "hit": put(sfx, pal["hit"](c.get("gain", 1.0)), c["t"])
            elif k == "swell": put(sfx, pal["swell"](c.get("dur", 1.5)), c["t"])
            elif k == "riser": put(sfx, pal["riser"](c.get("dur", 2.0)), c["t"])
            elif k == "sweep": put(sfx, pal["sweep"](c.get("dur", .5)), c["t"])
            elif k == "pop": put(sfx, pal["pop"](), c["t"])
            elif k == "tick":
                step = 1.0 / c.get("rate", 1.0); i = 0; t = c["t"]
                while t < c["t1"]:
                    put(sfx, pal["tick"](i % 2 == 1), t); t += step; i += 1
        cues = []
    else:
        p = pulse()  # sparse steady pulse (one low thump every 1.6 s)
        for t in np.arange(0.4, tl["duration"], 1.6): put(sfx, p, t)
    for c in cues:
        k = c["type"]
        if k == "scratch": put(sfx, scratch(max(0.12, c.get("dur", 0.5))), c["t"])
        elif k == "thud": put(sfx, thud(), c["t"])
        elif k == "pop": put(sfx, pop(), c["t"])
        elif k == "tick":
            step = 1.0 / c.get("rate", 1.0); i = 0; t = c["t"]
            while t < c["t1"]:
                put(sfx, tick(i % 2 == 1), t); t += step; i += 1
    # duck sfx under VO
    w = int(0.05 * SR)
    e = np.sqrt(np.convolve(vo ** 2, np.ones(w) / w, mode="same"))
    e = np.convolve(e, np.ones(int(0.15 * SR)) / int(0.15 * SR), mode="same")
    duck = 1 - (pal["duck"] if pal else 0.65) * np.clip(e / (e.max() * 0.25 + 1e-9), 0, 1)
    mix = vo * 0.9 + sfx * duck
    mix = np.tanh(mix * 0.9) / 0.9 if np.abs(mix).max() > 0.95 else mix
    wav = os.path.join(out, "mix.wav")
    sf.write(wav, np.stack([mix, mix], 1), SR, subtype="PCM_24")
    # two-pass loudnorm to -14 LUFS / -1.5 dBTP, then AAC
    tgt = "I=-14:TP=-1.5:LRA=11"
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", wav, "-af", f"loudnorm={tgt}:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S).group(0))
    af = (f"loudnorm={tgt}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
          f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,alimiter=limit=0.84:level=disabled")
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", wav, "-af", af, "-ar", "48000",
                    "-c:a", "aac", "-b:a", "192k", os.path.join(out, "audio.m4a")], check=True)
    print("audio.m4a written; pre-master I=%s TP=%s" % (m["input_i"], m["input_tp"]))


if __name__ == "__main__":
    main(sys.argv[1])
