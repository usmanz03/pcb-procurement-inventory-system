/* ==========================================================================
   PCB CHARTS — lightweight SVG charts themed by CSS tokens
   line/area, vertical bars (grouped or stacked), sparkline, ring gauge,
   horizontal bar list, count-up numbers. Every plotted chart has a hover tooltip.
   ========================================================================== */

const PcbCharts = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const cssVar = (name) => `var(${name})`;
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function niceScale(max, ticks = 4) {
    if (max <= 0) return { max: 1, step: 0.25 };
    const raw = max / ticks;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    return { max: Math.ceil(max / step) * step, step };
  }

  function frame(el, height) {
    el.classList.add('chart-box');
    el.innerHTML = '';
    const width = Math.max(320, el.clientWidth || 640);
    const tip = document.createElement('div');
    tip.className = 'chart-tip';
    return { width, height, tip };
  }

  function showTip(el, tip, html, x, y) {
    tip.innerHTML = html;
    tip.classList.add('show');
    const box = el.getBoundingClientRect();
    const tw = tip.offsetWidth || 180;
    let left = x + 14;
    if (left + tw > box.width) left = x - tw - 14;
    tip.style.left = Math.max(0, left) + 'px';
    tip.style.top = Math.max(0, y - 20) + 'px';
  }

  function hideTip(tip) { tip.classList.remove('show'); }

  function tipRows(title, rows, fmt) {
    return `<b>${esc(title)}</b>` + rows.map(r =>
      `<div class="row"><span><i style="--c:${cssVar(r.color)}"></i>${esc(r.name)}</span><span>${fmt(r.value)}</span></div>`
    ).join('');
  }

  function yAxis(svg, { L, R, T, ph, W, scale, fmt }) {
    let s = '';
    for (let v = 0; v <= scale.max + 1e-9; v += scale.step) {
      const y = T + ph - (v / scale.max) * ph;
      s += `<line class="grid-line ${v ? 'dash' : ''}" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/>`;
      s += `<text x="${L - 8}" y="${y + 4}" text-anchor="end">${fmt(v)}</text>`;
    }
    return s;
  }

  /* ---------- Line / area chart ---------- */
  function line(el, opts) {
    const { labels, series, fmt = v => v, tipFmt = fmt, height = 240, target } = opts;
    const { width: W, height: H, tip } = frame(el, height);
    const L = 48, R = 12, T = 12, B = 28, pw = W - L - R, ph = H - T - B;
    const max = Math.max(...series.flatMap(s => s.values.filter(v => v != null)), target ? target.value : 0);
    const scale = niceScale(max * 1.05);
    const x = i => L + (labels.length === 1 ? pw / 2 : (i / (labels.length - 1)) * pw);
    const y = v => T + ph - (v / scale.max) * ph;

    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || 'Line chart')}">`;
    s += `<defs>${series.map((sr, k) => `<linearGradient id="g-${el.id}-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cssVar(sr.color)}" stop-opacity=".28"/><stop offset="1" stop-color="${cssVar(sr.color)}" stop-opacity="0"/></linearGradient>`).join('')}</defs>`;
    s += yAxis(null, { L, R, T, ph, W, scale, fmt });
    labels.forEach((lb, i) => { s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(lb)}</text>`; });

    if (target) {
      const ty = y(target.value);
      s += `<line x1="${L}" x2="${W - R}" y1="${ty}" y2="${ty}" stroke="${cssVar('--chart-3')}" stroke-width="1.5" stroke-dasharray="6 4"/>`;
      s += `<text x="${W - R}" y="${ty - 6}" text-anchor="end" class="label-strong">${esc(target.label)}</text>`;
    }

    series.forEach((sr, k) => {
      const pts = sr.values.map((v, i) => v == null ? null : [x(i), y(v)]).filter(Boolean);
      if (!pts.length) return;
      const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
      if (sr.area) s += `<path class="chart-area" d="${d} L${pts[pts.length - 1][0]} ${T + ph} L${pts[0][0]} ${T + ph} Z" fill="url(#g-${el.id}-${k})"/>`;
      s += `<path class="chart-line" d="${d}" fill="none" stroke="${cssVar(sr.color)}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round" ${sr.dashed ? 'stroke-dasharray="6 5" style="animation:none;stroke-dashoffset:0"' : ''}/>`;
      const last = pts[pts.length - 1];
      s += `<circle cx="${last[0]}" cy="${last[1]}" r="4" fill="${cssVar(sr.color)}" stroke="hsl(var(--card))" stroke-width="2"/>`;
    });

    s += `<line class="crosshair" x1="0" x2="0" y1="${T}" y2="${T + ph}" style="display:none"/>`;
    s += `<g class="dots"></g>`;
    const slot = labels.length > 1 ? pw / (labels.length - 1) : pw;
    labels.forEach((_, i) => { s += `<rect class="hit" data-i="${i}" x="${x(i) - slot / 2}" y="${T}" width="${slot}" height="${ph}"/>`; });
    s += `</svg>`;
    el.innerHTML = s;
    el.appendChild(tip);

    el.querySelectorAll('path.chart-line').forEach(p => { try { p.style.setProperty('--len', Math.ceil(p.getTotalLength())); } catch (e) {} });

    const svgEl = el.querySelector('svg');
    const cross = el.querySelector('.crosshair');
    const dots = el.querySelector('.dots');
    el.querySelectorAll('.hit').forEach(h => {
      h.addEventListener('mousemove', (e) => {
        const i = +h.dataset.i;
        const scaleX = el.clientWidth / W;
        cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.style.display = '';
        dots.innerHTML = series.filter(sr => sr.values[i] != null).map(sr => `<circle cx="${x(i)}" cy="${y(sr.values[i])}" r="4.5" fill="${cssVar(sr.color)}" stroke="hsl(var(--card))" stroke-width="2"/>`).join('');
        const rows = series.filter(sr => sr.values[i] != null).map(sr => ({ name: sr.name, color: sr.color, value: sr.values[i] }));
        const r = el.getBoundingClientRect();
        showTip(el, tip, tipRows(opts.tipTitle ? opts.tipTitle(i) : labels[i], rows, tipFmt), x(i) * scaleX, e.clientY - r.top);
      });
      h.addEventListener('mouseleave', () => { cross.style.display = 'none'; dots.innerHTML = ''; hideTip(tip); });
    });
    return svgEl;
  }

  /* ---------- Vertical bars (grouped or stacked) ---------- */
  function bars(el, opts) {
    const { labels, series, stacked = false, fmt = v => v, tipFmt = fmt, height = 240, target, totals = stacked } = opts;
    const { width: W, height: H, tip } = frame(el, height);
    const L = 48, R = 12, T = 18, B = 28, pw = W - L - R, ph = H - T - B;
    const sums = labels.map((_, i) => series.reduce((a, sr) => a + (sr.values[i] || 0), 0));
    const max = Math.max(stacked ? Math.max(...sums) : Math.max(...series.flatMap(s => s.values)), target ? target.value : 0);
    const scale = niceScale(max * 1.08);
    const y = v => T + ph - (v / scale.max) * ph;
    const slot = pw / labels.length;
    const groupW = Math.min(slot * 0.62, stacked ? 44 : 22 * series.length + 8);
    const barW = stacked ? groupW : (groupW - (series.length - 1) * 3) / series.length;

    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || 'Bar chart')}">`;
    s += yAxis(null, { L, R, T, ph, W, scale, fmt });
    labels.forEach((lb, i) => {
      const cx = L + slot * i + slot / 2;
      s += `<g class="col" data-i="${i}">`;
      s += `<rect class="hit" x="${cx - slot / 2}" y="${T}" width="${slot}" height="${ph}"/>`;
      let acc = 0;
      series.forEach((sr, k) => {
        const v = sr.values[i] || 0;
        if (stacked) {
          const y1 = y(acc + v), y0 = y(acc);
          const h = Math.max(0, y0 - y1 - (k ? 2 : 0));
          const top = k === series.length - 1;
          s += `<rect class="chart-bar" style="animation-delay:${i * 40}ms" x="${cx - barW / 2}" y="${y1}" width="${barW}" height="${h}" rx="${top ? 4 : 1.5}" fill="${cssVar(sr.color)}" pointer-events="none"/>`;
          acc += v;
        } else {
          const bx = cx - groupW / 2 + k * (barW + 3);
          s += `<rect class="chart-bar" style="animation-delay:${i * 40 + k * 30}ms" x="${bx}" y="${y(v)}" width="${barW}" height="${Math.max(0, y(0) - y(v))}" rx="3" fill="${cssVar(sr.color)}" pointer-events="none"/>`;
        }
      });
      if (totals) s += `<text x="${cx}" y="${y(sums[i]) - 6}" text-anchor="middle" class="label-strong">${fmt(sums[i])}</text>`;
      s += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${esc(lb)}</text>`;
      s += `</g>`;
    });
    if (target) {
      const ty = y(target.value);
      s += `<line x1="${L}" x2="${W - R}" y1="${ty}" y2="${ty}" stroke="${cssVar('--chart-3')}" stroke-width="1.5" stroke-dasharray="6 4" pointer-events="none"/>`;
      s += `<text x="${W - R}" y="${ty - 6}" text-anchor="end" class="label-strong">${esc(target.label)}</text>`;
    }
    s += `</svg>`;
    el.innerHTML = s;
    el.appendChild(tip);

    const cols = el.querySelectorAll('.col');
    cols.forEach(g => {
      g.addEventListener('mousemove', (e) => {
        const i = +g.dataset.i;
        cols.forEach(o => o.classList.toggle('dim', o !== g));
        const rows = series.map(sr => ({ name: sr.name, color: sr.color, value: sr.values[i] || 0 })).reverse();
        if (stacked) rows.unshift({ name: 'Total', color: '--muted-foreground', value: sums[i] });
        const r = el.getBoundingClientRect();
        showTip(el, tip, tipRows(opts.tipTitle ? opts.tipTitle(i) : labels[i], rows, tipFmt), e.clientX - r.left, e.clientY - r.top);
      });
      g.addEventListener('mouseleave', () => { cols.forEach(o => o.classList.remove('dim')); hideTip(tip); });
      if (opts.onClick) { g.style.cursor = 'pointer'; g.addEventListener('click', () => opts.onClick(+g.dataset.i)); }
    });
  }

  /* ---------- Sparkline ---------- */
  function spark(svg, values, color = '--chart-1') {
    const W = 96, H = 32, P = 3;
    const mn = Math.min(...values), mx = Math.max(...values);
    const pts = values.map((v, i) => [P + i * ((W - 2 * P) / (values.length - 1)), H - P - ((v - mn) / ((mx - mn) || 1)) * (H - 2 * P)]);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const last = pts[pts.length - 1];
    const id = 'sp' + Math.random().toString(36).slice(2, 8);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cssVar(color)}" stop-opacity=".3"/><stop offset="1" stop-color="${cssVar(color)}" stop-opacity="0"/></linearGradient></defs>
      <path class="chart-area" d="${d} L${last[0]} ${H} L${pts[0][0]} ${H} Z" fill="url(#${id})"/>
      <path class="chart-line" d="${d}" fill="none" stroke="${cssVar(color)}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="3" fill="${cssVar(color)}" stroke="hsl(var(--card))" stroke-width="1.5"/>`;
    const p = svg.querySelector('.chart-line');
    try { p.style.setProperty('--len', Math.ceil(p.getTotalLength())); } catch (e) {}
  }

  /* ---------- Ring gauge ---------- */
  function ring(el, { value, label, sub, color = '--primary-ring' }) {
    const r = 52, c = 2 * Math.PI * r;
    const stroke = color === '--primary-ring' ? 'hsl(var(--primary))' : cssVar(color);
    el.classList.add('ring');
    el.innerHTML = `<svg viewBox="0 0 120 120"><circle class="ring-track" cx="60" cy="60" r="${r}" fill="none" stroke-width="10"/>
      <circle class="ring-val" cx="60" cy="60" r="${r}" fill="none" stroke="${stroke}" stroke-width="10" stroke-dasharray="${c}" stroke-dashoffset="${c}"/></svg>
      <div class="ring-label"><b>${esc(label)}</b><span>${esc(sub || '')}</span></div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const v = el.querySelector('.ring-val');
      if (v) v.style.strokeDashoffset = c * (1 - Math.max(0, Math.min(1, value)));
    }));
  }

  /* ---------- Horizontal bar list ---------- */
  function hbars(el, rows, { fmt = v => v, color = '--chart-1', onClick, tip: tipFmt } = {}) {
    const max = Math.max(...rows.map(r => r.value)) || 1;
    el.classList.add('hbars');
    el.innerHTML = rows.map((r, i) => `
      <div class="hbar" ${onClick ? `style="cursor:pointer" data-i="${i}"` : ''} title="${esc(r.name)}: ${esc(tipFmt ? tipFmt(r) : fmt(r.value))}">
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(r.name)}</span>
        <span class="track"><i style="width:${(r.value / max) * 100}%; --c:${cssVar(r.color || color)}; animation-delay:${i * 60}ms"></i></span>
        <span class="val">${fmt(r.value)}</span>
      </div>`).join('');
    if (onClick) el.querySelectorAll('.hbar').forEach(h => h.addEventListener('click', () => onClick(+h.dataset.i)));
  }

  /* ---------- Count-up ---------- */
  function countUp(el, to, { decimals = 0, prefix = '', suffix = '', duration = 900 } = {}) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fmt = v => prefix + v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    if (reduce) { el.textContent = fmt(to); return; }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(to * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  return { line, bars, spark, ring, hbars, countUp, niceScale };
})();

window.PcbCharts = PcbCharts;
