'use strict';
document.documentElement.classList.add('js');

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const root = document.documentElement;

/* ---------- Small seeded RNG + Gaussian, used by all figures ---------- */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function gauss(rand) { let u = 0; while (!u) u = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand()); }
// GARCH(1,1): sigma²_t = ω + α ε²_{t-1} + β sigma²_{t-1}
function garch(rand, state = { s2: 1, e: 0 }, w = 0.05, a = 0.11, b = 0.87) {
  state.s2 = w + a * state.e * state.e + b * state.s2;
  state.e = Math.sqrt(state.s2) * gauss(rand);
  return { r: state.e, s: Math.sqrt(state.s2) };
}

/* ---------- Theme toggle ---------- */
const themeBtn = document.querySelector('.theme-toggle');
const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
themeBtn?.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) {}
  window.dispatchEvent(new Event('themechange'));
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => window.dispatchEvent(new Event('themechange')));

/* ---------- Mobile menu ---------- */
const nav = document.querySelector('#site-nav');
const menuBtn = document.querySelector('.menu-toggle');
function setMenu(open) {
  nav.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
menuBtn?.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav?.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

/* ---------- Header state + reading progress ---------- */
const header = document.querySelector('.site-header');
const bar = document.querySelector('.progress span');
let ticking = false;
function onScroll() {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    header.classList.toggle('scrolled', y > 8);
    bar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    ticking = false;
  });
}
addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* ---------- Active nav link ---------- */
if ('IntersectionObserver' in window) {
  const links = [...document.querySelectorAll('nav a')];
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(l => l.hash === `#${entry.target.id}` ? l.setAttribute('aria-current', 'location') : l.removeAttribute('aria-current'));
    });
  }, { rootMargin: '-35% 0px -60% 0px' });
  document.querySelectorAll('main section[id]').forEach(s => io.observe(s));
}

/* ---------- Reveal on scroll ---------- */
const revealEls = [...document.querySelectorAll('.reveal')];
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const ro = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const siblings = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
      el.style.transitionDelay = `${Math.min(siblings.indexOf(el), 6) * 60}ms`;
      el.classList.add('in');
      ro.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  revealEls.forEach((el, i) => {
    // Content already on screen at load reveals straight away rather than waiting for the observer.
    if (el.getBoundingClientRect().top < innerHeight) { el.style.transitionDelay = `${Math.min(i, 6) * 70}ms`; requestAnimationFrame(() => el.classList.add('in')); setTimeout(() => el.classList.add('in'), 50); }
    else ro.observe(el);
  });
} else revealEls.forEach(el => el.classList.add('in'));

/* ---------- Publication filter ---------- */
const filters = document.querySelector('.filters');
const pubs = [...document.querySelectorAll('#journal-list .publication')];
const status = document.querySelector('#filter-status');
if (filters) {
  filters.hidden = false;
  filters.addEventListener('click', e => {
    const btn = e.target.closest('button[data-filter]'); if (!btn) return;
    const year = btn.dataset.filter;
    filters.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    pubs.forEach(p => {
      const show = year === 'all' || p.dataset.year === year;
      p.classList.toggle('filter-hide', !show);
      p.classList.remove('filter-show');
      if (show) { void p.offsetWidth; p.classList.add('filter-show', 'in'); }
    });
    const n = pubs.filter(p => !p.classList.contains('filter-hide')).length;
    status.textContent = `${n} journal articles${year === 'all' ? ' across all years' : ` from ${year}`}.`;
  });
}

/* ---------- Research card figures (static, seeded) ---------- */
(() => {
  const ns = 'http://www.w3.org/2000/svg';
  // I. Volatility clustering: |r_t| bars with a conditional-σ envelope
  const bars = document.querySelector('.fig-bars');
  if (bars) {
    const rand = rng(11), st = { s2: 1, e: 0 }, n = 46, pts = [];
    for (let i = 0; i < n; i++) pts.push(garch(rand, st));
    const maxR = Math.max(...pts.map(p => Math.abs(p.r)), ...pts.map(p => 2 * p.s));
    const env = [];
    pts.forEach((p, i) => {
      const x = 6 + i * (188 / n), h = Math.abs(p.r) / maxR * 64 + 1;
      const r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', x.toFixed(1)); r.setAttribute('y', (74 - h).toFixed(1));
      r.setAttribute('width', (188 / n * 0.62).toFixed(1)); r.setAttribute('height', h.toFixed(1)); r.setAttribute('rx', '1');
      bars.appendChild(r);
      env.push(`${i ? 'L' : 'M'}${(x + 1.5).toFixed(1)} ${(74 - 2 * p.s / maxR * 64).toFixed(1)}`);
    });
    document.querySelector('.fig-env').setAttribute('d', env.join(''));
  }
  // II. Observed series → forecast
  const series = document.querySelector('.fig-series');
  if (series) {
    const rand = rng(5); let y = 40, d = [];
    for (let i = 0; i <= 60; i++) { y += gauss(rand) * 3.2 + (40 - y) * 0.08; d.push(`${i ? 'L' : 'M'}${(8 + i * 112 / 60).toFixed(1)} ${y.toFixed(1)}`); }
    series.setAttribute('d', d.join(''));
    const endY = y.toFixed(1);
    document.querySelector('.fig-fan').setAttribute('d', `M120 ${endY} L198 ${(+endY - 28).toFixed(1)} L198 ${(+endY + 28).toFixed(1)} Z`);
    document.querySelector('.fig-forecast').setAttribute('d', `M120 ${endY} Q160 ${endY} 198 40`);
  }
  // III. Efficient frontier with feasible portfolios
  const dots = document.querySelector('.fig-dots');
  if (dots) {
    const rand = rng(3);
    for (let i = 0; i < 42; i++) {
      const sx = 46 + rand() * 140, frontier = 70 - 60 * Math.sqrt(Math.max(0, (sx - 40) / 146));
      const y = frontier + 4 + rand() * (70 - frontier - 4);
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', sx.toFixed(1)); c.setAttribute('cy', Math.min(y, 70).toFixed(1)); c.setAttribute('r', (1.2 + rand() * 1.4).toFixed(1));
      dots.appendChild(c);
    }
  }
})();

/* ---------- Portrait sparkline: a live, scrolling volatility trace ---------- */
(() => {
  const line = document.querySelector('.spark-line'), band = document.querySelector('.spark-band');
  if (!line) return;
  const rand = rng(29), st = { s2: 1, e: 0 }, n = 70, data = [];
  for (let i = 0; i < n; i++) data.push(garch(rand, st));
  function render() {
    const max = 3.2;
    const x = i => (i / (n - 1) * 300).toFixed(1);
    const y = v => (30 - v / max * 26).toFixed(1);
    line.setAttribute('d', data.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.r)}`).join(''));
    const up = data.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(2 * p.s)}`).join('');
    const down = data.map((p, i) => `L${x(n - 1 - i)} ${y(-2 * data[n - 1 - i].s)}`).join('');
    band.setAttribute('d', up + down + 'Z');
  }
  render();
  setInterval(() => { if (document.hidden || reducedMotion.matches) return; data.shift(); data.push(garch(rand, st)); render(); }, 160);
})();

/* ---------- Background: drifting volatility paths, forecast fan, floating notation ---------- */
(() => {
  const canvas = document.querySelector('#bg-canvas');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  let W = 0, H = 0, dpr = 1, ink = '29,79,110', acc = '168,96,58';
  let mouseX = 0.5, mouseY = 0.5, mx = 0.5, my = 0.5, frame = 0, last = 0;
  const STEP = 7;
  const rand = rng(Date.now() % 100000);

  function readColors() {
    const cs = getComputedStyle(root);
    ink = cs.getPropertyValue('--canvas-ink').trim() || ink;
    acc = cs.getPropertyValue('--canvas-accent').trim() || acc;
  }

  // Three stochastic layers, each a scrolling buffer.
  const layers = [
    { y: 0.82, amp: 0.026, speed: 0.020, alpha: 0.32, band: true,  kind: 'ret', st: { s2: 1, e: 0 }, buf: [], off: 0, depth: 0.04 },
    { y: 0.24, amp: 0.050, speed: 0.012, alpha: 0.20, band: false, kind: 'vol', st: { s2: 1, e: 0 }, buf: [], off: 0, depth: 0.02 },
    { y: 0.55, amp: 0.010, speed: 0.008, alpha: 0.13, band: false, kind: 'price', st: { s2: 1, e: 0 }, buf: [], off: 0, level: 0, depth: 0.01 },
  ];
  function nextPoint(L) {
    const g = garch(rand, L.st);
    if (L.kind === 'price') { L.level = L.level * 0.985 + g.r * 0.9; return { v: L.level, s: g.s }; }
    if (L.kind === 'vol') return { v: g.s * 1.4 - 1.2, s: g.s };
    return { v: g.r, s: g.s };
  }
  function fill(L) { const need = Math.ceil(W / STEP) + 3; while (L.buf.length < need) L.buf.push(nextPoint(L)); while (L.buf.length > need) L.buf.shift(); }

  const glyphText = ['σ²ₜ', 'ρ', 'Σ', 'E[rₜ]', 'β', 'Φ(x)', '∫', 'εₜ', 'λ', 'Δ', '∂', 'ARCH', 'GARCH(1,1)', 'Kalman', 'VaR', 'μ', 'θ', 'ℒ(θ)', 'Var(X)', 'IMF', 'xₜ = Fxₜ₋₁ + wₜ', 'hₜ', 'N(0,1)', 'ARIMA', 'LSTM'];
  let glyphs = [];
  function makeGlyphs() {
    const count = Math.round(Math.min(26, Math.max(10, W * H / 60000)));
    glyphs = Array.from({ length: count }, () => ({
      t: glyphText[Math.floor(rand() * glyphText.length)],
      x: rand() * W, y: rand() * H, z: 0.3 + rand() * 0.7,
      vy: -(0.04 + rand() * 0.08), vx: (rand() - 0.5) * 0.04, rot: (rand() - 0.5) * 0.25,
    }));
  }

  function grid() {
    const g = 64, ox = (mx - 0.5) * -8, oy = (my - 0.5) * -8 - (scrollY * 0.05) % g;
    ctx.fillStyle = `rgba(${ink},0.16)`;
    for (let x = (ox % g) - g; x < W + g; x += g)
      for (let y = (oy % g) - g; y < H + g; y += g) ctx.fillRect(x, y, 1.2, 1.2);
  }

  function drawLayer(L) {
    const n = L.buf.length, baseY = L.y * H + (my - 0.5) * -30 * L.depth * 10 - scrollY * L.depth;
    const amp = L.amp * H, startX = -L.off - STEP * 2 + (mx - 0.5) * -20 * L.depth * 10;
    const cut = L.kind === 'ret' ? Math.floor(n * 0.82) : n;
    const X = i => startX + i * STEP, Y = v => baseY - v * amp;
    if (L.band) {
      ctx.beginPath();
      for (let i = 0; i < cut; i++) { const p = L.buf[i]; i ? ctx.lineTo(X(i), Y(2 * p.s)) : ctx.moveTo(X(i), Y(2 * p.s)); }
      for (let i = cut - 1; i >= 0; i--) ctx.lineTo(X(i), Y(-2 * L.buf[i].s));
      ctx.closePath(); ctx.fillStyle = `rgba(${ink},0.05)`; ctx.fill();
    }
    ctx.beginPath();
    for (let i = 0; i < cut; i++) { const p = L.buf[i]; i ? ctx.lineTo(X(i), Y(p.v)) : ctx.moveTo(X(i), Y(p.v)); }
    ctx.strokeStyle = `rgba(${L.kind === 'vol' ? acc : ink},${L.alpha})`;
    ctx.lineWidth = L.kind === 'price' ? 1.6 : 1; ctx.lineJoin = 'round'; ctx.stroke();

    if (L.kind === 'ret' && cut < n) {
      // Forecast fan: σ²_{t+h} reverts to the unconditional variance, so the band widens then settles.
      const x0 = X(cut - 1), last = L.buf[cut - 1], s0 = last.s, sBar = 1;
      const horizon = (n - cut) + 2;
      const sig = h => Math.sqrt(sBar * sBar + Math.pow(0.98, h) * (s0 * s0 - sBar * sBar)) * Math.sqrt(Math.min(h, 6) / 6 + 0.15);
      [[2.6, 0.035], [1.6, 0.05], [0.8, 0.07]].forEach(([k, a]) => {
        ctx.beginPath(); ctx.moveTo(x0, Y(last.v));
        for (let h = 1; h <= horizon; h++) ctx.lineTo(x0 + h * STEP, Y(k * sig(h)));
        for (let h = horizon; h >= 1; h--) ctx.lineTo(x0 + h * STEP, Y(-k * sig(h)));
        ctx.closePath(); ctx.fillStyle = `rgba(${acc},${a})`; ctx.fill();
      });
      ctx.save(); ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(x0, Y(last.v));
      for (let h = 1; h <= horizon; h++) ctx.lineTo(x0 + h * STEP, Y(last.v * Math.pow(0.6, h)));
      ctx.strokeStyle = `rgba(${acc},0.45)`; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, baseY - amp * 4); ctx.lineTo(x0, baseY + amp * 4);
      ctx.strokeStyle = `rgba(${ink},0.18)`; ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.arc(x0, Y(last.v), 2.6, 0, Math.PI * 2); ctx.fillStyle = `rgba(${acc},0.7)`; ctx.fill();
      ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.fillStyle = `rgba(${ink},0.35)`;
      ctx.fillText('t', x0 - 3, baseY + amp * 4 + 13);
      ctx.fillText('forecast →', x0 + 8, baseY - amp * 4 + 4);
    }
  }

  function drawGlyphs(dt) {
    const pX = (mx - 0.5), pY = (my - 0.5);
    glyphs.forEach(g => {
      if (dt) { g.y += g.vy * dt * 0.06 * g.z; g.x += g.vx * dt * 0.06; }
      if (g.y < -40) { g.y = H + 40; g.x = rand() * W; }
      if (g.x < -120) g.x = W + 60; if (g.x > W + 120) g.x = -60;
      const px = g.x + pX * -40 * g.z, py = g.y + pY * -40 * g.z - (scrollY * 0.08 * g.z) % (H + 80);
      const yy = ((py % (H + 80)) + H + 80) % (H + 80) - 40;
      ctx.save(); ctx.translate(px, yy); ctx.rotate(g.rot);
      ctx.font = `italic ${Math.round(13 + g.z * 12)}px Newsreader, Georgia, serif`;
      ctx.fillStyle = `rgba(${g.z > 0.7 ? acc : ink},${0.06 + g.z * 0.12})`;
      ctx.fillText(g.t, 0, 0); ctx.restore();
    });
  }

  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    mx += (mouseX - mx) * 0.05; my += (mouseY - my) * 0.05;
    grid();
    layers.forEach(L => {
      if (dt) { L.off += L.speed * dt; while (L.off >= STEP) { L.off -= STEP; L.buf.shift(); L.buf.push(nextPoint(L)); } }
      drawLayer(L);
    });
    drawGlyphs(dt);
    // Quiet the backdrop under the reading column so text stays crisp; edges keep full detail.
    const left = Math.max(0, (W - 1120) / 2), right = Math.min(W, left + 1120);
    const k = x => Math.min(1, Math.max(0, x / W));
    const mask = ctx.createLinearGradient(0, 0, W, 0);
    const strength = W < 860 ? 0.55 : 0.72;
    mask.addColorStop(0, `rgba(0,0,0,${W < 1300 ? strength * 0.5 : 0})`);
    mask.addColorStop(k(left + 40), `rgba(0,0,0,${strength})`);
    mask.addColorStop(k(right - 40), `rgba(0,0,0,${strength})`);
    mask.addColorStop(1, `rgba(0,0,0,${W < 1300 ? strength * 0.5 : 0})`);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = mask; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  function loop(now) {
    const dt = Math.min(now - last, 60); last = now;
    draw(dt);
    frame = requestAnimationFrame(loop);
  }
  function start() {
    cancelAnimationFrame(frame); frame = 0;
    draw(0);
    if (!document.hidden && !reducedMotion.matches) { last = performance.now(); frame = requestAnimationFrame(loop); }
  }
  function resize() {
    W = innerWidth; H = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layers.forEach(fill);
    if (!glyphs.length || Math.abs(glyphs.length - W * H / 60000) > 6) makeGlyphs();
    draw(0);
  }

  addEventListener('pointermove', e => { mouseX = e.clientX / W; mouseY = e.clientY / H; }, { passive: true });
  addEventListener('resize', resize, { passive: true });
  addEventListener('scroll', () => { if (!frame) draw(0); }, { passive: true });
  addEventListener('themechange', () => { readColors(); draw(0); });
  document.addEventListener('visibilitychange', start);
  reducedMotion.addEventListener('change', start);
  readColors(); resize(); start();
})();
