#!/usr/bin/env python3
"""Measure a rendered episode -> out/render-report.md + out/contact-sheet.jpg.
usage: python engine/measure.py <episode_dir>   (needs ffmpeg/ffprobe; Pillow optional -> falls back to ffmpeg tile)"""
import glob, json, os, re, subprocess, sys

def run(cmd): return subprocess.run(cmd, capture_output=True, text=True)

def main(ep):
    out = os.path.join(ep, "out")
    mp4 = (sorted(glob.glob(os.path.join(out, "wip", "ep*.mp4"))) or sorted(glob.glob(os.path.join(out, "ep*.mp4"))))[0]
    tl = json.load(open(os.path.join(out, "timeline.json")))
    pr = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", mp4]).stdout)
    v = next(s for s in pr["streams"] if s["codec_type"] == "video"); a = next(s for s in pr["streams"] if s["codec_type"] == "audio")
    dur = float(pr["format"]["duration"]); size = int(pr["format"]["size"])
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", mp4, "-af", "ebur128=peak=true", "-vn", "-f", "null", "-"]).stderr
    summ = r[r.rfind("Summary:"):]
    I = re.search(r"I:\s+(-?[\d.]+) LUFS", summ).group(1); LRA = re.search(r"LRA:\s+([\d.]+) LU", summ).group(1)
    TP = re.search(r"Peak:\s+(-?[\d.]+) dBFS", summ).group(1)
    bd = run(["ffmpeg", "-hide_banner", "-nostats", "-i", mp4, "-vf", "blackdetect=d=0.1:pix_th=0.10", "-an", "-f", "null", "-"]).stderr
    blacks = re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", bd)
    fz = run(["ffmpeg", "-hide_banner", "-nostats", "-i", mp4, "-vf", "freezedetect=n=0.00001:d=0.5", "-an", "-f", "null", "-"]).stderr
    starts = [float(x) for x in re.findall(r"freeze_start: ([\d.]+)", fz)]; ends = [float(x) for x in re.findall(r"freeze_end: ([\d.]+)", fz)]
    freezes = []
    for i, s in enumerate(starts): freezes.append((s, ends[i] if i < len(ends) else dur))
    # intentional holds: the rule beat hold and the end card
    holds = []
    for b in tl["beats"]:
        if b["id"] == "b13" or b is tl["beats"][-1]: holds.append((b["end"] - 0.1, b["next"] + 0.1))
    def intentional(f): return any(f[0] >= h[0] - 1.5 and f[1] <= h[1] + 1.5 for h in holds)
    lines = ["# Render report", "",
        f"- File: `{os.path.basename(mp4)}` ({size/1e6:.1f} MB), overall bitrate {int(pr['format'].get('bit_rate', 0))/1e6:.2f} Mb/s (video {int(v.get('bit_rate', 0))/1e6:.2f} Mb/s)", f"- Duration: {dur:.2f} s (target 70-80 s)",
        f"- Resolution: {v['width']}x{v['height']}  fps: {eval(v['r_frame_rate']):.2f}  codec: {v['codec_name']} {v.get('profile','')} {v['pix_fmt']}",
        f"- Audio: {a['codec_name']} {a['sample_rate']} Hz {a['channels']} ch",
        f"- Loudness: integrated {I} LUFS (target -14), LRA {LRA} LU, true peak {TP} dBTP (limit -1)",
        f"- Black frames (>=0.1 s): {'none' if not blacks else ', '.join(f'{s}-{e}s' for s, e in blacks)}",
        "- Freeze detection (>=0.5 s of identical frames):"]
    if not freezes: lines.append("  - none")
    for s, e in freezes:
        flag = "" if e - s <= 2 else (" (intentional hold)" if intentional((s, e)) else "  **FLAG: freeze > 2 s, not an intentional hold**")
        lines.append(f"  - {s:.2f}-{e:.2f} s ({e-s:.2f} s){flag}")
    lines += ["", "Contact sheet: `contact-sheet.jpg` (a frame every 2.5 s)."]
    open(os.path.join(out, "render-report.md"), "w").write("\n".join(lines) + "\n")
    # contact sheet
    tmp = os.path.join(out, "_cs"); os.makedirs(tmp, exist_ok=True)
    n = int(dur // 2.5) + 1
    from PIL import Image, ImageDraw
    ims = []
    for i in range(n):
        t = min(i * 2.5, dur - 0.05); p = os.path.join(tmp, f"{i:03d}.jpg")
        run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(t), "-i", mp4, "-frames:v", "1", "-vf", "scale=270:480", p])
        im = Image.open(p).convert("RGB"); ImageDraw.Draw(im).rectangle([0, 0, 62, 20], fill=(21, 23, 28))
        ImageDraw.Draw(im).text((4, 4), f"{t:5.1f}s", fill=(255, 255, 255)); ims.append(im)
    cols = 8; rows = (n + cols - 1) // cols
    sheet = Image.new("RGB", (cols * 274, rows * 484), (60, 60, 60))
    for i, im in enumerate(ims): sheet.paste(im, ((i % cols) * 274 + 2, (i // cols) * 484 + 2))
    sheet.save(os.path.join(out, "contact-sheet.jpg"), quality=88)
    for f in glob.glob(os.path.join(tmp, "*")): os.remove(f)
    os.rmdir(tmp)
    print("\n".join(lines))

if __name__ == "__main__":
    main(sys.argv[1])
