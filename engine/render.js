#!/usr/bin/env node
// Render an episode: node engine/render.js <episodeDir> [--cover] [--frames 0.5,1.8] [--cues] [--out dir] [--fps 30]
// Serves the repo root on a local port, drives the episode page with Playwright, pipes frames into ffmpeg.
const fs = require("fs"), path = require("path"), http = require("http"), { spawn } = require("child_process");
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const flag = n => args.includes("--" + n);
const val = n => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : null; };
const epDir = path.resolve(args.find(a => !a.startsWith("--") && fs.existsSync(a) && fs.statSync(a).isDirectory()) || ".");
const root = path.resolve(__dirname, "..");
const outDir = path.join(epDir, "out");
const W = 1080, H = 1920, FPS = parseInt(val("fps") || "30", 10);
const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      const p = path.join(root, decodeURIComponent(q.url.split("?")[0]));
      if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { "content-type": MIME[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(p).pipe(r);
    }).listen(0, "127.0.0.1", () => res(srv));
  });
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const srv = await serve(), port = srv.address().port;
  const rel = path.relative(root, epDir).split(path.sep).join("/");
  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", e => console.error("PAGE ERROR", e.message));
  page.on("console", m => { if (m.type() === "error") console.error("console:", m.text()); });
  const url = `http://127.0.0.1:${port}/${rel}/index.html` + (flag("cover") ? "?cover=1" : (val("q") ? "?" + val("q") : ""));
  await page.goto(url);
  await page.waitForFunction("window.__ready === true", null, { timeout: 180000 });
  const dur = await page.evaluate(() => window.__duration || 0);

  if (flag("cues")) {
    const cues = await page.evaluate(() => window.__cues);
    fs.writeFileSync(path.join(outDir, "cues.json"), JSON.stringify(cues, null, 1));
    console.log("cues:", cues.length);
  } else if (flag("cover")) {
    await page.evaluate(() => window.__seek(0));
    await page.screenshot({ path: path.join(outDir, "cover.png"), type: "png" });
    console.log("wrote cover.png");
  } else if (val("frames")) {
    const d = val("out") ? path.resolve(val("out")) : path.join(outDir, "frames"); fs.mkdirSync(d, { recursive: true });
    for (const t of val("frames").split(",").map(Number)) {
      await page.evaluate(t => window.__seek(t), t);
      await page.screenshot({ path: path.join(d, `f_${t.toFixed(2).padStart(6, "0")}.png`), type: "png" });
    }
    console.log("frames written to", d);
  } else {
    const tl = JSON.parse(fs.readFileSync(path.join(outDir, "timeline.json")));
    const audio = path.join(outDir, "audio.m4a");
    const name = (JSON.parse(fs.readFileSync(path.join(epDir, "script.json"))).slug || "episode").match(/^ep\d+/)[0] + ".mp4";
    const wipDir = path.join(outDir, "wip"); fs.mkdirSync(wipDir, { recursive: true });
    const outFile = path.join(wipDir, name), partial = path.join(wipDir, "." + name.replace(".mp4", ".partial.mp4"));
    const n = Math.round(tl.duration * FPS);
    // Chunked + resumable: frames are encoded in CHUNK-frame segments under wip/chunks-<ep>/ by WORKERS
    // parallel browsers; finished segments are kept, so a killed render resumes where it stopped.
    const CHUNK = parseInt(val("chunk") || "150", 10), WORKERS = parseInt(val("workers") || process.env.RENDER_WORKERS || "2", 10);
    const chunkDir = path.join(wipDir, "chunks-" + name.replace(".mp4", ""));
    if (flag("fresh")) fs.rmSync(chunkDir, { recursive: true, force: true });
    fs.mkdirSync(chunkDir, { recursive: true });
    const stamp = JSON.stringify({ n, CHUNK, FPS, mtime: ["scene.js", "overlay.js", "theme.js", "index.html"].map(f => { try { return fs.statSync(path.join(epDir, f)).mtimeMs; } catch { return 0; } }) });
    const stampFile = path.join(chunkDir, "stamp.json");
    if (fs.existsSync(stampFile) && fs.readFileSync(stampFile, "utf8") !== stamp) { console.log("scene changed since last chunks: starting fresh"); fs.rmSync(chunkDir, { recursive: true, force: true }); fs.mkdirSync(chunkDir, { recursive: true }); }
    fs.writeFileSync(stampFile, stamp);
    const chunks = []; for (let s = 0, k = 0; s < n; s += CHUNK, k++) chunks.push({ k, s, e: Math.min(n, s + CHUNK), file: path.join(chunkDir, `c_${String(k).padStart(4, "0")}.mp4`) });
    const todo = chunks.filter(c => !fs.existsSync(c.file));
    console.log(`${chunks.length} chunks, ${chunks.length - todo.length} already done, ${WORKERS} workers`);
    const t0 = Date.now(); let doneFrames = 0;
    const encodeArgs = ["-c:v", "libx264", "-profile:v", "high", "-level:v", "4.2", "-preset", "slow", "-tune", "film", "-crf", "17", "-maxrate", "9M", "-bufsize", "9M", "-pix_fmt", "yuv420p", "-r", String(FPS), "-g", String(FPS * 2),
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709"];
    async function worker(pg) {
      for (let c; (c = todo.shift());) {
        const tmp = c.file + ".tmp.mp4";
        const ff = spawn("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", ...encodeArgs, tmp], { stdio: ["pipe", "inherit", "inherit"] });
        const closed = new Promise(r => ff.on("close", r));
        for (let i = c.s; i < c.e; i++) {
          await pg.evaluate(t => window.__seek(t), i / FPS);
          const buf = await pg.screenshot({ type: "jpeg", quality: 98, timeout: 300000 });
          if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
        }
        ff.stdin.end(); if ((await closed) !== 0) throw new Error("ffmpeg failed on chunk " + c.k);
        fs.renameSync(tmp, c.file); doneFrames += c.e - c.s;
        console.log(`chunk ${c.k + 1}/${chunks.length} done  (${doneFrames} new frames, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
      }
    }
    const pages = [page]; const extra = [];
    for (let w = 1; w < Math.min(WORKERS, todo.length); w++) {
      const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"] });
      const pg = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
      await pg.goto(url); await pg.waitForFunction("window.__ready === true", null, { timeout: 180000 });
      pages.push(pg); extra.push(b);
    }
    await Promise.all(pages.map(worker));
    for (const b of extra) await b.close();
    const list = path.join(chunkDir, "list.txt");
    fs.writeFileSync(list, chunks.map(c => `file '${path.basename(c.file)}'`).join("\n") + "\n");
    const mux = spawn("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list,
      ...(fs.existsSync(audio) ? ["-i", audio, "-map", "0:v", "-map", "1:a", "-c:a", "copy", "-t", String(n / FPS)] : []),
      "-c:v", "copy", "-movflags", "+faststart", partial], { stdio: ["ignore", "inherit", "inherit"] });
    const code = await new Promise(r => mux.on("close", r)); if (code !== 0) throw new Error("concat/mux failed " + code);
    fs.renameSync(partial, outFile);
    console.log(`rendered ${outFile} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    // SRT from the timeline
    const ts = s => { const ms = Math.round(s * 1000), p = (v, l = 2) => String(v).padStart(l, "0"); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
    let k = 1, srt = "";
    for (const b of tl.beats) for (const c of b.captions) {
      const words = c.text.split(" "), lines = []; let cur = "";
      for (const w of words) { if (cur && (cur + " " + w).length > 24) { lines.push(cur); cur = w; } else cur = cur ? cur + " " + w : w; }
      if (cur) lines.push(cur);
      srt += `${k++}\n${ts(c.start)} --> ${ts(c.end)}\n${lines.join("\n")}\n\n`;
    }
    fs.writeFileSync(path.join(outDir, name.replace(".mp4", ".srt")), srt);
  }
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
