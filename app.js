/* Hanma Training: Today / Plan / Progress / Settings. All logs stay on the device. */
const P = self.BakiPlan;
const KEY = 'hanma-state-v1';
const BENCHMARKS = [
  ['Max Push-Ups', 'reps', 'Higher'], ['Max Pull-Ups', 'reps', 'Higher'], ['Max Dead Hang', 'sec', 'Higher'],
  ['Max Plank', 'sec', 'Higher'], ['1-Mile Run', 'min', 'Lower'], ['Back Squat 1RM', 'lb', 'Higher'],
  ['Deadlift 1RM', 'lb', 'Higher'], ['Resting Heart Rate', 'bpm', 'Lower'],
];
const PHASE_NOTES = {
  1: 'Learn the movements, build work capacity. RPE 7-8.', 2: 'Learn the movements, build work capacity. RPE 7-8.',
  3: '+1 set on main lifts, ~30-45% more volume. RPE 8-9.', 4: '+1 set on main lifts, ~30-45% more volume. RPE 8-9.',
  5: '+2 sets, ~60% more volume than Week 1. RPE 9-10. Brutal.', 6: 'Volume drops ~30%. Friday is Hanma Test Day.',
};

const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const today = () => P.isoDate(new Date());
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

let state = load();
const ui = { tab: 'today', day: null, open: {}, week: null, planOpen: null, sheet: null };

// ---------- State ----------
function defaults() {
  return {
    settings: {
      startDate: P.nextMonday(today()), bodyweight: 180, goal: 'Lean Bulk', morningHour: 7, eveningHour: 20,
      supplements: JSON.parse(JSON.stringify(P.DEFAULT_SUPPLEMENTS)),
    },
    logs: {}, bench: {}, weights: {}, push: null, shop: { checked: {}, store: {}, mode: 'store' },
  };
}
// Fill in fields added in later versions so older saved data and backups keep working.
function normalize(s) {
  const d = defaults();
  return { ...d, ...s, settings: { ...d.settings, ...s.settings }, shop: { ...d.shop, ...(s.shop || {}) } };
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.settings) return normalize(s);
  } catch { /* corrupted or blocked storage: start fresh */ }
  return defaults();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { toast('Could not save. Is storage full?'); }
  Store.set('state', state).catch(() => {});
}
const emptyLog = () => ({ ex: {}, meals: {}, foods: [], supps: {} });
const logFor = (n) => { const l = (state.logs[n] ||= emptyLog()); l.supps ||= {}; return l; };
const peekLog = (n) => ({ ...emptyLog(), ...state.logs[n] });
const programDay = () => P.dayNumber(state.settings.startDate, today());
const clampDay = (n) => Math.min(P.TOTAL_DAYS, Math.max(1, n));
const currentDay = () => ui.day ?? clampDay(programDay());
const dateOf = (n) => P.addDays(state.settings.startDate, n - 1);
const exDoneCount = (n, d) => d.exercises.filter((_, i) => peekLog(n).ex[i]?.done).length;

// ---------- Formatting ----------
const fmtDate = (iso, opts = { weekday: 'short', month: 'short', day: 'numeric' }) => new Date(`${iso}T12:00:00`).toLocaleDateString([], opts);
const fmtTime = (hm) => { const [h, m] = hm.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
const fmtHour = (h) => new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const plural = (k, word) => `${k} ${word}${k === 1 ? '' : 's'}`;
const bar = (frac, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, frac * 100))}%"></i></div>`;

function eaten(n, d) {
  const log = peekLog(n), t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  d.meals.forEach((m, i) => { if (log.meals[i]) for (const k in t) t[k] += m[k]; });
  log.foods.forEach((f) => { for (const k in t) t[k] += Number(f[k]) || 0; });
  return t;
}

// ---------- Today ----------
function renderToday() {
  const n = currentDay(), d = P.getDay(n, state.settings), log = peekLog(n), pd = programDay();
  const exDone = exDoneCount(n, d);
  const mealsDone = d.meals.filter((_, i) => log.meals[i]).length;
  const e = eaten(n, d);
  const isToday = n === pd;
  let banner = '';
  if (pd < 1 && n === 1) banner = `<div class="banner">Program starts ${fmtDate(state.settings.startDate)} (in ${plural(1 - pd, 'day')}). This is a preview of Day 1. Change the start date in Settings.</div>`;
  else if (pd > P.TOTAL_DAYS && ui.day === null) banner = '<div class="banner">Program complete! Log your Hanma Test results in Progress, or set a new start date in Settings to run it again.</div>';
  if (d.isTest) banner += '<div class="banner test">Hanma Test Day. Record your results in the Progress tab.</div>';

  const macro = (label, val, target, unit) => {
    const cls = val > target * 1.1 ? 'over' : val >= target * 0.9 ? 'green' : '';
    return `<div class="macro"><div class="lbl">${label}</div>
      <div class="val">${P.fmtNum(val)}<small> / ${P.fmtNum(target)}${unit}</small></div>${bar(val / target, cls)}</div>`;
  };

  return `
  <section class="hero">
    <div class="kicker">Week ${d.week} · ${esc(d.phase)}</div>
    <h1>Day ${n} <span class="of">/ ${P.TOTAL_DAYS}</span></h1>
    <div class="focus">${esc(d.focusShort)}${d.nickname ? ` <span class="nick">“${esc(d.nickname)}”</span>` : ''}</div>
    <div class="sub">${fmtDate(dateOf(n))}${isToday ? ' · Today' : ''} · ${d.dayType} day · RPE ${d.rpe}</div>
    <div class="daynav">
      <button data-action="day" data-to="${n - 1}" ${n <= 1 ? 'disabled' : ''}>‹ Prev</button>
      <button data-action="day" data-to="${n + 1}" ${n >= P.TOTAL_DAYS ? 'disabled' : ''}>Next ›</button>
      <span class="spacer"></span>
      ${!isToday && pd >= 1 && pd <= P.TOTAL_DAYS ? '<button data-action="day" data-to="today">Back to today</button>' : ''}
    </div>
  </section>
  ${banner}
  <section class="card">
    <div class="card-head"><h2>Workout</h2><span class="count">${exDone}/${d.exercises.length} done</span></div>
    ${bar(exDone / d.exercises.length, exDone === d.exercises.length ? 'green' : '')}
    <ul class="list" style="margin-top:6px">${d.exercises.map((x, i) => exRow(n, x, i, log)).join('')}</ul>
  </section>
  <section class="card">
    <div class="card-head"><h2>Nutrition</h2><span class="count">${mealsDone}/${d.meals.length} meals</span></div>
    <div class="macros">
      ${macro('Calories', e.kcal, d.targets.kcal, '')}
      ${macro('Protein', e.protein, d.targets.protein, 'g')}
      ${macro('Carbs', e.carbs, d.targets.carbs, 'g')}
      ${macro('Fat', e.fat, d.targets.fat, 'g')}
    </div>
    <ul class="list">${d.meals.map((m, i) => mealRow(m, i, log)).join('')}</ul>
    ${log.foods.length ? `<div style="margin-top:4px">${log.foods.map(extraRow).join('')}</div>` : ''}
    <button class="btn secondary" style="margin-top:10px" data-action="add-food">+ Log other food</button>
  </section>
  ${suppCard(n, d, log)}
  <section class="card">
    <div class="card-head"><h2>Bodyweight</h2><span class="count">${fmtDate(dateOf(n))}</span></div>
    <div class="grid2">
      <input type="number" inputmode="decimal" step="0.1" placeholder="lb" aria-label="Bodyweight in pounds"
        data-bind="weight" data-date="${dateOf(n)}" value="${state.weights[dateOf(n)] ?? ''}">
      <div class="help" style="align-self:center">Weigh in after waking for a consistent trend.</div>
    </div>
  </section>`;
}

function exRow(n, x, i, log) {
  const l = log.ex[i] || {}, open = ui.open[`${n}-${i}`];
  const dose = x.sets > 1 ? `${x.sets} × ${esc(x.reps)}` : esc(x.reps);
  return `<li class="row ${l.done ? 'done' : ''}">
    <button class="check" data-action="toggle-ex" data-i="${i}" aria-label="Mark ${esc(x.name)} done"></button>
    <div class="row-main">
      <button class="row-main" style="width:100%" data-action="expand" data-key="${n}-${i}">
        <div class="row-title">${esc(x.name)}</div>
        <div class="row-meta"><b>${dose}</b>${x.rest !== '-' ? ` · rest ${esc(x.rest)}` : ''}</div>
        ${l.note && !open ? `<div class="logged">✎ ${esc(l.note)}</div>` : ''}
      </button>
      ${open ? `<div class="row-extra">
        <div class="row-note">${esc(x.note)}</div>
        <input style="margin-top:8px" placeholder="Log weight / reps / time, e.g. +25 lb × 8,8,7,6,6"
          data-bind="ex-note" data-i="${i}" value="${esc(l.note || '')}">
      </div>` : ''}
    </div>
  </li>`;
}

function mealRow(m, i, log) {
  return `<li class="row ${log.meals[i] ? 'done' : ''}">
    <button class="check" data-action="toggle-meal" data-i="${i}" aria-label="Mark ${esc(m.name)} eaten"></button>
    <div class="row-main">
      <div class="row-title">${esc(m.name)} <span class="row-meta" style="font-weight:400">· ${fmtTime(m.time)}</span></div>
      <div class="row-meta">${P.fmtNum(m.kcal)} kcal · ${Math.round(m.protein)} g protein</div>
      <ul class="items">${m.items.map((it) => `<li><span>${esc(it.food)}</span><span>${it.servings} × ${esc(it.serving)}</span></li>`).join('')}</ul>
    </div>
  </li>`;
}

function suppCard(n, d, log) {
  const list = P.supplementsFor(state.settings, d);
  if (!list.length) return '';
  const done = list.filter((x) => log.supps[x.id]).length;
  return `<section class="card">
    <div class="card-head"><h2>Supplements</h2><span class="count">${done}/${list.length}</span></div>
    <ul class="list">${list.map((x) => `<li class="row ${log.supps[x.id] ? 'done' : ''}">
      <button class="check" data-action="toggle-supp" data-id="${esc(x.id)}" aria-label="Mark ${esc(x.name)} taken"></button>
      <div class="row-main"><div class="row-title">${esc(x.name)}</div><div class="row-meta">${esc(x.when)}</div></div>
    </li>`).join('')}</ul>
  </section>`;
}

const extraRow = (f, i) => `<div class="extra-food">
  <span style="flex:1">${esc(f.name)}${f.servings ? ` <span class="help">· ${f.servings} × ${esc(f.serving)}</span>` : ''}</span>
  <span class="help">${P.fmtNum(f.kcal)} kcal · ${Math.round(f.protein)} g P</span>
  <button class="x" data-action="del-food" data-i="${i}" aria-label="Remove ${esc(f.name)}">×</button>
</div>`;

// ---------- Plan ----------
function renderPlan() {
  const pd = programDay();
  const week = ui.week ?? Math.ceil(clampDay(pd) / 7);
  const chips = [1, 2, 3, 4, 5, 6].map((w) => {
    const hasToday = pd >= (w - 1) * 7 + 1 && pd <= w * 7;
    return `<button class="chip ${w === week ? 'active' : ''} ${hasToday ? 'today' : ''}" data-action="week" data-w="${w}">Week ${w}</button>`;
  }).join('');
  let days = '';
  for (let n = (week - 1) * 7 + 1; n <= week * 7; n++) {
    const d = P.getDay(n, state.settings), done = exDoneCount(n, d), total = d.exercises.length;
    const badge = n === pd ? '<span class="badge now">Today</span>'
      : done === total ? '<span class="badge full">✓ Done</span>'
        : done ? `<span class="badge">${done}/${total}</span>` : '';
    const open = ui.planOpen === n;
    days += `<section class="card">
      <button class="daycard" data-action="plan-open" data-n="${n}">
        <div class="top">
          <div>
            <div class="row-meta">Day ${n} · ${fmtDate(dateOf(n))}</div>
            <div class="row-title">${esc(d.focusShort)}</div>
            ${d.nickname ? `<div class="row-meta" style="color:var(--red)">${esc(d.nickname)}</div>` : ''}
          </div>${badge}
        </div>
      </button>
      ${open ? `<ul class="items" style="margin-top:10px">${d.exercises.map((x) => `<li><span>${esc(x.name)}</span><span>${x.sets > 1 ? `${x.sets} × ` : ''}${esc(x.reps)}</span></li>`).join('')}</ul>
        <div class="row-meta" style="margin:10px 0">Eat ${P.fmtNum(d.targets.kcal)} kcal · P ${d.targets.protein} g · C ${d.targets.carbs} g · F ${d.targets.fat} g</div>
        <button class="btn small" data-action="day" data-to="${n}" data-go="today">Open day</button>` : ''}
    </section>`;
  }
  return `<section class="hero"><div class="kicker">6-Week Program</div><h1>The Plan</h1>
    <div class="sub">${esc(P.PHASE[week])}: ${PHASE_NOTES[week]}</div></section>
    <div class="chips">${chips}</div>${days}`;
}

// ---------- Grocery ----------
const roundAmt = (x) => (x >= 10 ? Math.round(x) : Math.round(x * 10) / 10);
const money = (x) => `$${x.toFixed(2)}`;
const otherStore = (s) => (s === 'Aldi' ? 'Publix' : 'Aldi');
function buyLabel(i) {
  if (i.byWeight) return `${i.qty} lb`;
  if (i.pack === 'each') return `${i.qty}`;
  return `${i.qty} × ${i.pack}`;
}
function groceryRow(i, mode) {
  const got = state.shop.checked[i.food], alt = otherStore(i.store);
  const overridden = i.store !== i.recommended;
  return `<li class="row ${got ? 'done' : ''}">
    <button class="check" data-action="shop-toggle" data-food="${esc(i.food)}" aria-label="Got ${esc(i.food)}"></button>
    <div class="row-main">
      <div class="row-title">${esc(i.food)}${mode === 'category' ? ` <span class="badge">${i.store}</span>` : ''}</div>
      <div class="row-meta">Buy <b>${esc(buyLabel(i))}</b> · need ${roundAmt(i.amount)} ${esc(i.unit)}</div>
      <div class="stock">${overridden ? `You moved this to ${i.store}. Recommended: ${i.recommended}.` : esc(i.why)}</div>
      ${i.weeksCovered >= 2 ? `<div class="stock">One lasts ~${Math.floor(i.weeksCovered)} weeks. Skip it if you still have some.</div>` : ''}
      <button class="link" data-action="shop-switch" data-food="${esc(i.food)}">Buy at ${alt} instead (≈ ${money(i.costAt[alt])})</button>
    </div>
    <div class="buy">≈ ${money(i.cost)}</div>
  </li>`;
}
function renderGrocery() {
  const s = state.settings, shop = state.shop;
  const g = P.weeklyGroceries(s, (food) => shop.store[food]);
  const got = g.items.filter((i) => shop.checked[i.food]).length;
  const sundays = [];
  for (let n = 0; n < 6; n++) sundays.push(fmtDate(P.addDays(s.startDate, -1 + n * 7), { month: 'short', day: 'numeric' }));
  const mode = shop.mode === 'category' ? 'category' : 'store';
  const body = mode === 'store'
    ? g.stores.map((st) => `<section class="card">
        <div class="card-head"><h2>${st.name}</h2><span class="count">≈ ${money(st.total)}</span></div>
        ${st.zones.map((z) => `<h3 class="aisle" style="margin-top:12px">${esc(z.name)}</h3><ul class="list">${z.items.map((i) => groceryRow(i, mode)).join('')}</ul>`).join('')}
      </section>`).join('')
    : g.categories.map((c) => `<section class="card"><h3 class="aisle">${esc(c.name)}</h3>
        <ul class="list">${c.items.map((i) => groceryRow(i, mode)).join('')}</ul></section>`).join('');
  return `<section class="hero"><div class="kicker">Weekly Shopping</div><h1>Grocery List</h1>
    <div class="sub">One week of the meal plan, scaled to ${esc(s.bodyweight)} lb · ${esc(s.goal)}. Shop on your rest day: ${sundays.join(', ')}.</div></section>
  <section class="card">
    <div class="card-head"><h2>This trip</h2><span class="count">≈ ${money(g.trip)}</span></div>
    <p class="help" style="margin:0 0 10px">${g.stores.map((st) => `${st.name} ≈ ${money(st.total)}`).join(' + ')}.
      Averages ≈ <b>${money(g.perWeek)}/week</b> because pantry staples last several weeks.
      All at Publix would be ≈ ${money(g.allPublix)}, so you save ≈ ${money(g.allPublix - g.trip)}.</p>
    <div class="card-head"><h2 style="font-size:14px">In the cart</h2><span class="count">${got}/${g.items.length}</span></div>
    ${bar(got / g.items.length, got === g.items.length ? 'green' : '')}
    <div class="seg" style="margin:12px 0 0">
      <button data-action="shop-mode" data-mode="store" class="${mode === 'store' ? 'active' : ''}">By store</button>
      <button data-action="shop-mode" data-mode="category" class="${mode === 'category' ? 'active' : ''}">By category</button>
    </div>
    <div class="btn-row"><button class="btn secondary small" data-action="shop-clear">Start a new week</button></div>
  </section>
  ${body}
  <p class="help">Prices are estimates (Oct 2026): Aldi from 2026 price surveys, Publix from recent listings and weekly-ad sales. Check Publix's weekly ad for BOGO deals on meat and seafood. Store sections follow each chain's usual layout; your store may differ a little. Meat is raw weight (about 8 oz raw per 6 oz cooked serving). Off-plan foods you log aren't included.</p>`;
}

// ---------- Progress ----------
function renderProgress() {
  const pd = programDay();
  const elapsed = Math.max(0, Math.min(P.TOTAL_DAYS, pd));
  let fullDays = 0, exTotal = 0, exDone = 0;
  const weeks = [0, 0, 0, 0, 0, 0].map(() => ({ done: 0, total: 0 }));
  for (let n = 1; n <= P.TOTAL_DAYS; n++) {
    const d = P.getDay(n, state.settings), done = exDoneCount(n, d), w = weeks[d.week - 1];
    w.done += done; w.total += d.exercises.length;
    if (n <= elapsed) { exTotal += d.exercises.length; exDone += done; if (done === d.exercises.length) fullDays++; }
  }
  // Streak of fully completed days, counting back from today (today may still be in progress).
  let streak = 0;
  for (let n = elapsed; n >= 1; n--) {
    const d = P.getDay(n, state.settings);
    if (exDoneCount(n, d) === d.exercises.length) streak++;
    else if (n !== pd) break;
  }
  const benchRows = BENCHMARKS.map(([name, unit, better]) => {
    const b = state.bench[name] || {};
    const a = parseFloat(b.w0), z = parseFloat(b.w6) || parseFloat(b.w3);
    let chg = '';
    if (a > 0 && z > 0) {
      const pct = better === 'Lower' ? (a - z) / a : (z - a) / a;
      chg = `<span class="${pct >= 0 ? 'pos' : 'neg'}">${pct >= 0 ? '+' : ''}${(pct * 100).toFixed(1)}%</span>`;
    }
    const cell = (col) => `<td><input type="number" inputmode="decimal" step="any" aria-label="${esc(name)} ${col}"
      data-bind="bench" data-k="${esc(name)}" data-col="${col}" value="${esc(b[col] ?? '')}"></td>`;
    return `<tr><td>${esc(name)}<div class="help">${unit}</div></td>${cell('w0')}${cell('w3')}${cell('w6')}<td class="chg">${chg}</td></tr>`;
  }).join('');
  return `<section class="hero"><div class="kicker">Progress</div><h1>Your Gains</h1>
    <div class="sub">${pd < 1 ? 'Program has not started yet.' : `Day ${Math.min(pd, P.TOTAL_DAYS)} of ${P.TOTAL_DAYS}`}</div></section>
  <section class="card"><div class="stats">
    <div class="stat"><div class="num">${fullDays}</div><div class="lbl">Full days</div></div>
    <div class="stat"><div class="num">${exTotal ? Math.round((exDone / exTotal) * 100) : 0}%</div><div class="lbl">Exercises done</div></div>
    <div class="stat"><div class="num">${streak}</div><div class="lbl">Day streak</div></div>
  </div></section>
  <section class="card"><div class="card-head"><h2>Weekly completion</h2></div><div class="weekbars">
    ${weeks.map((w, i) => `<div class="weekbar"><span>Week ${i + 1}</span>${bar(w.done / w.total, w.done === w.total ? 'green' : '')}<span>${Math.round((w.done / w.total) * 100)}%</span></div>`).join('')}
  </div></section>
  <section class="card"><div class="card-head"><h2>Benchmarks</h2><span class="count">Test wk 0 · 3 · 6</span></div>
    <table class="bench"><thead><tr><th>Test</th><th>Wk 0</th><th>Wk 3</th><th>Wk 6</th><th style="text-align:right">Change</th></tr></thead>
    <tbody>${benchRows}</tbody></table>
    <p class="help">Change compares Week 0 to your latest result. For run time and heart rate, lower is better, so positive always means improvement.</p>
  </section>
  <section class="card"><div class="card-head"><h2>Bodyweight</h2></div>${weightChart()}</section>`;
}

function weightChart() {
  const pts = Object.entries(state.weights).filter(([, v]) => v > 0).sort(([a], [b]) => a.localeCompare(b));
  if (pts.length < 2) return '<p class="help">Log your weight on the Today tab. The chart appears after two entries.</p>';
  const W = 320, H = 140, pad = 24;
  const t0 = Date.parse(pts[0][0]), t1 = Date.parse(pts[pts.length - 1][0]) || t0 + 1;
  const vals = pts.map(([, v]) => v), lo = Math.min(...vals) - 1, hi = Math.max(...vals) + 1;
  const x = (iso) => pad + ((Date.parse(iso) - t0) / (t1 - t0 || 1)) * (W - pad * 2);
  const y = (v) => H - pad - ((v - lo) / (hi - lo)) * (H - pad * 2);
  const line = pts.map(([d, v]) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const first = vals[0], last = vals[vals.length - 1], diff = last - first;
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bodyweight trend">
    <line x1="${pad}" x2="${W - pad}" y1="${H - pad}" y2="${H - pad}" stroke="#333"/>
    <polyline points="${line}" fill="none" stroke="#d32f2f" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map(([d, v]) => `<circle cx="${x(d).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="#d32f2f"/>`).join('')}
    <text x="${pad}" y="14" fill="#9a9a9a" font-size="11">${hi - 1} lb</text>
    <text x="${pad}" y="${H - 6}" fill="#9a9a9a" font-size="11">${fmtDate(pts[0][0], { month: 'short', day: 'numeric' })}</text>
    <text x="${W - pad}" y="${H - 6}" fill="#9a9a9a" font-size="11" text-anchor="end">${fmtDate(pts[pts.length - 1][0], { month: 'short', day: 'numeric' })}</text>
  </svg><p class="help">${first} → ${last} lb (${diff >= 0 ? '+' : ''}${diff.toFixed(1)} lb)</p></div>`;
}

// ---------- Settings ----------
function deviceCode() {
  if (!state.push) return '';
  return JSON.stringify({
    device: isIOS() ? 'iPhone' : /Android/.test(navigator.userAgent) ? 'Android' : 'Browser',
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    morning: Number(state.settings.morningHour), evening: Number(state.settings.eveningHour),
    sub: state.push,
  });
}

function renderSettings() {
  const s = state.settings, tr = P.targets(s, 'Training'), rest = P.targets(s, 'Rest');
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const on = perm === 'granted' && state.push;
  const hours = (from, to, sel) => Array.from({ length: to - from + 1 }, (_, k) => from + k)
    .map((h) => `<option value="${h}" ${h === Number(sel) ? 'selected' : ''}>${fmtHour(h)}</option>`).join('');
  const needsInstall = isIOS() && !isStandalone();
  return `<section class="hero"><div class="kicker">Settings</div><h1>Setup</h1></section>
  <section class="card"><div class="card-head"><h2>Program</h2></div>
    <label class="field"><span>Start date (Day 1)</span><input type="date" data-bind="set" data-k="startDate" value="${esc(s.startDate)}"></label>
    <div class="grid2">
      <label class="field"><span>Bodyweight (lb)</span><input type="number" inputmode="decimal" data-bind="set" data-k="bodyweight" value="${esc(s.bodyweight)}"></label>
      <label class="field"><span>Goal</span><select data-bind="set" data-k="goal">${Object.keys(P.GOALS).map((g) => `<option ${g === s.goal ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
    </div>
    <p class="help">Training days: <b>${P.fmtNum(tr.kcal)} kcal</b> · P ${tr.protein} g · C ${tr.carbs} g · F ${tr.fat} g<br>
    Rest day: <b>${P.fmtNum(rest.kcal)} kcal</b> · P ${rest.protein} g · C ${rest.carbs} g · F ${rest.fat} g<br>
    Meal portions rescale to these targets automatically.</p>
  </section>
  <section class="card"><div class="card-head"><h2>Supplements</h2><span class="count">${s.supplements.length}</span></div>
    ${s.supplements.map((x, i) => `<div class="supp-edit">
      <input aria-label="Supplement name" data-bind="supp" data-i="${i}" data-field="name" value="${esc(x.name)}">
      <div class="grid2">
        <input aria-label="When to take it" placeholder="When" data-bind="supp" data-i="${i}" data-field="when" value="${esc(x.when)}">
        <select aria-label="Which days" data-bind="supp" data-i="${i}" data-field="days">${Object.entries(P.SUPP_DAYS).map(([k, v]) => `<option value="${k}" ${k === x.days ? 'selected' : ''}>${v}</option>`).join('')}</select>
      </div>
      <button class="link" data-action="del-supp" data-i="${i}">Remove</button>
    </div>`).join('')}
    <button class="btn secondary" style="margin-top:10px" data-action="add-supp">+ Add supplement</button>
    <p class="help">Shows up as a checklist on the Today tab, and the evening check-in counts it.</p>
  </section>
  <section class="card"><div class="card-head"><h2>Daily reminders</h2><span class="status ${on ? 'on' : 'off'}">${on ? 'On' : 'Off'}</span></div>
    ${needsInstall ? `<div class="banner">On iPhone, notifications only work from the Home Screen app. Tap <b>Share</b> → <b>Add to Home Screen</b>, then open Hanma from there.</div>` : ''}
    <div class="grid2">
      <label class="field"><span>Morning plan</span><select data-bind="set" data-k="morningHour">${hours(4, 11, s.morningHour)}</select></label>
      <label class="field"><span>Evening check-in</span><select data-bind="set" data-k="eveningHour">${hours(17, 23, s.eveningHour)}</select></label>
    </div>
    <div class="btn-row">
      <button class="btn" data-action="enable-push">${on ? 'Refresh notifications' : 'Turn on notifications'}</button>
      <button class="btn secondary" data-action="test-push">Test</button>
    </div>
    ${state.push ? `<label class="field" style="margin-top:12px"><span>Your device code (paste into GitHub, see README)</span>
      <textarea class="code" readonly id="device-code">${esc(deviceCode())}</textarea></label>
      <button class="btn secondary" data-action="copy-code">Copy device code</button>
      <p class="help">If you change reminder times, copy the code again and update it on GitHub.</p>` : ''}
  </section>
  <section class="card"><div class="card-head"><h2>Your data</h2></div>
    <p class="help">Everything is saved only on this phone. Export a backup now and then.</p>
    <div class="btn-row">
      <button class="btn secondary" data-action="export">Export backup</button>
      <button class="btn secondary" data-action="import">Import backup</button>
    </div>
    <input type="file" id="import-file" accept="application/json,.json" hidden>
    <button class="btn secondary" style="margin-top:8px;color:#ff8a80" data-action="reset">Reset all data</button>
  </section>
  <p class="help" style="text-align:center">Inspired by a fictional character. Check with a doctor before starting, and scale everything to your level.</p>`;
}

// ---------- Food sheet ----------
function renderSheet() {
  const s = ui.sheet, el = $('#sheet'), bg = $('#sheet-backdrop');
  if (!s) { el.hidden = true; bg.hidden = true; el.innerHTML = ''; return; }
  const num = (id, label) => `<label class="field"><span>${label}</span><input id="${id}" type="number" inputmode="decimal" step="any"></label>`;
  el.innerHTML = `<div class="grab"></div><h3>Log other food · Day ${s.day}</h3>
    <div class="seg">
      <button data-action="sheet-mode" data-mode="db" class="${s.mode === 'db' ? 'active' : ''}">From food list</button>
      <button data-action="sheet-mode" data-mode="custom" class="${s.mode === 'custom' ? 'active' : ''}">Custom</button>
    </div>
    ${s.mode === 'db' ? `
      <label class="field"><span>Food</span><select id="f-food">${Object.keys(P.FOODS).map((f) => `<option>${esc(f)}</option>`).join('')}</select></label>
      <label class="field"><span>Servings</span><input id="f-serv" type="number" inputmode="decimal" step="0.25" value="1"></label>
      <div class="preview" id="f-preview"></div>` : `
      <label class="field"><span>Name</span><input id="f-name" placeholder="e.g. Burrito bowl"></label>
      <div class="grid2">${num('f-kcal', 'Calories')}${num('f-p', 'Protein (g)')}${num('f-c', 'Carbs (g)')}${num('f-f', 'Fat (g)')}</div>`}
    <div class="btn-row"><button class="btn secondary" data-action="close-sheet">Cancel</button><button class="btn" data-action="save-food">Add</button></div>`;
  el.hidden = false; bg.hidden = false;
  updatePreview();
}
function updatePreview() {
  const out = $('#f-preview');
  if (!out) return;
  const food = $('#f-food').value, sv = parseFloat($('#f-serv').value) || 0, m = P.macrosFor(food, sv);
  out.textContent = `1 serving = ${P.FOODS[food][0]}. ${sv} × that = ${P.fmtNum(m.kcal)} kcal · ${Math.round(m.protein)} g protein · ${Math.round(m.carbs)} g carbs · ${Math.round(m.fat)} g fat`;
}
function saveFood() {
  const log = logFor(ui.sheet.day);
  if (ui.sheet.mode === 'db') {
    const food = $('#f-food').value, sv = parseFloat($('#f-serv').value);
    if (!(sv > 0)) return toast('Enter how many servings.');
    log.foods.push({ name: food, serving: P.FOODS[food][0], servings: sv, ...P.macrosFor(food, sv) });
  } else {
    const name = $('#f-name').value.trim(), v = (id) => parseFloat($(id).value) || 0;
    if (!name) return toast('Give the food a name.');
    log.foods.push({ name, kcal: v('#f-kcal'), protein: v('#f-p'), carbs: v('#f-c'), fat: v('#f-f') });
  }
  ui.sheet = null; save(); render(); toast('Food logged.');
}

// ---------- Notifications ----------
function b64ToBytes(b64) {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}
async function enablePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return toast(isIOS() && !isStandalone() ? 'Add Hanma to your Home Screen first, then open it from there.' : 'This browser does not support push notifications.');
  }
  if (!self.APP_CONFIG?.vapidPublicKey) return toast('Push is not configured yet (missing VAPID key in config.js).');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return toast('Notifications are blocked. Allow them for Hanma in your phone settings.');
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(APP_CONFIG.vapidPublicKey) });
    state.push = sub.toJSON(); save(); render();
    toast('Notifications on. Now copy your device code.');
  } catch (err) {
    toast(`Could not subscribe: ${err.message}`);
  }
}
async function testPush() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return toast('Notifications are not supported here.');
  if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') return toast('Notifications are blocked.');
  const reg = await navigator.serviceWorker.ready;
  const msg = P.compose(state, 'morning', new Date());
  await reg.showNotification(msg.title, { body: msg.body, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: 'hanma-test' });
}

// ---------- Data ----------
function exportData() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  a.download = `hanma-backup-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
async function importData(file) {
  try {
    const s = JSON.parse(await file.text());
    if (!s || !s.settings || !s.logs) throw new Error('not a Hanma backup');
    state = normalize(s);
    save(); render(); toast('Backup restored.');
  } catch (err) {
    toast(`Import failed: ${err.message}`);
  }
}

// ---------- Rendering & events ----------
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}
function render() {
  const views = { today: renderToday, plan: renderPlan, grocery: renderGrocery, progress: renderProgress, settings: renderSettings };
  $('#view').innerHTML = views[ui.tab]();
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === ui.tab));
  renderSheet();
}
function goTab(tab) { ui.tab = tab; render(); scrollTo(0, 0); }

document.addEventListener('click', async (e) => {
  const tabBtn = e.target.closest('#tabs button');
  if (tabBtn) return goTab(tabBtn.dataset.tab);
  if (e.target.id === 'sheet-backdrop') { ui.sheet = null; return renderSheet(); }
  const b = e.target.closest('[data-action]');
  if (!b) return;
  const n = currentDay(), i = Number(b.dataset.i);
  switch (b.dataset.action) {
    case 'day':
      ui.day = b.dataset.to === 'today' ? null : clampDay(Number(b.dataset.to));
      if (ui.day === clampDay(programDay()) && programDay() >= 1) ui.day = null;
      if (b.dataset.go) return goTab(b.dataset.go);
      return render();
    case 'toggle-ex': {
      const l = (logFor(n).ex[i] ||= {});
      l.done = !l.done;
      if (l.done) navigator.vibrate?.(15);
      save(); return render();
    }
    case 'toggle-meal': {
      const meals = logFor(n).meals;
      meals[i] = !meals[i];
      if (meals[i]) navigator.vibrate?.(15);
      save(); return render();
    }
    case 'toggle-supp': {
      const supps = logFor(n).supps, id = b.dataset.id;
      if (supps[id]) delete supps[id]; else { supps[id] = true; navigator.vibrate?.(15); }
      save(); return render();
    }
    case 'add-supp':
      state.settings.supplements.push({ id: `s${Date.now()}`, name: 'New supplement', when: '', days: 'daily' });
      save(); render();
      return document.querySelectorAll('[data-field=name]')[state.settings.supplements.length - 1]?.select();
    case 'del-supp': state.settings.supplements.splice(i, 1); save(); return render();
    case 'expand': ui.open[b.dataset.key] = !ui.open[b.dataset.key]; return render();
    case 'add-food': ui.sheet = { mode: 'db', day: n }; return renderSheet();
    case 'sheet-mode': ui.sheet.mode = b.dataset.mode; return renderSheet();
    case 'close-sheet': ui.sheet = null; return renderSheet();
    case 'save-food': return saveFood();
    case 'del-food': logFor(n).foods.splice(i, 1); save(); return render();
    case 'week': ui.week = Number(b.dataset.w); ui.planOpen = null; return render();
    case 'plan-open': { const k = Number(b.dataset.n); ui.planOpen = ui.planOpen === k ? null : k; return render(); }
    case 'shop-toggle': {
      const c = state.shop.checked, f = b.dataset.food;
      if (c[f]) delete c[f]; else c[f] = true;
      save(); return render();
    }
    case 'shop-clear': state.shop.checked = {}; save(); return render();
    case 'shop-mode': state.shop.mode = b.dataset.mode; save(); return render();
    case 'shop-switch': {
      const f = b.dataset.food, rec = P.weeklyGroceries(state.settings).items.find((x) => x.food === f).recommended;
      const next = otherStore(state.shop.store[f] || rec);
      if (next === rec) delete state.shop.store[f]; else state.shop.store[f] = next;
      save(); return render();
    }
    case 'enable-push': return enablePush();
    case 'test-push': return testPush();
    case 'copy-code': {
      const code = deviceCode();
      try { await navigator.clipboard.writeText(code); } catch { $('#device-code').select(); document.execCommand('copy'); }
      return toast('Device code copied.');
    }
    case 'export': return exportData();
    case 'import': return $('#import-file').click();
    case 'reset':
      if (confirm('Delete all logs, benchmarks and settings on this phone? This cannot be undone.')) {
        state = defaults(); ui.day = null; save(); render(); toast('All data reset.');
      }
  }
});

document.addEventListener('input', (e) => { if (e.target.id === 'f-food' || e.target.id === 'f-serv') updatePreview(); });

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.id === 'import-file' && el.files[0]) return importData(el.files[0]);
  const kind = el.dataset.bind;
  if (!kind) return;
  const n = currentDay();
  if (kind === 'ex-note') {
    const l = (logFor(n).ex[el.dataset.i] ||= {});
    l.note = el.value.trim();
    save(); return;
  }
  if (kind === 'weight') {
    const v = parseFloat(el.value);
    if (v > 0) state.weights[el.dataset.date] = v; else delete state.weights[el.dataset.date];
    save(); return;
  }
  if (kind === 'supp') {
    const x = state.settings.supplements[el.dataset.i];
    if (!x) return;
    x[el.dataset.field] = el.dataset.field === 'name' ? (el.value.trim() || x.name) : el.value.trim();
    save(); return;
  }
  if (kind === 'bench') {
    (state.bench[el.dataset.k] ||= {})[el.dataset.col] = el.value;
    save(); return render();
  }
  if (kind === 'set') {
    const k = el.dataset.k;
    if (k === 'startDate' && !el.value) return;
    state.settings[k] = ['bodyweight', 'morningHour', 'eveningHour'].includes(k) ? Number(el.value) : el.value;
    if (k === 'startDate') { ui.day = null; ui.week = null; }
    save(); render();
  }
});

// Re-render when the app comes back to the foreground so "today" rolls over at midnight.
document.addEventListener('visibilitychange', () => { if (!document.hidden && !ui.sheet) render(); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
save(); // mirror state into IndexedDB so the service worker can build notifications
render();
