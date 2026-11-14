/* Masrofi — app controller + Desktop Preview Studio wiring (Clean Appbar, Internal System Config) */
M.s = Object.assign(M.seed(), { os: 'ios', theme: 'light', lang: 'ar', tab: 'home', billSeg: 'bills', famSeg: 'feed', privacy: false });
M.TABS = [['home', 'home'], ['bills', 'receipt'], ['family', 'users'], ['insights', 'spark']];

M.statusbarHtml = () => {
  const sig = `<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>`;
  const wifi = `<svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.2c2.4 0 4.6.9 6.2 2.4l1.2-1.3A10.6 10.6 0 0 0 8 .4 10.6 10.6 0 0 0 .6 3.3l1.2 1.3A8.8 8.8 0 0 1 8 2.2zm0 3.6c1.4 0 2.7.5 3.7 1.4l1.2-1.3a7.3 7.3 0 0 0-9.8 0l1.2 1.3c1-.9 2.3-1.4 3.7-1.4zM8 9.3l2-2.1a3 3 0 0 0-4 0z"/></svg>`;
  const bat = M.s.os === 'ios'
    ? `<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="17" height="9" rx="2" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="currentColor" opacity=".45"/></svg>`
    : `<svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor"><rect x="3.5" y="0" width="5" height="2" rx=".5"/><rect x="1" y="2" width="10" height="14" rx="1.5"/></svg>`;
  return M.s.os === 'ios' ? `<span>9:41</span><span class="sb-icons">${sig}${wifi}${bat}</span>` : `<span>9:41</span><span class="sb-icons">${wifi}${sig}${bat}</span>`;
};
M.appbarHtml = () => {
  const s = M.s, titles = { home: M.t('hello'), bills: M.t('billsT'), family: M.t('familyT'), insights: M.t('insightsT') };
  const unpaid = s.bills.filter(b => !b.paid).length;
  return `<div class="ab-title">${s.tab === 'home' ? `<div class="ab-sub">${M.t('november')}</div>` : ''}<h2 style="${s.tab === 'home' ? 'font-size:19px;line-height:1.3;white-space:nowrap' : ''}">${titles[s.tab]}</h2></div>
    <button type="button" class="icon-btn" data-act="bell" id="bell" aria-label="alerts">${M.ico('bell', 20)}${unpaid ? '<span class="dot"></span>' : ''}</button>
    ${s.tab === 'home' ? M.avatar('abu', 'ring', 'style="width:40px;height:40px;cursor:pointer" data-act="member" data-id="abu"') : ''}`;
};
M.navHtml = () => {
  const items = M.TABS.map(([k, ico], i) => `<button type="button" class="nav-item ${M.s.tab === k ? 'on' : ''}" data-act="tab" data-id="${k}"><span class="ni-ico">${M.ico(ico, M.s.os === 'ios' ? 23 : 22, M.s.tab === k ? 2.15 : 1.75)}</span>${M.t('nav')[i]}</button>`);
  items.splice(2, 0, `<button type="button" class="nav-scan" data-act="open-scan" aria-label="scan"><span>${M.ico('camera', 24, 2)}</span></button>`);
  return items.join('');
};

M.render = (animate = false) => {
  const s = M.s, scr = M.$('#screen'), ph = M.phone(), c = M.calc();
  ph.dataset.tab = s.tab;
  ph.dataset.state = c.state;
  M.$('#statusbar').innerHTML = M.statusbarHtml();
  M.$('#appbar').innerHTML = M.appbarHtml();
  M.$('#nav').innerHTML = M.navHtml();
  M.$('#fab').innerHTML = `${M.ico('camera', 21, 2)}<span>${M.t('scan')}</span>`;
  M.$('#fab').dataset.act = 'open-scan';
  scr.classList.remove('stagger');
  scr.innerHTML = M.screens[s.tab]();
  if (animate) {
    [...scr.querySelectorAll('.anim')].forEach((el, i) => el.style.setProperty('--i', i));
    void scr.offsetWidth;
    scr.classList.add('stagger');
    clearTimeout(M._stagTm);
    M._stagTm = setTimeout(() => scr.classList.remove('stagger'), 850);
  }
  if (s.tab === 'home') M.afterHome();
  if (s.tab === 'insights') M.animateRings(scr);
};

M.ORDER = ['home', 'bills', 'family', 'insights'];
M.go = tab => {
  const from = M.ORDER.indexOf(M.s.tab), to = M.ORDER.indexOf(tab);
  const scr = M.$('#scroll');
  M.s.tab = tab;
  if (scr) {
    scr.scrollTop = 0;
    if (from !== -1 && to !== -1 && from !== to) {
      const rtl = M.phone().dir === 'rtl';
      scr.style.setProperty('--dx', ((to > from) !== rtl ? 1 : -1) * 18 + 'px');
      M.replayAnim(scr, 'tab-in', 420);
    }
  }
  M.render(true);
  const btn = document.querySelector(`.nav-item[data-id="${tab}"]`);
  M.replayAnim(btn, 'pop', 480);
};

/* Rive-style threshold transitions → conditional alerts */
M.checkThreshold = () => {
  const st = M.calc().state, prev = M.s.lastState;
  M.s.lastState = st;
  M.phone().dataset.state = st;
  if (!prev || st === prev) return;
  const worse = ['safe', 'warn', 'crit'].indexOf(st) > ['safe', 'warn', 'crit'].indexOf(prev);
  if (worse && st !== 'safe') setTimeout(() => M.notify(M.t('st' + (st === 'warn' ? 'Warn' : 'Crit')), M.t(st === 'warn' ? 'thresholdWarn' : 'thresholdCrit'), () => M.acts.hero()), 850);
};

/* ── generic actions ── */
M.acts.tab = el => M.go(el.dataset.id);
M.acts['open-scan'] = el => { M.replayAnim(el, 'bump', 400); M.sheet.close(); M.openScanner('receipt'); };
M.acts['close-sheet'] = () => {
  const overScanner = M.$('#scanner').classList.contains('on');
  M.sheet.close(); M.$('#scrim').classList.remove('on');
  if (overScanner) { M.liftSheet(false); M.openScanner(M.scan.mode); }
  else if (M.s.tab === 'insights') M.render();
};
M.acts.bell = el => { M.replayAnim(el.querySelector('.ic'), 'wiggle', 820); setTimeout(() => M.acts['banner-open'](), 420); };

/* ── live scenario simulators ── */
M.SIM = {
  alert() {
    M.closeScanner(); M.s.bannerHidden = false;
    if (M.api) {
      M.api.saveLocal(M.s);
      M.api.updateConfig({ bannerHidden: false }).catch(() => {});
    }
    if (M.s.tab !== 'home') M.go('home'); else M.render();
    const unpaid = M.s.bills.filter(b => !b.paid);
    M.notify(`${M.t('alertTitle')}`, M.t('alertBody')(unpaid.length, 15), () => M.acts['banner-open']());
    setTimeout(() => {
      M.replayAnim(M.$('#bell .ic'), 'wiggle', 820);
      const b = M.$('#banner');
      if (b) { M.replayAnim(b, 'flash', 1200); M.replayAnim(b.querySelector('.b-ico .ic'), 'wiggle', 820); }
    }, 280);
  },
  billscan() { M.sheet.close(); M.$('#scrim').classList.remove('on'); M.openScanner('bill', true); },
  purchase() {
    M.closeScanner();
    const [mid, mar, men, cat, [lo, hi]] = M.SIM_PURCHASES[Math.floor(Math.random() * M.SIM_PURCHASES.length)];
    const amount = Math.round((lo + Math.random() * (hi - lo)) * 4) / 4, id = Date.now();
    const h = 7 + Math.floor(Math.random() * 3), mm = String(Math.floor(Math.random() * 60)).padStart(2, '0');
    const newP = { id, member: mid, merchant: { ar: mar, en: men }, cat, amount, day: M.s.day, time: `${h}:${mm} PM`, scanned: Math.random() > .3,
      items: [{ n: { ar: M.CATS[cat].n.ar, en: M.CATS[cat].n.en }, q: 1, p: amount }] };
    M.s.purchases.unshift(newP);
    if (M.api) {
      M.api.saveLocal(M.s);
      M.api.addPurchase(newP).catch(() => {});
    }
    M.tickerNew = true; M.freshId = id;
    if (M.s.tab === 'family') { M.s.famSeg = 'feed'; M.s.famFilter = 'all'; M.render(); } else if (M.s.tab === 'home') M.render(); else M.go('home');
    M.freshId = null;
    const m = M.member(mid);
    M.notify(M.t('newPurchase')(M.L(m.n), M.L({ ar: mar, en: men })), `${M.moneyNeg(amount)} · ${M.L(M.CATS[cat].n)}`, () => M.acts.receipt({ dataset: { id } }));
    M.checkThreshold();
  },
  reset() {
    const keep = { os: M.s.os, theme: M.s.theme, lang: M.s.lang, tab: 'home', billSeg: 'bills', famSeg: 'feed', privacy: false };
    M.s = Object.assign(M.seed(), keep);
    if (M.api) {
      M.api.saveLocal(M.s);
      M.api.reset().catch(() => {});
    }
    M.s.lastState = M.calc().state; M.prevPct = 0; M.prevBal = 0;
    M.phone().classList.remove('blurred'); M.closeScanner(); M.go('home'); M.toast('↺ Reset');
  },
};

/* ── studio controls ── */
M.applyEnv = (opts = {}) => {
  const s = M.s, ph = M.phone(), dev = M.$('#device');
  dev.dataset.os = ph.dataset.os = s.os;
  ph.dataset.theme = s.theme;
  ph.dir = s.lang === 'ar' ? 'rtl' : 'ltr'; ph.lang = s.lang;
  document.querySelectorAll('.seg[data-ctl]').forEach(g => g.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === s[g.dataset.ctl])));
  if (M.$('#scanner').classList.contains('on')) M.openScanner(M.scan.mode);
  if (M.sheet.isOpen && !opts.keepSheet) { M.sheet.close(); M.$('#scrim').classList.remove('on'); }
  M.render(true);
};
document.querySelectorAll('.seg[data-ctl] button').forEach(b => b.addEventListener('click', () => {
  M.s[b.parentElement.dataset.ctl] = b.dataset.v; M.applyEnv();
}));
document.querySelectorAll('[data-sim]').forEach(b => b.addEventListener('click', () => M.SIM[b.dataset.sim]()));

/* ── event delegation inside the phone ── */
const phone = M.phone();
phone.addEventListener('click', ev => {
  const seg = ev.target.closest('[data-seg]');
  if (seg) {
    const wrap = seg.parentElement, btns = [...wrap.querySelectorAll('button')], idx = btns.indexOf(seg);
    const key = seg.dataset.seg, nextV = seg.dataset.v;
    if (M.s[key] === nextV) return;
    btns.forEach(b => b.classList.toggle('on', b === seg));
    const thumb = wrap.querySelector('.thumb');
    if (thumb) thumb.style.insetInlineStart = `calc(3px + ${idx} * (100% - 6px) / ${btns.length})`;
    M.s[key] = nextV;
    const sb = document.getElementById('segBody');
    if (sb) {
      sb.innerHTML = key === 'famSeg' ? M.familyBodyHtml() : M.billsBodyHtml();
      M.replayAnim(sb, 'seg-in', 380);
    } else {
      M.render(true);
    }
    return;
  }
  const el = ev.target.closest('[data-act]');
  if (el && M.acts[el.dataset.act]) M.acts[el.dataset.act](el, ev);
});
M.$('#scrim').addEventListener('click', () => M.acts['close-sheet']());

window.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') {
    if (M.sheet?.isOpen) {
      M.acts['close-sheet']();
    } else if (M.scan?.open) {
      M.closeScanner();
    }
  }
});
phone.addEventListener('input', ev => {
  if (ev.target && typeof ev.target.value === 'string' && /[\u0660-\u0669\u06F0-\u06F9]/.test(ev.target.value)) {
    const start = ev.target.selectionStart, end = ev.target.selectionEnd;
    ev.target.value = M.toWesternDigits(ev.target.value);
    if (typeof start === 'number') {
      try { ev.target.setSelectionRange(start, end); } catch {}
    }
  }
});
phone.addEventListener('submit', ev => {
  ev.preventDefault();
  const f = ev.target;
  if (f.dataset.form === 'cart') {
    const itemIn = f.querySelector('#cartIn'), priceIn = f.querySelector('#cartPrice');
    M.addCartItem(itemIn ? itemIn.value : '', priceIn ? priceIn.value : '');
  }
  if (f.dataset.form === 'cart-edit') M.saveCartEdit(f);
  if (f.dataset.form === 'bill-edit') M.saveBillEdit(f);
  if (f.dataset.form === 'salary-edit') M.saveSalaryEdit(f);
  if (f.dataset.form === 'add-purch') M.saveManualPurchase(f);
  if (f.dataset.form === 'manual') M.saveManual(f);
});

/* Spline-style perspective tilt for hero & 3D car card */
phone.addEventListener('pointermove', ev => {
  const t = ev.target.closest('[data-tilt],[data-tilt3d]'); if (!t) return;
  const r = t.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width - .5, y = (ev.clientY - r.top) / r.height - .5;
  const k = t.hasAttribute('data-tilt3d') ? 12 : 5;
  t.style.setProperty('--ry', `${(x * k).toFixed(2)}deg`);
  t.style.setProperty('--rx', `${(-y * k).toFixed(2)}deg`);
  t.style.setProperty('--shine', `${(x * 110).toFixed(1)}%`);
});
phone.addEventListener('pointerout', ev => {
  const t = ev.target.closest('[data-tilt],[data-tilt3d]');
  if (t && !t.contains(ev.relatedTarget)) {
    t.style.removeProperty('--rx');
    t.style.removeProperty('--ry');
    t.style.removeProperty('--shine');
  }
});

/* Material ripple on Android */
phone.addEventListener('pointerdown', ev => {
  if (phone.dataset.os !== 'android') return;
  const t = ev.target.closest('.row[data-act],.btn,.card.tap,.nav-item,.chip');
  if (!t) return;
  const r = t.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2, sp = document.createElement('span');
  sp.className = 'ripple';
  Object.assign(sp.style, { width: d + 'px', height: d + 'px', left: ev.clientX - r.left - d / 2 + 'px', top: ev.clientY - r.top - d / 2 + 'px' });
  if (getComputedStyle(t).position === 'static') t.style.position = 'relative';
  t.style.overflow = 'hidden'; t.appendChild(sp); setTimeout(() => sp.remove(), 650);
});

/* Check and toggle mobile mode (responsive viewport or native Capacitor/standalone container) */
M.checkMobileMode = () => {
  const isCap = typeof window !== 'undefined' && (window.Capacitor?.isNativePlatform?.() || window.Capacitor?.platform === 'ios' || window.Capacitor?.platform === 'android');
  const isStandalone = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  const isNarrow = typeof window !== 'undefined' && window.innerWidth < 900;
  const isMobile = isCap || isStandalone || isNarrow;
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.toggle('is-mobile', isMobile);
    document.body.classList.toggle('native-app', Boolean(isCap || isStandalone));
  }
  return isMobile;
};

/* fit the device to the desktop viewport */
M.fit = () => {
  const isMob = M.checkMobileMode();
  const holder = M.$('#holder');
  if (isMob) {
    if (holder) holder.style.setProperty('--scale', 1);
    return;
  }
  const st = document.querySelector('.stage');
  if (!st || !holder) return;
  st.classList.toggle('compact', st.clientWidth < 560 || st.clientHeight < 700);
  const k = Math.min(1, (st.clientHeight - (st.classList.contains('compact') ? 40 : 110)) / 870, (st.clientWidth - 40) / 414);
  holder.style.setProperty('--scale', k);
};
addEventListener('resize', M.fit);

/* Offline-First state initialization + Internal System Realtime Sync */
M.initOfflineSync = async () => {
  if (!M.api) return;
  // 1. Instant local hydration
  const local = M.api.loadLocal();
  if (local) {
    const keep = { os: M.s.os, theme: M.s.theme, lang: M.s.lang, tab: M.s.tab, billSeg: M.s.billSeg, famSeg: M.s.famSeg, privacy: M.s.privacy };
    Object.assign(M.s, local, keep);
    M.render();
  }

  // 2. Pull system-level Supabase config from server (/api/integrations) if available, then start Realtime
  await M.api.syncSystemConfigFromServer();
  M.api.initRealtimeSync();

  // 3. Background sync with backend API / Supabase
  try {
    await M.api.flushQueue();

    const remote = await M.api.fetchState();
    if (remote) {
      const keep = { os: M.s.os, theme: M.s.theme, lang: M.s.lang, tab: M.s.tab, billSeg: M.s.billSeg, famSeg: M.s.famSeg, privacy: M.s.privacy };
      Object.assign(M.s, remote, keep);
      M.api.saveLocal(M.s);
      M.render();
    }
  } catch (err) {
    console.log('[Masrofi Sync] Operating in offline mode with cached local state');
  }
};

/* design resource map (where each of the 22 resources is applied) */
M.$('#refs').innerHTML = [
  ['Mobbin', 'fintech card hierarchy & screen structure on every tab'], ['Page Flows', '3-step Capture → AI Parse → One-Tap Confirm scanner'],
  ['Dribbble', 'rounded hero card, soft elevation, contrast'], ['Apple HIG', 'iOS mode: frosted tab bar, large titles, segmented control, sheets'],
  ['Material 3', 'Android mode: pill nav indicator, extended FAB, tonal surfaces, dynamic color'], ['FreebiesFlux', 'category mini-tiles & summary cards'],
  ['Figma prototyping', '8pt spatial grid, auto-layout flex stacks'], ['Nucleus / iOS 18 / M3 kits', 'badges, avatars, rings, pills, list rows'],
  ['Penpot', 'CSS design tokens per OS/theme'], ['ProtoPie', 'tap-to-blur balance, laser scan, threshold alerts, live slider'],
  ['Lunacy', 'vector empty states (cart, all bills paid)'], ['365 Web Resources', 'family wallet cards & transaction rows'],
  ['LottieFiles', 'scan laser, success checkmark burst, alert pulse'], ['Rive', 'state-machine gauge: emerald → amber → coral'],
  ['Jitter', 'staggered spring entry on tab switch & sheets'], ['Spline', '3D tilting metallic car card + hero perspective'],
  ['useAnimations', 'bell wiggle, nav pop, shutter, eye toggle'], ['Lordicon', 'duotone animated category icons'],
  ['Haikei', 'layered SVG waves + blob in hero'], ['Super Designer', 'multi-node mesh gradient hero'],
  ['MagicPattern', 'perspective grid + noise in scanner & AI header'], ['BGJar / SVGGenie / Undesign', 'SVG patterns on alert banner & car card'],
].map(([a, b]) => `<li><b>${a}</b> — ${b}</li>`).join('');

/* boot */
M.s.lastState = M.calc().state;
M.checkMobileMode();
M.applyEnv();
M.fit();
M.initOfflineSync();
