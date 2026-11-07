'use strict';
// The studio: a tiny private site for one person. Node 22, no dependencies.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data', 'state'));
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const PASSWORD = process.env.STUDIO_PASSWORD || '';
const PORT = Number(process.env.PORT) || 8080;
const TZ = 'America/Los_Angeles';

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'catalog.json'), 'utf8'));
const CH = Object.fromEntries(catalog.channels.map((c) => [c.id, c]));
const EPS = catalog.episodes;
const EP = Object.fromEntries(EPS.map((e) => [e.id, e]));

const PLATFORMS = {
  youtube: { name: 'YouTube', url: 'https://studio.youtube.com', note: '' },
  tiktok: { name: 'TikTok', url: 'https://www.tiktok.com/upload', note: '' },
  instagram: { name: 'Instagram', url: 'https://www.instagram.com/', note: 'Post from the Instagram app on your phone.' },
};
const PKEYS = Object.keys(PLATFORMS);

/* ---------- helpers ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fileExists = (rel) => {
  if (!rel) return false;
  try { return fs.statSync(path.join(ROOT, rel)).isFile(); } catch { return false; }
};
const mediaUrl = (rel, dl) => '/media/' + rel.split('/').map(encodeURIComponent).join('/') + (dl ? '?download=1' : '');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function today() { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); } // YYYY-MM-DD in Pacific

/* ---------- state (separate from catalog; atomic writes) ---------- */
let state = { approvals: {}, posted: {} };
function loadState() {
  try { state = Object.assign({ approvals: {}, posted: {} }, JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))); } catch { /* first run */ }
}
function saveState() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = STATE_FILE + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, STATE_FILE);
}
const appr = (ep, p) => (state.approvals[ep] && state.approvals[ep][p]) || {};
const isReady = (ep, p) => !!(appr(ep, p).video && appr(ep, p).text);
const postedOn = (ep, p) => (state.posted[ep] || {})[p] || null;

function statusOf(e) {
  if (PKEYS.every((p) => postedOn(e.id, p))) return 'posted';
  if (PKEYS.every((p) => isReady(e.id, p))) return 'approved';
  return e.status;
}

/* ---------- platform text ---------- */
function parts(e, p) {
  const d = e[p] || {};
  const tags = (d.hashtags || []).join(' ');
  if (p === 'youtube') return { title: d.title || 'TODO', body: d.description || 'TODO', tags };
  return { title: null, body: d.caption || 'TODO', tags };
}
const allText = (e, p) => { const x = parts(e, p); return x.body + (x.tags ? '\n\n' + x.tags : ''); };

/* ---------- layout ---------- */
const NAV = [['/', 'Home'], ['/review', 'Review'], ['/upload', 'Upload'], ['/calendar', 'Calendar'], ['/lessons', 'Lessons']];
const TODOS = ['YouTube handles x3', 'TikTok handles x3', 'Instagram handle x1', 'Final channel names (current names are drafts)'];

function chStyle(c) {
  return `--ch-bg:${c.bg};--ch-ink:${c.ink};--ch-accent:${c.accent};--ch-hi:${c.tint};--ch-hi2:${c.accent2}`;
}

function page(title, cur, body, opts = {}) {
  const nav = NAV.map(([h, l]) => `<a href="${h}"${h === cur ? ' aria-current="page"' : ''}>${l}</a>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="color-scheme" content="light">
<title>${esc(title)} · Studio</title>
<link rel="preload" href="/fonts/atkinson-hyperlegible/atkinson-hyperlegible-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/static/style.css">
</head><body${opts.style ? ` style="${esc(opts.style)}"` : ''}>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap">
<a class="brand" href="/">The studio</a>
<nav aria-label="Main">${nav}</nav>
</div></header>
<main id="main" class="wrap">
${body}
</main>
<footer class="foot"><div class="wrap">
<h2>Still to do</h2>
<ul>${TODOS.map((t) => `<li>TODO: ${esc(t)}</li>`).join('')}</ul>
<p class="small">Nothing is ever posted for you. You post by hand.</p>
</div></footer>
<script src="/static/app.js" defer></script>
</body></html>`;
}

const chip = (s) => `<span class="chip s-${s.replace(/\s/g, '-')}">${esc(s)}</span>`;
const tick = (ok) => (ok ? '<span class="ok" aria-hidden="true">✓</span> ' : '');

function field(label, id, text, rows = 3) {
  return `<div class="field"><div class="fhead"><label for="${id}">${esc(label)}</label>
<button type="button" class="btn small copy" data-copy-from="${id}" hidden>Copy</button></div>
<textarea id="${id}" readonly rows="${rows}">${esc(text)}</textarea></div>`;
}

function dlButtons(e) {
  const items = [['video', 'Download video', e.video, `${slug(CH[e.channel].name)}-ep0${e.number}.mp4`, 'Video not rendered yet'],
    ['cover', 'Download thumbnail', e.cover, '', 'Thumbnail not ready yet'],
    ['srt', 'Download captions (.srt)', e.srt, '', 'Captions not ready yet']];
  return items.map(([, label, rel, , missing]) => (fileExists(rel)
    ? `<a class="btn" href="${mediaUrl(rel, true)}">${label}</a>`
    : `<span class="btn off" role="note">${missing}</span>`)).join('');
}

/* ---------- pages ---------- */
function homePage() {
  const cards = catalog.channels.map((c) => {
    const list = EPS.filter((e) => e.channel === c.id);
    const counts = {};
    list.forEach((e) => { const s = statusOf(e); counts[s] = (counts[s] || 0) + 1; });
    const prog = Object.entries(counts).filter(([s]) => s !== 'planned').map(([s, n]) => `${n} of ${list.length} ${s}`).join(' · ') || `0 of ${list.length} started`;
    const segs = list.map((e) => `<i class="seg s-${statusOf(e).replace(/\s/g, '-')}" title="Ep ${e.number}: ${esc(statusOf(e))}"></i>`).join('');
    return `<li><a class="chcard" style="${esc(chStyle(c))}" href="/channel/${c.id}">
<span class="chname">${esc(c.name)}</span><span class="chsub">${esc(c.subject)}</span>
<span class="segs" aria-hidden="true">${segs}</span><span class="chprog">${esc(prog)}</span></a></li>`;
  }).join('');
  const ready = [];
  EPS.forEach((e) => PKEYS.forEach((p) => { if (isReady(e.id, p) && !postedOn(e.id, p)) ready.push([e, p]); }));
  const rl = ready.length
    ? `<ul class="rows">${ready.map(([e, p]) => `<li><a href="/episode/${e.id}"><b>${esc(CH[e.channel].name)} · Ep ${e.number}</b><span>${esc(e.title)}</span></a><em>${PLATFORMS[p].name}</em></li>`).join('')}</ul>
<p><a class="btn primary" href="/upload">Go to the posting queue</a></p>`
    : `<p class="empty">Nothing is ready yet. Approve a video and its text on the <a href="/review">Review</a> page and it shows up here.</p>`;
  return page('Home', '/', `<h1>Your channels</h1><ul class="cards">${cards}</ul>
<section><h2>Ready to post</h2>${rl}</section>`);
}

function channelPage(c) {
  const rows = EPS.filter((e) => e.channel === c.id).map((e) => {
    const s = statusOf(e);
    return `<li><a href="/episode/${e.id}"><span class="num">${e.number}</span><span class="t">${esc(e.title)}</span>${chip(s)}</a></li>`;
  }).join('');
  return page(c.name, '/', `<p class="crumb"><a href="/">Home</a></p>
<div class="chhead" style="${esc(chStyle(c))}"><h1>${esc(c.name)}</h1><p>${esc(c.subject)}</p></div>
<ol class="eplist">${rows}</ol>`, { style: chStyle(c) });
}

function episodePage(e) {
  const c = CH[e.channel];
  const hasVideo = fileExists(e.video);
  const hasCover = fileExists(e.cover);
  const player = hasVideo
    ? `<video class="player" controls playsinline preload="metadata"${hasCover ? ` poster="${mediaUrl(e.cover)}"` : ''} src="${mediaUrl(e.video)}"></video>`
    : `<div class="player empty-player"><p><b>Video not rendered yet</b></p><p>It will appear here as soon as it is ready.</p></div>`;
  const cover = hasCover ? `<img class="cover" src="${mediaUrl(e.cover)}" alt="Thumbnail for ${esc(e.title)}" width="180" height="320" loading="lazy">` : '';
  const g = e.gate ? `<p class="gate"><b>Fact check:</b> ${esc(e.gate.summary || '')}${e.gate.score != null ? ` Gate score ${esc(e.gate.score)}.` : ''}</p>` : '';
  const panels = PKEYS.map((p) => {
    const P = PLATFORMS[p]; const x = parts(e, p); const id = `${e.id}-${p}`;
    const r = isReady(e.id, p); const d = postedOn(e.id, p);
    return `<section class="panel" id="${p}"><h2>${P.name} ${r ? '<span class="chip s-approved">ready</span>' : ''}${d ? `<span class="chip s-posted">posted ${esc(d)}</span>` : ''}</h2>
${x.title !== null ? field('Title', id + '-title', x.title, 2) : ''}
${field(p === 'youtube' ? 'Description' : 'Caption', id + '-body', x.body, 10)}
${field('Hashtags', id + '-tags', x.tags || 'TODO', 2)}
<textarea id="${id}-all" hidden>${esc(allText(e, p))}</textarea>
<p class="row"><button type="button" class="btn small copy" data-copy-from="${id}-all" hidden>Copy caption + hashtags</button>
<a class="btn" href="${P.url}" target="_blank" rel="noopener">Open upload page</a></p>
${P.note ? `<p class="small">${P.note}</p>` : ''}</section>`;
  }).join('');
  return page(`${c.name} Ep ${e.number}`, '/', `<p class="crumb"><a href="/">Home</a> / <a href="/channel/${c.id}">${esc(c.name)}</a></p>
<div class="chhead" style="${esc(chStyle(c))}"><p class="eyebrow">${esc(c.name)} · Ep ${e.number}</p><h1>${esc(e.title)}</h1><p>${chip(statusOf(e))}</p></div>
<div class="media">${player}${cover}</div>
${g}
<div class="dl">${dlButtons(e)}</div>
${panels}`, { style: chStyle(c) });
}

function approveForm(e, p, kind, label) {
  const on = !!appr(e.id, p)[kind];
  return `<form method="post" action="/review/approve" class="appr">
<input type="hidden" name="ep" value="${e.id}"><input type="hidden" name="platform" value="${p}"><input type="hidden" name="kind" value="${kind}"><input type="hidden" name="value" value="${on ? 0 : 1}">
<button class="btn ${on ? 'on' : ''}" type="submit" aria-pressed="${on}">${on ? '✓ ' : ''}${label}${on ? ' approved' : ''}</button></form>`;
}

function reviewPage() {
  const list = EPS.filter((e) => e.video);
  const body = list.length ? list.map((e) => {
    const c = CH[e.channel];
    const rows = PKEYS.map((p) => `<div class="prow"><h3>${PLATFORMS[p].name}${isReady(e.id, p) ? ' <span class="chip s-approved">ready to post</span>' : ''}</h3>
<div class="row">${approveForm(e, p, 'video', 'Approve video')}${approveForm(e, p, 'text', 'Approve text')}</div></div>`).join('');
    return `<section class="panel" id="${e.id}" style="${esc(chStyle(c))}"><p class="eyebrow">${esc(c.name)} · Ep ${e.number}</p>
<h2><a href="/episode/${e.id}">${esc(e.title)}</a></h2>
<p class="small">${fileExists(e.video) ? 'Watch the video and read the text on the episode page, then approve.' : 'The video is not rendered yet. You can approve once you have watched it.'}</p>
${rows}</section>`;
  }).join('') : '<p class="empty">No episode has a video yet.</p>';
  return page('Review', '/review', `<h1>Review</h1><p class="lead">Approve the video and the text for each platform. A platform is ready only when both are approved. Approving never posts anything.</p>${body}`);
}

function uploadPage() {
  const q = []; const done = [];
  EPS.forEach((e) => PKEYS.forEach((p) => { if (isReady(e.id, p)) (postedOn(e.id, p) ? done : q).push([e, p]); }));
  const items = q.map(([e, p]) => {
    const c = CH[e.channel]; const P = PLATFORMS[p]; const x = parts(e, p); const id = `${e.id}-${p}`;
    const v = fileExists(e.video) ? `<a class="btn" href="${mediaUrl(e.video, true)}">Download video</a>` : '<span class="btn off" role="note">Video not rendered yet</span>';
    const t = fileExists(e.cover) ? `<a class="btn" href="${mediaUrl(e.cover, true)}">Download thumbnail</a>` : '<span class="btn off" role="note">Thumbnail not ready yet</span>';
    return `<article class="panel queue" style="${esc(chStyle(c))}"><p class="eyebrow">${esc(c.name)} · Ep ${e.number} → ${P.name}</p>
<h2><a href="/episode/${e.id}">${esc(e.title)}</a></h2>
<ol class="steps">
<li><span class="n">1</span><div><b>Download video</b><p>${v}</p></div></li>
<li><span class="n">2</span><div><b>Download thumbnail</b><p>${t}</p></div></li>
<li><span class="n">3</span><div><b>Copy ${x.title !== null ? 'title, then description' : 'caption'}</b>
${x.title !== null ? field('Title', id + '-title', x.title, 2) : ''}${field(x.title !== null ? 'Description' : 'Caption', id + '-body', x.body, 7)}</div></li>
<li><span class="n">4</span><div><b>Copy hashtags</b>${field('Hashtags', id + '-tags', x.tags || 'TODO', 2)}</div></li>
<li><span class="n">5</span><div><b>Open upload page</b><p><a class="btn" href="${P.url}" target="_blank" rel="noopener">Open ${P.name}</a></p>${P.note ? `<p class="small">${P.note}</p>` : ''}</div></li>
<li><span class="n">6</span><div><b>Mark as posted</b><p class="small">Press this after you have posted by hand. It records today's date.</p>
<form method="post" action="/upload/posted"><input type="hidden" name="ep" value="${e.id}"><input type="hidden" name="platform" value="${p}"><input type="hidden" name="value" value="1"><button class="btn primary" type="submit">Mark as posted</button></form></div></li>
</ol></article>`;
  }).join('');
  const doneHtml = done.length ? `<section><h2>Posted</h2><ul class="rows">${done.map(([e, p]) => `<li><a href="/episode/${e.id}"><b>${esc(CH[e.channel].name)} · Ep ${e.number}</b><span>${PLATFORMS[p].name} · ${esc(postedOn(e.id, p))}</span></a>
<form method="post" action="/upload/posted"><input type="hidden" name="ep" value="${e.id}"><input type="hidden" name="platform" value="${p}"><input type="hidden" name="value" value="0"><button class="btn small" type="submit">Undo</button></form></li>`).join('')}</ul></section>` : '';
  return page('Upload', '/upload', `<h1>Posting queue</h1>
${q.length ? `<p class="lead">${q.length} to post. Follow the six steps, top to bottom.</p>${items}` : '<p class="empty">The queue is empty. Items appear here once both the video and the text are approved on the <a href="/review">Review</a> page.</p>'}
${doneHtml}`);
}

/* calendar: 3 weeks from this week's Monday (Pacific). Two slots per channel per week. */
const SLOTS = { 'pan-theory': [0, 3], 'skin-receipts': [1, 4], 'unreal-actually': [2, 5] }; // offsets from Monday
function calendarPage() {
  const [y, m, d] = today().split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12));
  const dow = (base.getUTCDay() + 6) % 7; // Mon=0
  base.setUTCDate(base.getUTCDate() - dow);
  const fmt = (dt) => dt.toISOString().slice(0, 10);
  const label = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric' });
  const days = [];
  for (let i = 0; i < 21; i++) { const dt = new Date(base); dt.setUTCDate(base.getUTCDate() + i); days.push(dt); }
  const slotEp = {};
  Object.entries(SLOTS).forEach(([ch, offs]) => {
    const list = EPS.filter((e) => e.channel === ch);
    let k = 0;
    for (let w = 0; w < 3; w++) offs.forEach((o) => { slotEp[`${ch}:${w * 7 + o}`] = list[k++]; });
  });
  const t = today();
  const html = [0, 1, 2].map((w) => {
    const rows = days.slice(w * 7, w * 7 + 7).map((dt, j) => {
      const idx = w * 7 + j; const ds = fmt(dt);
      const slots = Object.keys(SLOTS).filter((ch) => SLOTS[ch].includes(j)).map((ch) => {
        const e = slotEp[`${ch}:${idx}`]; if (!e) return '';
        const dots = PKEYS.map((p) => { const pd = postedOn(e.id, p); const st = pd ? 'posted' : isReady(e.id, p) ? 'ready' : 'none';
          return `<span class="pd ${st}">${PLATFORMS[p].name}: ${pd ? 'posted ' + esc(pd) : st === 'ready' ? 'ready' : 'not ready'}</span>`; }).join('');
        return `<li style="${esc(chStyle(CH[ch]))}" class="slot"><a href="/episode/${e.id}"><b>${esc(CH[ch].name)} · Ep ${e.number}</b> <span class="time">12:00 pm PT</span><span class="st">${esc(e.title)}</span></a><span class="pds">${dots}</span></li>`;
      }).join('');
      const extra = []; EPS.forEach((e) => PKEYS.forEach((p) => { if (postedOn(e.id, p) === ds) extra.push(`${CH[e.channel].name} Ep ${e.number} on ${PLATFORMS[p].name}`); }));
      return `<li class="day${ds === t ? ' today' : ''}"><h3>${label.format(dt)}${ds === t ? ' <span class="chip s-approved">today</span>' : ''}</h3>${slots ? `<ul class="slots">${slots}</ul>` : '<p class="small">No post planned.</p>'}${extra.length ? `<p class="small"><b>Posted this day:</b> ${extra.map(esc).join('; ')}</p>` : ''}</li>`;
    }).join('');
    return `<section><h2>Week of ${label.format(days[w * 7])}</h2><ul class="days">${rows}</ul></section>`;
  }).join('');
  return page('Calendar', '/calendar', `<h1>Posting plan</h1><p class="lead">A suggestion, not a rule. Times are Pacific (Los Angeles). Each channel goes out twice a week, in episode order.</p>${html}`);
}

function md(src) {
  const inl = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
  const out = []; let list = null; let para = [];
  const flushP = () => { if (para.length) { out.push(`<p>${inl(para.join(' '))}</p>`); para = []; } };
  const flushL = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const line of src.split(/\r?\n/)) {
    let m;
    if ((m = /^(#{1,3})\s+(.*)$/.exec(line))) { flushP(); flushL(); out.push(`<h${m[1].length}>${inl(m[2])}</h${m[1].length}>`); }
    else if ((m = /^\s*[-*]\s+(.*)$/.exec(line))) { flushP(); if (list !== 'ul') { flushL(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inl(m[1])}</li>`); }
    else if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) { flushP(); if (list !== 'ol') { flushL(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inl(m[1])}</li>`); }
    else if (!line.trim()) { flushP(); flushL(); }
    else { flushL(); para.push(line.trim()); }
  }
  flushP(); flushL();
  return out.join('\n');
}
function lessonsPage() {
  let src = '# Lessons\n\nNo lessons yet.';
  try { src = fs.readFileSync(path.join(__dirname, 'data', 'lessons.md'), 'utf8'); } catch { /* keep default */ }
  return page('Lessons', '/lessons', `<article class="prose">${md(src)}</article>`);
}

/* ---------- files ---------- */
const MIME = { mp4: 'video/mp4', png: 'image/png', jpg: 'image/jpeg', srt: 'application/x-subrip; charset=utf-8', woff2: 'font/woff2', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8' };

function sendFile(req, res, abs, { download, cache } = {}) {
  let st;
  try { st = fs.statSync(abs); if (!st.isFile()) throw 0; } catch { return text(res, 404, 'Not found'); }
  const ext = path.extname(abs).slice(1).toLowerCase();
  const h = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': cache || 'private, max-age=60' };
  if (download) h['Content-Disposition'] = `attachment; filename="${download}"`;
  let start = 0; let end = st.size - 1; let code = 200;
  const rg = req.headers.range;
  if (rg) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(rg.trim());
    if (!m || (m[1] === '' && m[2] === '')) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
    if (m[1] === '') { start = Math.max(0, st.size - Number(m[2])); }
    else { start = Number(m[1]); if (m[2] !== '') end = Math.min(Number(m[2]), end); }
    if (start > end || start >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
    code = 206; h['Content-Range'] = `bytes ${start}-${end}/${st.size}`;
  }
  h['Content-Length'] = end - start + 1;
  res.writeHead(code, h);
  if (req.method === 'HEAD' || st.size === 0) return res.end();
  fs.createReadStream(abs, { start, end }).on('error', () => res.destroy()).pipe(res);
}

function mediaPath(rel) {
  // only channels/<channel>/**/out/<file>.(mp4|png|jpg|srt)
  const segs = rel.split('/');
  if (segs.some((s) => s === '' || s === '.' || s === '..' || s.includes('\\') || s.includes('\0'))) return null;
  if (segs[0] !== 'channels' || segs.length < 4 || !segs.slice(2, -1).includes('out')) return null;
  if (!/\.(mp4|png|jpg|srt)$/i.test(segs[segs.length - 1])) return null;
  const abs = path.join(ROOT, ...segs);
  if (!abs.startsWith(path.join(ROOT, 'channels') + path.sep)) return null;
  return abs;
}
function downloadName(rel) {
  const e = EPS.find((x) => x.video === rel || x.cover === rel || x.srt === rel);
  if (!e) return path.basename(rel);
  const ext = path.extname(rel).slice(1).toLowerCase();
  const kind = rel === e.cover ? '-thumbnail' : '';
  return `${slug(CH[e.channel].name)}-ep0${e.number}${kind}.${ext}`;
}

/* ---------- http plumbing ---------- */
const SEC = {
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; media-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Resource-Policy': 'same-origin',
};
function text(res, code, body, type = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
  res.end(body);
}
const html = (res, body) => text(res, 200, body, 'text/html; charset=utf-8');
const redirect = (res, to) => { res.writeHead(303, { Location: to, 'Cache-Control': 'no-store' }); res.end(); };

const sha = (s) => crypto.createHash('sha256').update(s).digest();
function authorized(req) {
  if (!PASSWORD) return true;
  const h = req.headers.authorization || '';
  if (!/^Basic /i.test(h)) return false;
  const dec = Buffer.from(h.slice(6).trim(), 'base64').toString('utf8');
  const pw = dec.includes(':') ? dec.slice(dec.indexOf(':') + 1) : dec;
  return crypto.timingSafeEqual(sha(pw), sha(PASSWORD));
}

function readForm(req) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', (c) => { n += c.length; if (n > 8192) { reject(new Error('too big')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(new URLSearchParams(Buffer.concat(chunks).toString('utf8'))));
    req.on('error', reject);
  });
}

async function handle(req, res) {
  for (const [k, v] of Object.entries(SEC)) res.setHeader(k, v);
  const u = new URL(req.url, 'http://x');
  const p = u.pathname;
  if (p === '/healthz') return text(res, 200, 'ok');
  if (!authorized(req)) return text(res, 401, 'Password needed', 'text/plain; charset=utf-8', { 'WWW-Authenticate': 'Basic realm="Studio", charset="UTF-8"' });

  if (req.method === 'POST') {
    const origin = req.headers.origin;
    if (origin && origin !== 'null') { try { if (new URL(origin).host !== req.headers.host) return text(res, 403, 'Bad origin'); } catch { return text(res, 403, 'Bad origin'); } }
    let f;
    try { f = await readForm(req); } catch { return text(res, 400, 'Bad request'); }
    const ep = f.get('ep'); const pl = f.get('platform');
    if (!EP[ep] || !PLATFORMS[pl]) return text(res, 400, 'Bad request');
    if (p === '/review/approve') {
      const kind = f.get('kind'); if (kind !== 'video' && kind !== 'text') return text(res, 400, 'Bad request');
      state.approvals[ep] = state.approvals[ep] || {}; state.approvals[ep][pl] = state.approvals[ep][pl] || {};
      state.approvals[ep][pl][kind] = f.get('value') === '1';
      saveState();
      return redirect(res, '/review#' + ep);
    }
    if (p === '/upload/posted') {
      state.posted[ep] = state.posted[ep] || {};
      if (f.get('value') === '1' && isReady(ep, pl)) state.posted[ep][pl] = today(); else if (f.get('value') === '0') delete state.posted[ep][pl];
      saveState();
      return redirect(res, '/upload');
    }
    return text(res, 404, 'Not found');
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return text(res, 405, 'Method not allowed');

  let m;
  if (p === '/') return html(res, homePage());
  if (p === '/review') return html(res, reviewPage());
  if (p === '/upload') return html(res, uploadPage());
  if (p === '/calendar') return html(res, calendarPage());
  if (p === '/lessons') return html(res, lessonsPage());
  if ((m = /^\/channel\/([a-z0-9-]+)$/.exec(p)) && CH[m[1]]) return html(res, channelPage(CH[m[1]]));
  if ((m = /^\/episode\/([a-z0-9-]+)$/.exec(p)) && EP[m[1]]) return html(res, episodePage(EP[m[1]]));
  if (p.startsWith('/media/')) {
    let rel; try { rel = decodeURIComponent(p.slice(7)); } catch { return text(res, 400, 'Bad request'); }
    const abs = mediaPath(rel); if (!abs) return text(res, 404, 'Not found');
    return sendFile(req, res, abs, { download: u.searchParams.get('download') === '1' ? downloadName(rel) : null });
  }
  if (p.startsWith('/fonts/')) {
    let rel; try { rel = decodeURIComponent(p.slice(7)); } catch { return text(res, 400, 'Bad request'); }
    if (rel.includes('..') || !/\.woff2$/.test(rel)) return text(res, 404, 'Not found');
    return sendFile(req, res, path.join(ROOT, 'assets', 'fonts', rel), { cache: 'public, max-age=86400' });
  }
  if (p.startsWith('/static/')) {
    const rel = p.slice(8);
    if (!/^[a-z0-9._-]+\.(css|js)$/i.test(rel)) return text(res, 404, 'Not found');
    return sendFile(req, res, path.join(__dirname, 'public', rel), { cache: 'no-cache' });
  }
  return text(res, 404, 'Not found');
}

loadState();
const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => { console.error('error:', err && err.message); if (!res.headersSent) text(res, 500, 'Something went wrong'); else res.destroy(); });
});
if (require.main === module) {
  const host = PASSWORD ? '0.0.0.0' : '127.0.0.1';
  if (!PASSWORD) console.warn('WARNING: STUDIO_PASSWORD is not set. Listening on 127.0.0.1 only. Set STUDIO_PASSWORD to expose it.');
  server.listen(PORT, host, () => console.log(`Studio listening on ${host}:${PORT}`));
}
module.exports = { server, md, mediaPath };
