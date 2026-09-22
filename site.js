/* EgoCross-VLM project page: interactions and charts.
   All numbers are taken from the paper's tables (mean over seeds where applicable). */
(function () {
  'use strict';

  // Charts use the same palette as the surrounding page.
  const theme = getComputedStyle(document.documentElement);
  const color = name => theme.getPropertyValue(name).trim();
  const C = {
    ink: color('--ink'), ink2: color('--ink-2'), ink3: color('--ink-3'), line: color('--line'),
    ped: color('--ped'), pedSoft: color('--ped-soft'), veh: color('--veh'), vehSoft: color('--veh-soft'),
    context: color('--context'), video: color('--video'), zeroShot: color('--zero-shot'),
    gaze: color('--gaze'), cross: color('--cross'), yield: color('--yield')
  };
  const BASE = { acc: 0.727, f1: 0.724 };
  const MAJ = { acc: 0.567, f1: 0.362 };
  const fmt = v => v.toFixed(3);
  const pct = v => (v * 100).toFixed(1);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  /* ---------------- current section navigation ---------------- */
  (function sectionNavigation() {
    const links = $$('.topnav a[href^="#"]');
    const sections = $$('main > section[id]');
    const header = $('.topbar');
    let scheduled = false;
    function update() {
      scheduled = false;
      const threshold = header.getBoundingClientRect().bottom + 48;
      let current = null;
      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= threshold && rect.bottom > threshold) current = section.id;
      });
      links.forEach(link => {
        if (link.hash === '#' + current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    function schedule() {
      if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    window.addEventListener('load', schedule);
    document.fonts.ready.then(schedule);
    update();
  })();

  /* ---------------- data ---------------- */
  // Table 1: egocentric video only
  const LEADER = [
    { g: 'Baselines', m: 'Majority class', p: '', acc: .567, f1: .362, kind: 'base' },
    { g: 'Baselines', m: 'Random', p: '', acc: .500, f1: .497, kind: 'base' },
    { g: 'Baselines', m: 'CLIP+Transformer', p: 'trained for this task', acc: .727, f1: .724, kind: 'base' },
    { g: 'Zero-shot, standard prompt', m: 'Qwen3-VL-2B', p: '', acc: .591, f1: .578, t: 0.16, kind: 'zs' },
    { g: 'Zero-shot, standard prompt', m: 'Qwen3-VL-8B', p: '8-bit', acc: .580, f1: .559, t: 0.50, kind: 'zs' },
    { g: 'Zero-shot, standard prompt', m: 'Qwen2.5-VL-7B', p: '8-bit', acc: .629, f1: .575, t: 0.50, kind: 'zs' },
    { g: 'Zero-shot, standard prompt', m: 'InternVL3-2B', p: '', acc: .598, f1: .511, t: 0.38, kind: 'zs' },
    { g: 'Zero-shot, standard prompt', m: 'InternVL3-8B', p: '8-bit', acc: .582, f1: .462, t: 0.59, kind: 'zs' },
    { g: 'Zero-shot, standard prompt', m: 'VLP (GroundVQA)', p: 'egocentric pretraining', acc: .569, f1: .380, t: 0.01, kind: 'zs' },
    { g: 'Zero-shot, other prompting (Qwen2.5-VL-7B)', m: 'Chain-of-thought, simple', p: '"Let\'s think step by step"', acc: .569, f1: .544, t: 3.04, kind: 'zsp' },
    { g: 'Zero-shot, other prompting (Qwen2.5-VL-7B)', m: 'Chain-of-thought, multi-step', p: 'describe, evaluate, explain, answer', acc: .589, f1: .368, t: 5.08, kind: 'zsp' },
    { g: 'Zero-shot, other prompting (Qwen2.5-VL-7B)', m: 'Set-of-marks overlay', p: 'GroundingDINO + tracking', acc: .602, f1: .524, t: 0.37, kind: 'zsp' },
    { g: 'Fine-tuned with LoRA', m: 'Qwen3-VL-2B', p: 'cross-modal modules', acc: .775, f1: .770, t: 0.20, kind: 'ft' },
    { g: 'Fine-tuned with LoRA', m: 'VLP (GroundVQA)', p: 'language + cross-modal', acc: .788, f1: .786, t: 0.01, kind: 'ft' }
  ];

  // Table 2: context configurations. zsRaw / zsGaze = Qwen2.5-VL-7B zero-shot; ft = Qwen3-VL-2B fine-tuned (gaze overlay video)
  const CTX = {
    'none':      { label: 'No context',                 zsRaw: [.629, .575], zsGaze: [.636, .568], ft: [.767, .760] },
    'veh':       { label: 'Vehicle motion',             zsRaw: [.625, .560], zsGaze: [.631, .557], ft: [.771, .767] },
    'gdir':      { label: 'Gaze direction',             zsRaw: [.589, .580], zsGaze: [.626, .596], ft: [.771, .766] },
    'gscr':      { label: 'Gaze on screen',             zsRaw: [.594, .585], zsGaze: [.616, .593], ft: [.764, .757] },
    'ego':       { label: 'Ego motion',                 zsRaw: [.652, .641], zsGaze: [.662, .640], ft: [.804, .801] },
    'ego+veh':   { label: 'Ego motion + vehicle motion', zsRaw: [.647, .631], zsGaze: [.660, .635], ft: [.808, .805] },
    'ego+gdir':  { label: 'Ego motion + gaze direction', zsRaw: [.652, .626], zsGaze: [.654, .609], ft: [.835, .831] },
    'ego+gscr':  { label: 'Ego motion + gaze on screen', zsRaw: [.638, .635], zsGaze: [.663, .646], ft: [.819, .816] }
  };
  const FT_VIDEO_ONLY = [.775, .770]; // Table 1, raw video, no context

  const INSIGHT = {
    'gaze|none': 'Red fixation dots alone nudge the prompted model slightly upward. Fine-tuning on the same frames already beats the baseline by 4 points.',
    'gaze|veh': 'Vehicle motion is what vehicle-side sensing already provides. It adds nothing measurable in either regime.',
    'gaze|gdir': 'Prompted, gaze direction hurts: the model cannot read an unfamiliar stream of angles. Fine-tuned, it is neutral on its own.',
    'gaze|gscr': 'On-screen fixation coordinates are the hardest cue to read from text. Zero-shot accuracy drops 2 points below no context.',
    'gaze|ego': 'Ego motion is the one cue that works without training. Position and speed give the frames a frame of reference.',
    'gaze|ego+veh': 'Adding the shuttle\'s state on top of ego motion changes almost nothing, before or after adaptation.',
    'gaze|ego+gdir': 'The best model in the paper. Gaze direction grounded by ego motion reaches 0.835 on unseen participants, 14.9% above the baseline in relative terms.',
    'gaze|ego+gscr': 'Best zero-shot input and second-best fine-tuned input. The top-down angle is easier to learn than raw image coordinates.',
    'raw|none': 'Raw frames, standard question. The starting point for every comparison on this page.',
    'raw|veh': 'Vehicle motion alone slightly lowers prompted accuracy on raw video.',
    'raw|gdir': 'Without training and without the overlay, gaze direction costs 4 points. The signal is there, but not legible yet.',
    'raw|gscr': 'Fixation coordinates without the overlay: the largest zero-shot drop of any single cue.',
    'raw|ego': 'Ego motion lifts the prompted model by 2.3 points even on raw video.',
    'raw|ego+veh': 'Vehicle motion still adds nothing once ego motion is present.',
    'raw|ego+gdir': 'Tied for best raw-video zero-shot accuracy, though macro F1 is lower than ego motion alone.',
    'raw|ego+gscr': 'Slightly below ego motion alone when prompted on raw frames.'
  };

  // Table 3: counterfactual input ablation
  const CF = [
    { k: 'orig',  label: 'Original video',   ego: [.775, .770], ctx: [.835, .831], noctx: [.654, .552], desc: 'Eight uniformly sampled frames with interleaved timestamps, as evaluated.' },
    { k: 'shuf',  label: 'Shuffled frames',  ego: [.685, .672], ctx: [.816, .809], noctx: [.617, .482], desc: 'Same frames, random order. Content preserved, temporal order destroyed.' },
    { k: 'rev',   label: 'Reversed frames',  ego: [.544, .513], ctx: [.799, .791], noctx: [.590, .429], desc: 'Same frames, played backwards. Only the direction of motion changes.' },
    { k: 'mis',   label: 'Mismatched video', ego: [.515, .506], ctx: [.739, .729], noctx: [.553, .429], desc: 'Frames from a different test clip. Realistic input, wrong scene.' },
    { k: 'black', label: 'Black frames',     ego: [.534, .464], ctx: [.807, .804], noctx: [.567, .362], desc: 'Frames replaced by black images of identical size.' },
    { k: 'noise', label: 'Random noise',     ego: [.504, .496], ctx: [.814, .811], noctx: [.567, .362], desc: 'Frames replaced by random pixels of identical size.' },
    { k: 'novid', label: 'No video',         ego: [.483, .481], ctx: [.519, .519], noctx: [.483, .481], desc: 'Only the text prompt is given.' }
  ];

  // Appendix Table: MMBench per category, averaged over three subsample seeds. Seeds = training seeds.
  const MMB_CATS = ['Coarse perception', 'Fine-grained, instance-level', 'Attribute reasoning', 'Relation reasoning', 'Fine-grained, cross-instance', 'Logic reasoning'];
  const MMB = {
    base:   [.900, .870, .823, .793, .730, .653],
    ego:    [[.860, .827, .770, .760, .707, .583], [.880, .850, .793, .797, .723, .680], [.870, .860, .830, .777, .717, .617]],
    gaze:   [[.807, .797, .750, .703, .670, .663], [.583, .610, .657, .640, .523, .493], [.297, .307, .473, .367, .410, .413]]
  };

  /* ---------------- tooltip ---------------- */
  const tip = document.createElement('div');
  tip.className = 'tip';
  document.body.appendChild(tip);
  function bindTips(root) {
    $$('[data-tip]', root).forEach(el => {
      el.addEventListener('mouseenter', () => { tip.innerHTML = el.getAttribute('data-tip'); tip.classList.add('is-on'); });
      el.addEventListener('mousemove', e => {
        const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
        const y = Math.min(e.clientY + 14, window.innerHeight - tip.offsetHeight - 8);
        tip.style.left = x + 'px'; tip.style.top = y + 'px';
      });
      el.addEventListener('mouseleave', () => tip.classList.remove('is-on'));
    });
  }

  /* ---------------- viewpoint switcher ---------------- */
  (function viewpoint() {
    const fig = $('#viewpoint'), scene = $('.scene', fig);
    fig.dataset.view = 'ego';
    $$('.seg-btn', fig).forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.view;
      scene.dataset.view = v; fig.dataset.view = v;
      $$('.seg-btn', fig).forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-selected', x === b); });
    }));
  })();

  /* ---------------- mini frame renderer ---------------- */
  // mode: 'scene' | 'black' | 'noise' | 'empty'; i = frame index (0..7) controls shuttle position; opts.gaze draws a fixation dot; opts.alt recolors (mismatched clip)
  function frameSVG(i, mode, opts = {}) {
    if (mode === 'black') return '<svg viewBox="0 0 64 36"><rect width="64" height="36" fill="#111"/></svg>';
    if (mode === 'noise') {
      let r = '';
      for (let k = 0; k < 90; k++) {
        const g = Math.floor(Math.random() * 255);
        r += `<rect x="${Math.random() * 64}" y="${Math.random() * 36}" width="3" height="3" fill="rgb(${g},${g},${g})"/>`;
      }
      return `<svg viewBox="0 0 64 36"><rect width="64" height="36" fill="#777"/>${r}</svg>`;
    }
    const ground = opts.alt ? '#7d8a6a' : '#a7735c', sky = opts.alt ? '#dfe7ec' : '#e8ecef', bld = opts.alt ? '#b7c1c7' : '#d3d8db';
    const sx = 14 + i * 3.2, sy = 14 + i * 0.9, sw = 10 + i * 0.9, sh = 6 + i * 0.5;
    const gx = [30, 31, 33, 44, 46, 45, 34, 33][i], gy = [20, 20, 21, 28, 28, 27, 22, 22][i];
    return `<svg viewBox="0 0 64 36">
      <rect width="64" height="36" fill="${sky}"/>
      <polygon points="0,6 20,14 20,20 0,20" fill="${bld}"/><polygon points="64,6 44,14 44,20 64,20" fill="${bld}"/>
      <polygon points="20,20 44,20 64,36 0,36" fill="${ground}"/>
      <ellipse cx="46" cy="31" rx="7" ry="1.6" fill="none" stroke="#f4f2ee" stroke-width=".8"/>
      <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="1.5" fill="#2f3a44"/>
      <rect x="${sx + 1}" y="${sy + 1}" width="${sw - 2}" height="${sh * .4}" fill="#9fb4c4"/>
      ${opts.gaze ? `<circle cx="${gx}" cy="${gy}" r="1.9" fill="${C.gaze}" stroke="#fff" stroke-width=".5"/>` : ''}
    </svg>`;
  }
  function frameEl(i, mode, opts, label) {
    const d = document.createElement('div');
    d.className = 'frame';
    d.innerHTML = frameSVG(i, mode, opts) + (label != null ? `<span class="frame-t">${label}</span>` : '');
    return d;
  }

  /* ---------------- explorer ---------------- */
  (function explorer() {
    const root = $('#explorer');
    const framesEl = $('#frames'), promptEl = $('#prompt');
    const inputs = $$('input', root);
    inputs.forEach(el => el.addEventListener('change', update));

    const EGO = ['(12.4, 3.1) 0.62 m/s', '(12.6, 3.1) 0.48 m/s', '(12.7, 3.1) 0.31 m/s', '(12.8, 3.1) 0.12 m/s'];
    const VEH = ['(18.9, 7.4) 2.10 m/s', '(17.9, 7.1) 1.85 m/s', '(17.0, 6.8) 1.40 m/s', '(16.4, 6.6) 0.95 m/s'];
    const GDIR = ['84°', '81°', '62°', '58°'];
    const GSCR = ['(0.42, 0.55)', '(0.44, 0.56)', '(0.69, 0.74)', '(0.71, 0.73)'];
    const TS = ['t=0.0s', 't=0.5s', 't=1.0s', 't=1.5s'];
    const line = (arr) => arr.map((v, i) => `${TS[i]} ${v}`).join('; ');

    function update() {
      const video = $('input[name=video]:checked', root).value;
      const ego = $('input[name=ego]', root).checked;
      const extra = $('input[name=extra]:checked', root).value;
      const key = (ego ? 'ego' : '') + (ego && extra !== 'none' ? '+' : '') + (extra !== 'none' ? extra : '') || 'none';
      const cfg = CTX[key];

      // frames
      framesEl.innerHTML = '';
      for (let i = 0; i < 8; i++) framesEl.appendChild(frameEl(i, 'scene', { gaze: video === 'gaze' }, null));

      // prompt
      let p = '';
      for (let i = 0; i < 8; i++) p += `<span class="tok">&lt;t=${(i * 0.25).toFixed(2)}s&gt; [frame ${i + 1}${video === 'gaze' ? ', gaze overlaid' : ''}]</span>${i < 7 ? ' ' : ''}`;
      p += '\n\n<span class="q">What is your most likely action in the next 1 second based on what you saw in the egocentric video for the past 2 seconds? Choose one option: (A) cross (B) yield.</span>';
      const ctx = [];
      if (ego) ctx.push(`<span class="ctx ctx-ego">Your position (x, y) in metres and walking speed: ${line(EGO)}.</span>`);
      if (extra === 'veh') ctx.push(`<span class="ctx">The automated shuttle's position (x, y) in metres and speed: ${line(VEH)}.</span>`);
      if (extra === 'gdir') ctx.push(`<span class="ctx">Your gaze direction in the top-down view, in degrees: ${line(GDIR)}.</span>`);
      if (extra === 'gscr') ctx.push(`<span class="ctx">Your gaze fixation on the image plane, (x, y) normalised to [0, 1]: ${line(GSCR)}.</span>`);
      if (ctx.length) p += '\n\n' + ctx.join('\n');
      else p += '\n\n<span class="tok">(no additional context)</span>';
      promptEl.innerHTML = p;

      // results
      const zs = video === 'gaze' ? cfg.zsGaze : cfg.zsRaw;
      setRes('zs', zs, 'Qwen2.5-VL-7B, prompted only' + (video === 'gaze' ? ', gaze-overlaid frames' : ', raw frames'));
      const ftRes = $('#res-ft');
      ftRes.classList.toggle('is-context', key !== 'none');
      $('#res-zs').classList.toggle('is-context', key !== 'none');
      if (video === 'gaze') {
        ftRes.classList.remove('is-na');
        setRes('ft', cfg.ft, 'Qwen3-VL-2B, LoRA rank 2, mean of 3 seeds');
      } else if (key === 'none') {
        ftRes.classList.remove('is-na');
        setRes('ft', FT_VIDEO_ONLY, 'Qwen3-VL-2B, LoRA rank 2, raw frames, no context');
      } else {
        ftRes.classList.add('is-na');
        $('#bar-ft').style.width = '0';
        $('#acc-ft').textContent = 'Context-guided fine-tuning used gaze-overlaid frames. Switch the video input to see it.';
        $('#f1-ft').textContent = '–'; $('#delta-ft').textContent = '';
        $('.res-sub', ftRes).textContent = 'Qwen3-VL-2B';
      }
      $('#insight').textContent = INSIGHT[`${video}|${key}`] || '';
    }
    function setRes(id, v, sub) {
      $(`#bar-${id}`).style.width = (v[0] * 100) + '%';
      $(`#acc-${id}`).textContent = fmt(v[0]);
      $(`#f1-${id}`).textContent = fmt(v[1]);
      const d = (v[0] - BASE.acc) * 100;
      $(`#delta-${id}`).textContent = (d >= 0 ? '+' : '') + d.toFixed(1) + ' points vs. the task-specific baseline';
      $(`#res-${id} .res-sub`).textContent = sub;
    }
    update();
  })();

  /* ---------------- SVG chart helpers ---------------- */
  const svgOpen = (w, h) => `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
  function axisX(x0, x1, y, dom, ticks, w) {
    const sc = v => x0 + (v - dom[0]) / (dom[1] - dom[0]) * (x1 - x0);
    let s = `<line x1="${x0}" x2="${x1}" y1="${y}" y2="${y}" stroke="${C.line}"/>`;
    ticks.forEach(t => {
      s += `<line x1="${sc(t)}" x2="${sc(t)}" y1="${y}" y2="${y + 4}" stroke="${C.ink3}"/>
            <text x="${sc(t)}" y="${y + 16}" text-anchor="middle" font-size="11" fill="${C.ink3}" class="mono">${t.toFixed(1)}</text>`;
    });
    return s;
  }

  /* ---------------- leaderboard ---------------- */
  function drawLeader(metric) {
    const W = 680, L = 210, R = 20, rowH = 22, gapH = 26;
    const dom = [0.3, 0.85];
    const sc = v => L + (v - dom[0]) / (dom[1] - dom[0]) * (W - L - R);
    let y = 8, s = '', lastG = null;
    const rows = [];
    LEADER.forEach(r => {
      if (r.g !== lastG) { y += lastG ? gapH : 0; rows.push({ head: r.g, y }); y += 18; lastG = r.g; }
      rows.push({ r, y }); y += rowH;
    });
    const H = y + 30;
    s += svgOpen(W, H);
    // baseline
    const bx = sc(BASE[metric]);
    s += `<line x1="${bx}" x2="${bx}" y1="0" y2="${H - 26}" stroke="${C.ink}" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    s += `<text x="${bx + 5}" y="12" font-size="11" fill="${C.ink2}">task-specific baseline ${fmt(BASE[metric])}</text>`;
    const mx = sc(MAJ[metric]);
    s += `<line x1="${mx}" x2="${mx}" y1="0" y2="${H - 26}" stroke="${C.ink3}" stroke-width="1" stroke-dasharray="2 3"/>`;
    s += `<text x="${mx - 5}" y="12" font-size="11" fill="${C.ink3}" text-anchor="end">always "yield"</text>`;
    rows.forEach(o => {
      if (o.head) { s += `<text x="0" y="${o.y + 12}" font-size="12" font-weight="600" fill="${C.ink}">${esc(o.head)}</text>`; return; }
      const r = o.r, v = r[metric];
      const col = r.kind === 'ft' ? C.video : r.kind === 'base' ? C.ink3 : C.zeroShot;
      const op = r.kind.startsWith('zs') ? .6 : 1;
      const tipTxt = `<b>${esc(r.m)}</b>${r.p ? ' · ' + esc(r.p) : ''}<br>accuracy ${fmt(r.acc)} · macro F1 ${fmt(r.f1)}${r.t != null ? `<br>${r.t.toFixed(2)} s per sample` : ''}`;
      s += `<g data-tip="${tipTxt.replace(/"/g, '&quot;')}">
        <rect x="0" y="${o.y}" width="${W}" height="${rowH}" fill="transparent"/>
        <text x="${L - 10}" y="${o.y + 15}" text-anchor="end" font-size="12.5" fill="${C.ink}">${esc(r.m)}</text>
        <rect x="${L}" y="${o.y + 4}" width="${Math.max(0, sc(v) - L)}" height="${rowH - 8}" fill="${col}" opacity="${op}" rx="2"/>
        <text x="${sc(v) + 6}" y="${o.y + 15}" font-size="11" fill="${C.ink2}" class="mono">${fmt(v)}</text>
        ${r.t != null && r.kind === 'zsp' ? `<text x="${W}" y="${o.y + 15}" font-size="10.5" fill="${C.ink3}" text-anchor="end" class="mono">${r.t.toFixed(1)} s</text>` : ''}
      </g>`;
    });
    s += axisX(L, W - R, H - 26, dom, [0.3, 0.4, 0.5, 0.6, 0.7, 0.8], W);
    s += `<text x="${W - R}" y="${H - 2}" text-anchor="end" font-size="11" fill="${C.ink3}">${metric === 'acc' ? 'accuracy' : 'macro F1'} on held-out participants</text>`;
    s += '</svg>';
    const el = $('#chart-leader'); el.innerHTML = s; bindTips(el);
  }

  /* ---------------- dumbbell ---------------- */
  function drawDumbbell(metric) {
    const W = 680, L = 210, R = 24, rowH = 34, T = 48, mi = metric === 'acc' ? 0 : 1;
    const keys = Object.keys(CTX);
    const H = T + keys.length * rowH + 34;
    const dom = [0.54, 0.86];
    const sc = v => L + (v - dom[0]) / (dom[1] - dom[0]) * (W - L - R);
    let s = svgOpen(W, H);
    const bx = sc(BASE[metric]);
    s += `<line x1="${bx}" x2="${bx}" y1="26" y2="${H - 30}" stroke="${C.ink}" stroke-width="1.2" stroke-dasharray="3 3"/>
          <text x="${bx + 5}" y="36" font-size="11" fill="${C.ink2}">task-specific baseline ${fmt(BASE[metric])}</text>`;
    keys.forEach((k, i) => {
      const c = CTX[k], y = T + i * rowH + rowH / 2;
      const a = c.zsGaze[mi], b = c.ft[mi];
      const tunedColor = k === 'none' ? C.video : C.context;
      const best = k === 'ego+gdir';
      s += `<g data-tip="<b>${esc(c.label)}</b><br>zero-shot ${fmt(c.zsGaze[0])} acc · ${fmt(c.zsGaze[1])} F1<br>fine-tuned ${fmt(c.ft[0])} acc · ${fmt(c.ft[1])} F1">
        <rect x="0" y="${y - rowH / 2}" width="${W}" height="${rowH}" fill="transparent"/>
        <text x="${L - 10}" y="${y + 4}" text-anchor="end" font-size="12.5" fill="${C.ink}" font-weight="${best ? 600 : 400}">${esc(c.label)}</text>
        <line x1="${sc(a)}" x2="${sc(b)}" y1="${y}" y2="${y}" stroke="${C.line}" stroke-width="3"/>
        <circle cx="${sc(a)}" cy="${y}" r="5.5" fill="${tunedColor}" fill-opacity=".6"/>
        <circle cx="${sc(b)}" cy="${y}" r="6" fill="${tunedColor}"/>
        <text x="${sc(a) - 9}" y="${y + 4}" text-anchor="end" font-size="10.5" fill="${C.ink3}" class="mono">${fmt(a)}</text>
        <text x="${sc(b) + 10}" y="${y + 4}" font-size="10.5" fill="${best ? C.context : C.ink2}" font-weight="${best ? 600 : 400}" class="mono">${fmt(b)}</text>
      </g>`;
    });
    s += axisX(L, W - R, H - 30, dom, [0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85], W);
    s += `<text x="${W - R}" y="${H - 4}" text-anchor="end" font-size="11" fill="${C.ink3}">${metric === 'acc' ? 'accuracy' : 'macro F1'}, gaze-overlaid frames, context as preface</text>`;
    s += '</svg>';
    const el = $('#chart-dumbbell'); el.innerHTML = s; bindTips(el);
  }

  /* ---------------- counterfactual ---------------- */
  (function counterfactual() {
    const picker = $('#cf-picker'), strip = $('#cf-strip'), chart = $('#chart-cf');
    let cur = 'orig';
    CF.forEach(c => {
      const b = document.createElement('button');
      b.className = 'cf-btn' + (c.k === cur ? ' is-on' : ''); b.type = 'button'; b.textContent = c.label; b.dataset.k = c.k;
      b.addEventListener('click', () => { cur = c.k; $$('.cf-btn', picker).forEach(x => x.classList.toggle('is-on', x === b)); render(); });
      picker.appendChild(b);
    });
    function renderStrip(k) {
      strip.innerHTML = '';
      if (k === 'novid') { strip.innerHTML = '<div class="muted" style="grid-column:1/-1;font-size:var(--text-small);padding:.4rem 0">Text prompt only. No frames are given to the model.</div>'; return; }
      let order = [0, 1, 2, 3, 4, 5, 6, 7];
      if (k === 'rev') order = order.slice().reverse();
      if (k === 'shuf') order = [3, 0, 6, 1, 7, 4, 2, 5];
      order.forEach((idx, pos) => {
        const mode = k === 'black' ? 'black' : k === 'noise' ? 'noise' : 'scene';
        const label = (k === 'black' || k === 'noise') ? `f${pos + 1}` : `f${idx + 1}`;
        strip.appendChild(frameEl(idx, mode, { gaze: true, alt: k === 'mis' }, label));
      });
    }
    function render() {
      renderStrip(cur);
      const c = CF.find(x => x.k === cur), o = CF[0];
      const W = 680, H = 250, L = 40, R = 10, T = 30, B = 58;
      const dom = [0.4, 0.9];
      const sy = v => T + (1 - (v - dom[0]) / (dom[1] - dom[0])) * (H - T - B);
      const groups = [
        { k: 'ego', label: 'Fine-tuned on video only', sub: 'ego only', col: C.video },
        { k: 'ctx', label: 'Fine-tuned with ego motion + gaze direction', sub: 'context given at test time', col: C.context },
        { k: 'noctx', label: 'Same gaze-guided model', sub: 'context withheld at test time', col: C.context, withheld: true }
      ];
      const gw = (W - L - R) / groups.length, bw = 70;
      let s = svgOpen(W, H);
      // gridlines
      [0.4, 0.5, 0.6, 0.7, 0.8, 0.9].forEach(t => {
        s += `<line x1="${L}" x2="${W - R}" y1="${sy(t)}" y2="${sy(t)}" stroke="${C.line}"/>
              <text x="${L - 6}" y="${sy(t) + 4}" text-anchor="end" font-size="11" fill="${C.ink3}" class="mono">${t.toFixed(1)}</text>`;
      });
      s += `<line x1="${L}" x2="${W - R}" y1="${sy(MAJ.acc)}" y2="${sy(MAJ.acc)}" stroke="${C.ink3}" stroke-dasharray="2 3"/>
            <text x="${L + 4}" y="${sy(MAJ.acc) - 4}" font-size="10.5" fill="${C.ink3}">always "yield" 0.567</text>`;
      groups.forEach((g, i) => {
        const cx = L + gw * i + gw / 2, v = c[g.k][0], ov = o[g.k][0];
        const fill = g.col;
        s += `<g data-tip="<b>${esc(g.label)}</b><br>${esc(g.sub)}<br>${esc(c.label)}: accuracy ${fmt(c[g.k][0])} · macro F1 ${fmt(c[g.k][1])}<br>original: ${fmt(o[g.k][0])}">
          <rect x="${cx - bw / 2}" y="${sy(ov)}" width="${bw}" height="${sy(dom[0]) - sy(ov)}" fill="${g.col}" opacity=".15" rx="2"/>
          <rect class="cf-bar" x="${cx - bw / 2}" y="${sy(v)}" width="${bw}" height="${sy(dom[0]) - sy(v)}" fill="${fill}" fill-opacity="${g.withheld ? .55 : 1}" rx="2"/>
          <text x="${cx}" y="${sy(v) - 7}" text-anchor="middle" font-size="13" font-weight="600" fill="${C.ink}" class="mono">${fmt(v)}</text>
          ${cur !== 'orig' ? `<text x="${cx}" y="${sy(v) - 22}" text-anchor="middle" font-size="10.5" fill="${C.ink3}" class="mono">${((v - ov) * 100 >= 0 ? '+' : '') + ((v - ov) * 100).toFixed(1)} pts</text>` : ''}
          <text x="${cx}" y="${H - B + 20}" text-anchor="middle" font-size="12" fill="${C.ink}">${esc(g.label.length > 30 ? g.label.replace('Fine-tuned with ', '') : g.label)}</text>
          <text x="${cx}" y="${H - B + 35}" text-anchor="middle" font-size="11" fill="${C.ink3}">${esc(g.sub)}</text>
        </g>`;
      });
      // Draw over the bars so the reference remains visible for every condition.
      s += `<line x1="${L}" x2="${W - R}" y1="${sy(BASE.acc)}" y2="${sy(BASE.acc)}" stroke="${C.ink}" stroke-width="1.5" stroke-dasharray="6 4"/>
            <line x1="${L}" x2="${L + 24}" y1="12" y2="12" stroke="${C.ink}" stroke-width="1.5" stroke-dasharray="6 4"/>
            <text x="${L + 32}" y="16" font-size="11" fill="${C.ink2}">Task-specific baseline (CLIP+Transformer): ${fmt(BASE.acc)}</text>`;
      s += `<text x="${L}" y="${H - 4}" font-size="11" fill="${C.ink3}">${esc(c.desc)}</text>`;
      s += '</svg>';
      chart.innerHTML = s; bindTips(chart);
    }
    render();
  })();

  /* ---------------- gain grid (finding 3) ---------------- */
  (function gains() {
    const g = $('#gain-grid');
    const none = CTX['none'], ego = CTX['ego'];
    const cards = [
      { k: 'ego', title: 'Ego motion', rows: [
        ['Prompted', CTX['ego'].zsGaze[0] - none.zsGaze[0]], ['Fine-tuned', CTX['ego'].ft[0] - none.ft[0]]] },
      { k: 'veh', title: 'Vehicle motion', rows: [
        ['Prompted', CTX['veh'].zsGaze[0] - none.zsGaze[0]], ['Fine-tuned', CTX['veh'].ft[0] - none.ft[0]],
        ['Prompted, with ego', CTX['ego+veh'].zsGaze[0] - ego.zsGaze[0]], ['Fine-tuned, with ego', CTX['ego+veh'].ft[0] - ego.ft[0]]] },
      { k: 'gdir', title: 'Gaze direction', best: true, rows: [
        ['Prompted', CTX['gdir'].zsGaze[0] - none.zsGaze[0]], ['Fine-tuned', CTX['gdir'].ft[0] - none.ft[0]],
        ['Prompted, with ego', CTX['ego+gdir'].zsGaze[0] - ego.zsGaze[0]], ['Fine-tuned, with ego', CTX['ego+gdir'].ft[0] - ego.ft[0]]] },
      { k: 'gscr', title: 'Gaze on screen', rows: [
        ['Prompted', CTX['gscr'].zsGaze[0] - none.zsGaze[0]], ['Fine-tuned', CTX['gscr'].ft[0] - none.ft[0]],
        ['Prompted, with ego', CTX['ego+gscr'].zsGaze[0] - ego.zsGaze[0]], ['Fine-tuned, with ego', CTX['ego+gscr'].ft[0] - ego.ft[0]]] }
    ];
    const NEG = 3, POS = 7, ZERO = 30; // percent layout: -3 pts at 0%, 0 at 30%, +7 at 100%
    const px = d => d < 0 ? ZERO - Math.min(3, -d) / NEG * ZERO : ZERO;
    const pw = d => Math.min(Math.abs(d), d < 0 ? NEG : POS) / (d < 0 ? NEG : POS) * (d < 0 ? ZERO : 100 - ZERO);
    g.innerHTML = cards.map(c => `
      <div class="gain${c.best ? ' is-best' : ''}">
        <div class="gain-k">${c.title}</div>
        ${c.rows.map(([lab, d]) => { const pts = d * 100; return `
          <div class="gain-row"><span>${lab}</span>
            <div class="gain-bar"><span class="zero"></span><i class="${pts < 0 ? 'neg' : 'pos'}" style="left:${px(pts)}%;width:${pw(pts)}%"></i></div>
            <b>${pts >= 0 ? '+' : ''}${pts.toFixed(1)}</b></div>`; }).join('')}
      </div>`).join('') +
      `<p class="muted" style="grid-column:1/-1;margin:0;font-size:var(--text-small)">Change in accuracy points relative to the same regime without that cue ("with ego" compares against ego motion alone). Zero-shot rows use Qwen2.5-VL-7B, fine-tuned rows Qwen3-VL-2B, all on gaze-overlaid frames.</p>`;
  })();

  /* ---------------- MMBench dot strip ---------------- */
  (function mmbench() {
    const W = 680, L = 230, R = 20, rowH = 36, T = 30;
    const cats = ['Overall (mean of six)'].concat(MMB_CATS);
    const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
    const base = [mean(MMB.base)].concat(MMB.base);
    const ego = MMB.ego.map(s => [mean(s)].concat(s));
    const gaze = MMB.gaze.map(s => [mean(s)].concat(s));
    const H = T + cats.length * rowH + 40;
    const dom = [0.2, 1.0];
    const sc = v => L + (v - dom[0]) / (dom[1] - dom[0]) * (W - L - R);
    let s = svgOpen(W, H);
    cats.forEach((cat, i) => {
      const y = T + i * rowH + rowH / 2;
      s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="${C.line}"/>
            <text x="${L - 10}" y="${y + 4}" text-anchor="end" font-size="12.5" fill="${C.ink}" font-weight="${i === 0 ? 600 : 400}">${esc(cat)}</text>`;
      // spread band for gaze seeds
      const gv = gaze.map(sd => sd[i]);
      s += `<rect x="${sc(Math.min(...gv))}" y="${y - 7}" width="${sc(Math.max(...gv)) - sc(Math.min(...gv))}" height="14" fill="${C.context}" opacity=".12" rx="7"/>`;
      ego.forEach((sd, k) => s += `<circle cx="${sc(sd[i])}" cy="${y}" r="5.5" fill="${C.video}" stroke="#fff" stroke-width="1.2" data-tip="<b>Video-only adapter, seed ${k + 1}</b><br>${esc(cat)}: ${fmt(sd[i])}"/>`);
      gaze.forEach((sd, k) => s += `<circle cx="${sc(sd[i])}" cy="${y}" r="5.5" fill="${C.context}" stroke="#fff" stroke-width="1.2" data-tip="<b>Ego + gaze adapter, seed ${k + 1}</b><br>${esc(cat)}: ${fmt(sd[i])}"/>`);
      s += `<circle cx="${sc(base[i])}" cy="${y}" r="5.5" fill="${C.ink3}" stroke="#fff" stroke-width="1.2" data-tip="<b>Base model</b><br>${esc(cat)}: ${fmt(base[i])}"/>`;
    });
    s += axisX(L, W - R, H - 34, dom, [0.2, 0.4, 0.6, 0.8, 1.0], W);
    s += `<text x="${W - R}" y="${H - 6}" text-anchor="end" font-size="11" fill="${C.ink3}">MMBench accuracy, 100 questions per category, mean of 3 subsamples</text>`;
    s += '</svg>';
    const el = $('#chart-mmb'); el.innerHTML = s; bindTips(el);
  })();

  /* ---------------- metric toggles ---------------- */
  drawLeader('acc'); drawDumbbell('acc');
  $$('.seg-btn[data-chart]').forEach(b => b.addEventListener('click', () => {
    const chart = b.dataset.chart, metric = b.dataset.metric;
    $$(`.seg-btn[data-chart="${chart}"]`).forEach(x => x.classList.toggle('is-on', x === b));
    if (chart === 'leader') drawLeader(metric); else drawDumbbell(metric);
  }));

  /* ---------------- BibTeX copy ---------------- */
  $('#copy-bib').addEventListener('click', () => {
    const btn = $('#copy-bib');
    navigator.clipboard.writeText($('#bib-text').innerText).then(() => {
      btn.textContent = 'Copied'; setTimeout(() => btn.textContent = 'Copy BibTeX', 1800);
    }).catch(() => { btn.textContent = 'Select and copy manually'; });
  });
})();
