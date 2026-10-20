'use strict';
// All publications remain readable when JavaScript is unavailable.
const filters = document.querySelector('.filters');
const publications = [...document.querySelectorAll('#journal-list .publication')];
const status = document.querySelector('#filter-status');
if (filters) {
  filters.hidden = false;
  filters.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-filter]');
    if (!button) return;
    const year = button.dataset.filter;
    filters.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    publications.forEach(paper => { paper.hidden = year !== 'all' && paper.dataset.year !== year; });
    const count = publications.filter(paper => !paper.hidden).length;
    status.textContent = `${count} journal articles${year === 'all' ? ' across all years' : ` from ${year}`}.`;
  });
}
if ('IntersectionObserver' in window) {
  const links = [...document.querySelectorAll('nav a')];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
  document.querySelectorAll('main section').forEach(section => observer.observe(section));
}

// A slowly evolving mathematical surface, inspired by volatility smiles.
// This is decorative geometry, not an estimate fitted to market observations.
(() => {
  const canvas = document.querySelector('#time-series-background');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0, height = 0, phase = 0, frame = 0, previous = 0;
  function surface(u, v) {
    const ridge = Math.exp(-3 * (u + 0.25 * Math.sin(phase + v)) ** 2);
    return 0.32 * u * u + 0.42 * ridge * Math.exp(-0.5 * v * v)
      + 0.12 * Math.sin(3 * v + phase) * Math.cos(2 * u - phase * 0.35);
  }
  function mesh(cx, cy, scale, opacity, mirrored = false) {
    const point = (u, v) => [cx + (u - v) * scale * (mirrored ? -1 : 1),
      cy + (u + v) * scale * 0.29 - surface(u, v) * scale * 0.8];
    ctx.save();
    ctx.strokeStyle = `rgba(51,91,108,${opacity})`;
    ctx.lineWidth = 0.7;
    for (let direction = 0; direction < 2; direction++) {
      for (let line = 0; line <= 28; line++) {
        const fixed = -1.5 + line * 3 / 28;
        ctx.beginPath();
        for (let step = 0; step <= 64; step++) {
          const variable = -1.5 + step * 3 / 64;
          const [x,y] = direction ? point(variable,fixed) : point(fixed,variable);
          if (step === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.stroke();
      }
    }
    // A few nested ellipses suggest density contours beneath the surface.
    ctx.strokeStyle = `rgba(148,99,74,${opacity * 0.65})`;
    for (let ring = 1; ring <= 5; ring++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy + scale * 0.53, scale * ring * 0.17, scale * ring * 0.048, -0.12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  function timeSeries(mobile) {
    const plotWidth = mobile ? width * 0.72 : Math.min(width * 0.37, 470);
    const left = mobile ? -25 : -35;
    const baseline = height * 0.77;
    const scale = mobile ? 23 : 39;
    const split = 0.67;
    const observed = t => {
      const x = t * 100 + phase * 3;
      const volatility = 0.28 + 0.72 * Math.pow(Math.sin(x * 0.068), 4);
      return volatility * (0.6 * Math.sin(x * 0.72) + 0.3 * Math.cos(x * 1.63))
        + 0.14 * Math.sin(x * 0.18);
    };
    const lastValue = observed(split);
    const forecast = t => lastValue * Math.exp(-(t - split) * 5);
    const spread = t => 1.5 * Math.sqrt(Math.max(0, t - split));
    ctx.save();
    // A translucent forecast fan grows smoothly from the observed series.
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const t = split + (1 - split) * i / 40;
      const x = left + t * plotWidth;
      const y = baseline - (forecast(t) + spread(t)) * scale;
      if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    for (let i = 40; i >= 0; i--) {
      const t = split + (1 - split) * i / 40;
      ctx.lineTo(left + t * plotWidth,baseline - (forecast(t) - spread(t)) * scale);
    }
    ctx.closePath();ctx.fillStyle = 'rgba(51,91,108,0.055)';ctx.fill();
    ctx.beginPath();
    for (let i = 0; i <= 160; i++) {
      const t = split * i / 160;
      const x = left + t * plotWidth;
      const y = baseline - observed(t) * scale;
      if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.strokeStyle = 'rgba(51,91,108,0.24)';ctx.lineWidth = 1;ctx.stroke();
    ctx.beginPath();ctx.setLineDash([3,5]);
    for (let i = 0; i <= 40; i++) {
      const t = split + (1 - split) * i / 40;
      const x = left + t * plotWidth, y = baseline - forecast(t) * scale;
      if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.strokeStyle = 'rgba(148,99,74,0.25)';ctx.stroke();
    ctx.restore();
  }
  function draw() {
    ctx.clearRect(0,0,width,height);
    const mobile = width < 600;
    timeSeries(mobile);
    mesh(width * 0.98, height * 0.85, mobile ? 125 : Math.min(width * 0.27,370),0.20);
    mesh(width * 0.02, height * 0.24,mobile ? 85 : 175,0.13,true);
    ctx.font = 'italic 15px Georgia, serif';
    ctx.fillStyle = 'rgba(51,91,108,0.22)';
    ctx.fillText('σ(k, τ)',width - (mobile ? 80 : 135),height * 0.59);
    if (!mobile) {
      ctx.font = 'italic 13px Georgia, serif';
      ctx.fillText('σ²ₜ = ω + αε²ₜ₋₁ + βσ²ₜ₋₁',32,height * 0.46);
    }
  }
  function animate(now) {
    if (document.hidden || reducedMotion.matches) { frame = 0; return; }
    if (now - previous >= 50) {
      phase += Math.min(now - previous,100) * 0.00023;
      previous = now; draw();
    }
    frame = requestAnimationFrame(animate);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0;
    draw();
    if (!document.hidden && !reducedMotion.matches) {
      previous = performance.now(); frame = requestAnimationFrame(animate);
    }
  }
  function resize() {
    width = innerWidth; height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1,2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0); draw();
  }
  addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',sync);
  reducedMotion.addEventListener('change',sync);
  resize(); sync();
})();
