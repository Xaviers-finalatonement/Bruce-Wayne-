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
    # audible on phone speakers: a 2-5 kHz transient click + a short mid "knock" (150-400 Hz) over the sub
    click = bandnoise(n, 2000, 5500) * env_exp(n, 0.006) * 0.9
    knock = np.sin(2 * np.pi * np.cumsum(180 + 220 * np.exp(-t / 0.03)) / SR) * env_exp(n, 0.07) * 0.6
    return (body + sub + 0.5 * thump + air + click + knock) * db(-9) * gain


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
    # quiet music bed: slow minor pad (Dm9-ish) + a soft pulse, sits ~24 dB under the VO
    pad = np.zeros(n)
    for f, a in [(73.4, 1.0), (110.0, .8), (146.8, .7), (174.6, .55), (220.0, .4), (329.6, .25)]:
        for det in (-.6, .6):
            pad += a * np.sin(2 * np.pi * (f + det * f / 220.0) * t + det) * (0.7 + 0.3 * np.sin(2 * np.pi * t / (11.0 + f / 40)))
    pad = lowpass(pad, 900)
    beat = np.zeros(n)
    for tt in np.arange(0.5, dur, 0.8):
        i = int(tt * SR); m = min(n - i, int(0.18 * SR))
        if m > 0: beat[i:i + m] += np.sin(2 * np.pi * 52 * np.arange(m) / SR) * env_exp(m, 0.05) + 0.35 * np.sin(2 * np.pi * 880 * np.arange(m) / SR) * env_exp(m, 0.012)
    sfx += (pad * 0.5 + beat * 0.5) * fade * db(-30)


# ---- palette "pan-theory": warm kitchen foley (sizzle, chop, pour) over a light plucked-string bed ----
def pt_env(n, a, r): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.minimum(1, np.maximum(0, (n / SR - t)) / max(r, 1e-4))


def pt_hit(gain=1.0):  # knife on board: dry wooden transient + short body
    n = int(0.18 * SR); t = np.arange(n) / SR
    tr = bandnoise(n, 1200, 6500) * env_exp(n, 0.006); body = np.sin(2 * np.pi * (170 - 60 * t / 0.05 * (t < 0.05)) * t) * env_exp(n, 0.035)
    return (0.8 * tr + 0.6 * body) * db(-19) * gain


def pt_swell(dur):  # soft steam breath
    n = int(dur * SR); x = lowpass(bandnoise(n, 300, 4500), 2600)
    return x * pt_env(n, dur * 0.55, dur * 0.45) * db(-30)


def pt_riser(dur): return pt_swell(dur)


def pt_sweep(dur):  # cloth / soft whoosh
    n = int(dur * SR); x = lowpass(bandnoise(n, 500, 3500), 2200)
    return x * pt_env(n, dur * 0.4, dur * 0.6) * db(-31)


def pt_tick(tock=False):  # wooden spoon tap
    n = int(0.05 * SR); t = np.arange(n) / SR
    return (bandnoise(n, 1500, 5000) * env_exp(n, 0.004) * 0.6 + np.sin(2 * np.pi * (620 if tock else 800) * t) * env_exp(n, 0.012) * 0.5) * db(-29)


def pt_pop():  # oil bubble pop
    n = int(0.08 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (900 - 6000 * t) * t) * env_exp(n, 0.012) + 0.3 * bandnoise(n, 2000, 8000) * env_exp(n, 0.004)) * db(-27)


def pt_sizzle(c):  # filtered noise bed with crackle; k = intensity
    dur = max(0.3, c.get("dur", 1.0)); k = c.get("k", 1.0); n = int(dur * SR); t = np.arange(n) / SR
    hiss = bandnoise(n, 3500, 11000) * (0.7 + 0.3 * lowpass(rng.standard_normal(n), 25) / 0.05 * 0.05 + 0.0)
    hiss = hiss * (0.8 + 0.2 * np.sin(2 * np.pi * 7 * t + 1.3))
    body = lowpass(bandnoise(n, 400, 2500), 1800) * 0.35
    cr = np.zeros(n)
    for _ in range(int(dur * 26 * k)):
        i = int(rng.uniform(0, n - 400)); m = 300
        cr[i:i + m] += rng.uniform(0.3, 1.0) * rng.standard_normal(m) * env_exp(m, rng.uniform(0.0008, 0.003))
    x = (0.5 * hiss + body) * db(-34 + 3 * k) + cr * db(-26)
    return x * pt_env(n, min(0.5, dur * 0.3), min(0.7, dur * 0.4))


def pt_pour(c):  # liquid stream: modulated mid noise
    dur = c.get("dur", 1.5); n = int(dur * SR); t = np.arange(n) / SR
    x = bandnoise(n, 500, 3200) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t + 3 * np.sin(2 * np.pi * 3 * t)) ** 2)
    return lowpass(x, 3000) * pt_env(n, 0.15, 0.5) * db(-28)


def pt_plop(c):  # veg hitting the pan
    n = int(0.25 * SR); t = np.arange(n) / SR; g = c.get("gain", 1.0)
    return (np.sin(2 * np.pi * (260 - 380 * t) * t) * env_exp(n, 0.04) + 0.5 * bandnoise(n, 800, 6000) * env_exp(n, 0.02)) * db(-23) * g


def pt_hiss(c):
    dur = c.get("dur", 1.5); n = int(dur * SR)
    return bandnoise(n, 4000, 12000) * pt_env(n, dur * 0.3, dur * 0.7) * db(-33)


def pt_clink(c):  # glass / metal ping
    n = int(0.6 * SR); t = np.arange(n) / SR; g = c.get("gain", 1.0)
    return sum(np.sin(2 * np.pi * f * t) * a for f, a in [(1760, 1), (2637, .5), (3951, .25)]) * env_exp(n, 0.12) * db(-33) * g


def pt_whoosh(c): return pt_sweep(c.get("dur", 0.8))


def pt_pluck(f, dur=0.9):  # Karplus-Strong string
    n = int(dur * SR); L = int(SR / f); buf = rng.uniform(-1, 1, L); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % L]; buf[i % L] = 0.4975 * (buf[i % L] + buf[(i + 1) % L])
    return out * np.minimum(1, np.arange(n) / (0.002 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.1 * SR))


def pt_sizzleup(c):  # hook: oil meets the hot pan; sizzle that builds from a hush to full over ~1.6 s
    dur = c.get("dur", 2.6); x = pt_sizzle({"dur": dur, "k": 1.5}); n = len(x); r = np.linspace(0, 1, n) ** 1.3
    return x * (0.12 + 0.88 * r) * 1.35


def _pt_hz(name):
    semi = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[name[0]]
    return 440.0 * 2 ** ((semi - 9 + 12 * (int(name[-1]) - 4)) / 12.0)


def pt_bed(sfx, dur):  # 92 bpm plucked bed: G - Em - C - D, a new chord every 4 bars; arpeggio + sparse bell counter-line + soft bass; drops out on "bedgap" cues
    n = len(sfx); beat = 60 / 92.0; eighth = beat / 2; bar8 = 8
    chords = [("G2", ["G3", "B3", "D4", "G4"], "D5"), ("E2", ["E3", "B3", "G4", "E4"], "B4"), ("C3", ["C4", "E4", "G4", "C4"], "G4"), ("D3", ["D4", "A3", "A4", "D4"], "A4")]
    names = {nm for ch in chords for nm in [ch[0], ch[2]] + ch[1]}
    cache = {nm: pt_pluck(_pt_hz(nm), 1.4 if nm[-1] in "23" else 0.9) for nm in names}
    t_ = np.arange(n) / SR
    fade = np.minimum(1, t_ / 1.5) * np.minimum(1, np.maximum(0, (dur + 0.4 - t_)) / 1.2)
    gaps = []
    try:
        cj = json.load(open(os.path.join(sys.argv[1], "out", "cues.json")))
        gaps = [(c["t"], c.get("dur", 1.0)) for c in cj if c.get("type") == "bedgap"]
    except Exception:
        pass
    mult = np.ones(n)
    for g0, gd in gaps:
        mult = np.minimum(mult, np.interp(t_, [g0 - 0.05, g0 + 0.3, g0 + gd, g0 + gd + 0.8], [1, 0, 0, 1], left=1, right=1))
    bed = np.zeros(n); i = 0; t = 0.3
    def put_note(nm, tt, gain):
        j = int(tt * SR); x = cache[nm]; m = min(n - j, len(x))
        if m > 0 and j >= 0: bed[j:j + m] += x[:m] * gain
    while t < dur:
        bar = i // bar8; pos = i % bar8; root, tones, top = chords[(bar // 4) % len(chords)]; phrase_bar = bar % 4
        arp = [0, 2, 1, 2, 3, 2, 1, 2][pos]
        put_note(tones[arp], t, 1.0 if pos % 4 == 0 else 0.6)                      # pattern 1: arpeggio
        if pos == 0: put_note(root, t, 0.85)                                       # soft bass on the one
        if phrase_bar >= 2 and pos in (3, 7): put_note(top, t, 0.5)                  # pattern 2: bell counter-line, second half of each phrase
        if phrase_bar == 3 and pos == 5: put_note(tones[3], t, 0.4)
        t += eighth; i += 1
    sfx += bed * fade * mult * db(-27)


# ---- palette "skin-receipts": thermal-printer ticks, soft paper/rubber stamp, water + fabric textures, light airy pad ----
def sr_tick(tock=False):  # thermal print head: tiny dry click + a high ping
    n = int(0.05 * SR); t = np.arange(n) / SR
    click = bandnoise(n, 2200, 9000) * env_exp(n, 0.0025)
    ping = np.sin(2 * np.pi * (3300 if tock else 2900) * t) * env_exp(n, 0.006)
    return (0.8 * click + 0.35 * ping) * db(-27)


def sr_hit(gain=1.0):  # rubber stamp on paper: soft low thud + short paper slap
    n = int(0.4 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (95 + 45 * np.exp(-t / 0.03)) * t) * env_exp(n, 0.07)
    slap = bandnoise(n, 700, 4200) * env_exp(n, 0.015)
    sub = np.sin(2 * np.pi * 52 * t) * env_exp(n, 0.16)
    return (body * 1.0 + slap * 0.55 + 0.7 * sub) * db(-9) * gain  # round-3: a stronger stamp hit widens the loudness range


def sr_swell(dur):  # water / fabric texture: soft band noise breathing in and out
    n = int(dur * SR); t = np.arange(n) / SR
    x = bandnoise(n, 500, 2600) * (0.6 + 0.4 * np.sin(2 * np.pi * 5.5 * t + 1.0) * np.sin(2 * np.pi * 1.7 * t))
    return x * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2 * db(-30)


def sr_riser(dur): return sr_swell(dur)


def sr_sweep(dur):  # towel / cloth swish
    n = int(dur * SR); t = np.arange(n) / SR
    return bandnoise(n, 1800, 7000) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5 * db(-31)


def sr_pop(): return sr_tick(False) * 1.2


def sr_rub(c):  # cloth rubbing on cloth: low-mid band noise with a slow stroke envelope
    dur = c.get("dur", 1.0); n = int(dur * SR); t = np.arange(n) / SR
    x = bandnoise(n, 300, 3200) * (0.5 + 0.5 * np.sin(2 * np.pi * 3.2 * t + 0.6)) ** 1.5
    return x * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.2 * db(-27)


def sr_wet(c):  # soft wet texture: band-limited noise with a few tiny bubbles
    dur = c.get("dur", 1.2); n = int(dur * SR); t = np.arange(n) / SR
    x = bandnoise(n, 250, 1500) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2 * 0.6
    r = np.random.default_rng(5)
    for tt in r.uniform(0.1, dur - 0.1, 6):
        i = int(tt * SR); m = min(n - i, int(.05 * SR)); tm = np.arange(m) / SR
        x[i:i + m] += np.sin(2 * np.pi * (r.uniform(500, 900) + 1800 * tm) * tm) * env_exp(m, 0.012) * 0.5
    return x * db(-29)


def sr_bed(sfx, dur):  # airy pad, chord moves every 8 bars (80 bpm, 4/4: 24 s), sparse quiet droplets 3-6 s apart
    n = len(sfx); t = np.arange(n) / SR
    fade = np.minimum(1, t / 2.0) * np.minimum(1, np.maximum(0, (dur + 0.4 - t)) / 1.2)
    bar = 4 * 60 / 80.0; seg = 8 * bar
    chords = [[130.8, 261.6, 329.6, 392.0, 493.9], [110.0, 220.0, 329.6, 392.0, 523.3], [87.3, 261.6, 349.2, 440.0, 523.3], [98.0, 246.9, 293.7, 392.0, 587.3]]
    pad = np.zeros(n)
    for ci, ch in enumerate(chords * int(dur / (seg * 4) + 2)):
        a0 = ci * seg - 1.5; a1 = (ci + 1) * seg + 1.5
        if a0 > dur + 1: break
        w = np.interp(t, [a0, a0 + 3, a1 - 3, a1], [0, 1, 1, 0], left=0, right=0)
        if not w.any(): continue
        for f in ch:
            for det in (-.5, .5):
                pad += w * np.sin(2 * np.pi * (f + det) * t + det) * (0.65 + 0.35 * np.sin(2 * np.pi * t / (9.0 + f / 70))) * (0.7 if f < 150 else 0.5)
    pad = lowpass(pad, 1700)
    sfx += pad * fade * db(-31)  # round-3: a little more bed in the gaps; ducks harder under the VO (duck 0.8)
    r = np.random.default_rng(11); tt = 2.5
    while tt < dur:  # faint water droplets, random 3-6 s apart
        i = int(tt * SR); m = min(n - i, int(.25 * SR))
        if m > 0:
            f = r.uniform(1100, 2100); tm = np.arange(m) / SR
            sfx[i:i + m] += np.sin(2 * np.pi * (f + 900 * tm) * tm) * env_exp(m, 0.03) * db(-48)
        tt += r.uniform(3, 6)


PALETTES = {
    "unreal-actually": dict(hit=ua_hit, swell=ua_swell, riser=ua_riser, sweep=ua_sweep, tick=ua_tick, pop=ua_pop, bed=ua_bed, duck=0.6),
    "pan-theory": dict(hit=pt_hit, swell=pt_swell, riser=pt_riser, sweep=pt_sweep, tick=pt_tick, pop=pt_pop, bed=pt_bed, duck=0.55,
                       custom=dict(sizzle=pt_sizzle, sizzleup=pt_sizzleup, pour=pt_pour, plop=pt_plop, hiss=pt_hiss, clink=pt_clink, whoosh=pt_whoosh, chop=lambda c: pt_hit(c.get("gain", 1.0)))),
    "skin-receipts": dict(hit=sr_hit, swell=sr_swell, riser=sr_riser, sweep=sr_sweep, tick=sr_tick, pop=sr_pop, bed=sr_bed, duck=0.8, custom=dict(rub=sr_rub, wet=sr_wet)),
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
            elif k in pal.get("custom", {}): put(sfx, pal["custom"][k](c), c["t"])
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
                    "-c:a", "aac", "-b:a", "320k", os.path.join(out, "audio.m4a")], check=True)
    print("audio.m4a written; pre-master I=%s TP=%s" % (m["input_i"], m["input_tp"]))


if __name__ == "__main__":
    main(sys.argv[1])
