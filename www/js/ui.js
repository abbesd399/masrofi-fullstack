/* Shared UI helpers: sheets, toasts, in-app + outside-app OS notifications, segmented controls, gauge, illustrations */
M.$ = s => document.querySelector(s);
M.phone = () => M.$('#phone');

/* Cleanly trigger/replay a CSS animation class and remove it when finished */
M.replayAnim = (el, cls, dur = 800) => {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  clearTimeout(el['_tm_' + cls]);
  el['_tm_' + cls] = setTimeout(() => el.classList.remove(cls), dur);
};

/* segmented control (iOS thumb / M3 segmented buttons) */
M.segc = (key, opts, active) => {
  const idx = Math.max(0, opts.findIndex(o => o[0] === active));
  return `<div class="segc" style="--n:${opts.length}">
    <span class="thumb" style="inset-inline-start:calc(3px + ${idx} * (100% - 6px) / ${opts.length})"></span>
    ${opts.map(([v, l]) => `<button type="button" class="${v === active ? 'on' : ''}" data-seg="${key}" data-v="${v}">${l}</button>`).join('')}
  </div>`;
};

/* Rive-style state-machine gauge */
M.gauge = (pct, state, label) => {
  const r = 42, C = 2 * Math.PI * r;
  const col = { safe: '#6EE7B7', warn: '#FCD34D', crit: '#FFA59B' }[state];
  const from = M.prevPct ?? 0;
  return `<div class="gauge ${state}" data-pct="${pct}" data-c="${C}">
    <svg viewBox="0 0 104 104"><circle class="g-track" cx="52" cy="52" r="${r}" fill="none" stroke-width="8.5"/>
    <circle class="g-val" cx="52" cy="52" r="${r}" fill="none" stroke="${col}" style="color:${col}" stroke-width="8.5" stroke-linecap="round"
      stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - from / 100)}"/></svg>
    <div class="g-c"><b class="num">${pct}%</b><span>${label}</span></div></div>`;
};
M.animateGauge = () => {
  const g = document.querySelector('.gauge'); if (!g) return;
  const C = +g.dataset.c, pct = +g.dataset.pct, v = g.querySelector('.g-val');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (v) v.style.strokeDashoffset = C * (1 - pct / 100);
  }));
  M.prevPct = pct;
};

/* count-up numbers */
M.countUp = (el, to, dur = 850) => {
  if (!el) return;
  const from = +(el.dataset.from || 0), t0 = performance.now();
  if (el._raf) cancelAnimationFrame(el._raf);
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = M.fmt(from + (to - from) * e);
    if (k < 1) el._raf = requestAnimationFrame(step);
    else el.dataset.from = to;
  };
  el._raf = requestAnimationFrame(step);
};

/* bottom sheet (iOS sheet / M3 modal bottom sheet) */
M.sheet = {
  open(title, body, { onOpen } = {}) {
    const sh = M.$('#sheet');
    sh.innerHTML = `<div class="grab"></div>
      <div class="sh-head"><h3>${title}</h3><button type="button" class="sh-close" data-act="close-sheet">${M.ico('close', 16, 2.4)}</button></div>
      <div class="sh-body">${body}</div>`;
    [...sh.querySelectorAll('.sh-body > *')].forEach((el, i) => el.style.setProperty('--i', i));
    M.$('#scrim').classList.add('on');
    requestAnimationFrame(() => sh.classList.add('on'));
    M.sheet.isOpen = true;
    onOpen && onOpen(sh);
  },
  close() {
    M.$('#sheet').classList.remove('on');
    if (!M.$('#scanner').classList.contains('on')) M.$('#scrim').classList.remove('on');
    M.sheet.isOpen = false;
  },
};

/* in-app toast (iOS HUD pill / M3 snackbar) */
M.toast = (msg, kind = '') => {
  const t = M.$('#toast');
  t.className = 'toast ' + kind;
  t.innerHTML = msg;
  void t.offsetWidth;
  requestAnimationFrame(() => t.classList.add('on'));
  clearTimeout(M._tt); M._tt = setTimeout(() => t.classList.remove('on'), 2700);
};

/* Dispatch OS-level notification so it appears even when the user is OUTSIDE the app / on lock screen */
M.sendExternalOSNotification = async (title, body, delaySec = 0) => {
  const cleanTitle = String(title || M.t('notifApp')).replace(/<[^>]+>/g, '').trim();
  const cleanBody = String(body || '').replace(/<[^>]+>/g, '').trim();

  // 1. Native iOS WKWebView Bridge (UNUserNotificationCenter — works on iPhone lock screen & outside app)
  try {
    if (window.webkit?.messageHandlers?.masrofiNotify) {
      window.webkit.messageHandlers.masrofiNotify.postMessage({
        title: cleanTitle,
        body: cleanBody,
        delaySec: Number(delaySec) || 0
      });
    }
  } catch {}

  // 2. Capacitor LocalNotifications Plugin (Native iOS & Android background notifications)
  try {
    const LN = window.Capacitor?.Plugins?.LocalNotifications;
    if (LN && typeof LN.schedule === 'function') {
      const atDate = new Date(Date.now() + Math.max(250, (Number(delaySec) || 0) * 1000));
      await LN.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 900000) + 1000,
          title: cleanTitle,
          body: cleanBody,
          schedule: { at: atDate, allowWhileIdle: true },
          sound: 'default'
        }]
      });
      return true;
    }
  } catch {}

  // 3. Service Worker System Notification (appears outside the app on mobile/desktop)
  try {
    if ('serviceWorker' in navigator && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function' && !(delaySec > 0)) {
        await reg.showNotification(cleanTitle, {
          body: cleanBody,
          icon: 'assets/icon-192.png',
          badge: 'assets/icon-192.png',
          vibrate: [200, 100, 200],
          tag: 'masrofi-' + Date.now(),
          renotify: true
        });
        return true;
      } else if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SCHEDULE_NOTIFICATION',
          title: cleanTitle,
          body: cleanBody,
          delayMs: Math.max(0, (Number(delaySec) || 0) * 1000)
        });
        return true;
      }
    }
  } catch {}

  // 4. Standard Web Notification API fallback
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && !(delaySec > 0)) {
      new Notification(cleanTitle, {
        body: cleanBody,
        icon: 'assets/icon-192.png',
        badge: 'assets/icon-192.png'
      });
      return true;
    }
  } catch {}
  return false;
};

/* Schedule background notifications (7,000 km Oil Change + Unpaid Monthly Bills) so they fire when outside the app */
M.scheduleBackgroundNotifications = async () => {
  try {
    if (!M.s || !M.s.onboarded) return;
    const aiAlert = M.getMonthlyAIAlert ? M.getMonthlyAIAlert() : null;
    const unpaid = (M.s.bills || []).filter(b => !b.paid).sort((a, b) => a.due - b.due);

    // Native iOS WKWebView background queue
    if (window.webkit?.messageHandlers?.masrofiScheduleBg && aiAlert) {
      window.webkit.messageHandlers.masrofiScheduleBg.postMessage({
        monthlyTitle: aiAlert.title,
        monthlyBody: aiAlert.body,
        unpaidCount: unpaid.length
      });
    }

    // Service Worker background reminder queue
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller && aiAlert) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_BG_ALERTS',
        title: aiAlert.title,
        body: aiAlert.body,
        unpaidBills: unpaid.map(b => ({ name: M.L(b.n), amount: b.amount, due: b.due }))
      });
    }
  } catch {}
};

/* Push notification banner (In-App + External OS Notification when outside the app) */
M.notify = (title, body, onTap) => {
  const n = M.$('#notif');
  if (n) {
    n.innerHTML = `<div class="n-ico">م</div><div style="flex:1;min-width:0">
      <div class="n-app"><span>${M.t('notifApp')}</span><span>${M.t('now')}</span></div>
      <div class="n-t">${title}</div><div class="n-b">${body}</div></div>`;
    n.onclick = () => { n.classList.remove('on'); onTap && onTap(); };
    n.classList.remove('on');
    void n.offsetWidth;
    requestAnimationFrame(() => requestAnimationFrame(() => n.classList.add('on')));
    clearTimeout(M._nt); M._nt = setTimeout(() => n.classList.remove('on'), 5500);
  }
  // Always dispatch external OS notification so it also shows outside the app / on lock screen
  M.sendExternalOSNotification(title, body, 0);
};

/* Lottie-style success check with confetti burst — optically & geometrically centered */
M.successCheck = (color = '#10B981') => {
  const dots = ['#10B981', '#F59E0B', '#6366F1', '#EC4899', '#06B6D4', '#FF6B5B', '#10B981', '#F59E0B']
    .map((c, i) => { const a = i / 8 * Math.PI * 2; return `<i style="--cc:${c};--x:${Math.cos(a) * 60}px;--y:${Math.sin(a) * 60}px"></i>`; }).join('');
  return `<div class="check" dir="ltr"><svg viewBox="0 0 100 100">
    <circle class="c-fill" cx="50" cy="50" r="40" fill="${color}" opacity=".14"/>
    <circle class="c-circle" cx="50" cy="50" r="42" fill="none" stroke="${color}" stroke-width="5.5" stroke-linecap="round" transform="rotate(-90 50 50)"/>
    <path class="c-tick" d="M34 51l11 11 22-24" fill="none" stroke="${color}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/></svg>${dots}</div>`;
};

/* Lunacy-style minimal vector empty states */
M.illu = type => {
  const p = 'var(--primary)';
  if (type === 'cart') return `<svg viewBox="0 0 140 110"><ellipse cx="70" cy="100" rx="46" ry="5" fill="var(--line)"/>
    <path d="M28 28h12l12 46h46l10-34H46" fill="none" stroke="${p}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="56" y="46" width="44" height="22" rx="4" fill="${p}" opacity=".15"/><circle cx="58" cy="86" r="6" fill="${p}"/><circle cx="92" cy="86" r="6" fill="${p}"/>
    <path d="M98 16l4 8 8 4-8 4-4 8-4-8-8-4 8-4z" fill="#F59E0B"/></svg>`;
  return `<svg viewBox="0 0 140 110"><ellipse cx="70" cy="100" rx="46" ry="5" fill="var(--line)"/>
    <rect x="40" y="14" width="60" height="78" rx="8" fill="var(--surface-2)" stroke="${p}" stroke-width="3"/>
    <path d="M52 34h36M52 46h36M52 58h20" stroke="var(--line)" stroke-width="4" stroke-linecap="round"/>
    <circle cx="96" cy="76" r="18" fill="${p}"/><path d="M88 76l6 6 11-12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="30" cy="30" r="4" fill="#F59E0B"/><circle cx="114" cy="22" r="3" fill="#6366F1"/></svg>`;
};

/* day label helpers */
M.dayLabel = d => d === M.s.day ? M.t('today') : d === M.s.day - 1 ? M.t('yesterday') : (M.s.lang === 'ar' ? `${d} نوفمبر` : `Nov ${d}`);
M.dateStr = d => (M.s.lang === 'ar' ? `${d} نوفمبر` : `Nov ${d}`);
