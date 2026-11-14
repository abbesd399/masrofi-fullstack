/* Tab 4 — AI Financial Coach: burn-rate forecast · price-hike & duplicate guard · customizable savings goal */
M.burnData = () => {
  const s = M.s, c = M.calc(), cum = [0];
  const curDay = Math.max(1, s.day || 1);
  for (let d = 1; d <= curDay; d++) {
    const v = (s.purchases || []).filter(p => p.day === d).reduce((a, p) => a + p.amount, 0) + (s.bills || []).filter(b => b.paid && b.paidDay === d).reduce((a, b) => a + b.amount, 0);
    cum.push(cum[d - 1] + v);
  }
  const pace = c.spentPurch / curDay;
  const runout = pace > 0 ? curDay + c.spendable / pace : 99;
  return { cum, pace, runout: Math.floor(runout), ok: runout >= (s.monthDays || 30) };
};
M.burnSvg = () => {
  const s = M.s, { cum, pace } = M.burnData(), W = 300, H = 120, c = M.calc();
  const curDay = Math.max(1, s.day || 1);
  const mDays = Math.max(2, s.monthDays || 30);
  const endF = (cum[curDay] || 0) + pace * (mDays - curDay) + c.reserved;
  const max = Math.max(1, s.salary || 100000, endF) * 1.05;
  const x = d => d / mDays * W, y = v => H - v / max * (H - 10);
  const act = cum.map((v, d) => `${x(d)},${y(v)}`).join(' ');
  const salY = y(s.salary || 100000);
  return `<svg class="burn-chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs>
      <linearGradient id="burnArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6EE7B7" stop-opacity=".38"/>
        <stop offset="1" stop-color="#6EE7B7" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <line x1="0" x2="${W}" y1="${salY}" y2="${salY}" stroke="#FFA59B" stroke-width="1.2" stroke-dasharray="4 4" opacity=".85"/>
    <line x1="0" y1="${H}" x2="${W}" y2="${salY}" stroke="rgba(255,255,255,.4)" stroke-width="1.5" stroke-dasharray="2 4"/>
    <polygon points="0,${H} ${act} ${x(curDay)},${H}" fill="url(#burnArea)"/>
    <polyline class="burn-line" points="${act}" fill="none" stroke="#6EE7B7" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="${x(curDay)}" y1="${y(cum[curDay] || 0)}" x2="${W}" y2="${y(endF)}" stroke="#FCD34D" stroke-width="2.5" stroke-dasharray="5 5"/>
    <circle cx="${x(curDay)}" cy="${y(cum[curDay] || 0)}" r="5" fill="#fff" stroke="#10B981" stroke-width="2.8"/>
  </svg>`;
};
M.ringSvg = (pct, col) => {
  const r = 38, C = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct || 0));
  return `<svg viewBox="0 0 88 88"><circle cx="44" cy="44" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="8.5"/>
    <circle class="g-val ring-anim" cx="44" cy="44" r="${r}" fill="none" stroke="${col}" stroke-width="8.5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-target="${C * (1 - clamped / 100)}" style="transition:stroke-dashoffset .85s var(--spring)"/></svg>`;
};
M.animateRings = (root = document) => {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    root.querySelectorAll('.ring-anim').forEach(el => {
      el.style.strokeDashoffset = el.dataset.target;
    });
  }));
};

M.screens.insights = () => {
  const s = M.s, ar = s.lang === 'ar', b = M.burnData();
  const g = s.goal || { name: { ar: 'هدف التوفير العائلي', en: 'Family Savings Goal' }, target: 100000, saved: 0, monthly: 10000 };
  const target = Math.max(1, g.target || 100000);
  const monthly = Math.max(1, g.monthly || 10000);
  const gp = Math.min(100, Math.round((g.saved || 0) / target * 100));
  const monthsLeft = Math.max(0, Math.ceil(Math.max(0, target - (g.saved || 0)) / monthly));
  const goalTitle = g.name ? M.L(g.name) : M.t('goalName');
  const hikesList = s.hikes || [];
  const dupsList = s.dups || [];

  const hikesSection = (hikesList.length || dupsList.length)
    ? `<div class="card tap anim" data-act="hikes">
        <div class="sec-h"><h3>${M.t('hikeT')}</h3><span class="badge crit"><span class="pulse"></span>${hikesList.length + dupsList.length}</span></div>
        ${hikesList.slice(0, 2).map(h => `<div class="hike">${M.tile('groceries', 38)}<div class="hk-n">${M.L(h.n)}<div class="hk-p"><span class="num">${M.fmt(h.was)}</span> <span class="arr">→</span> <span class="num">${M.fmt(h.now)}</span> <span class="cur-u">${M.t('cur')}</span></div></div>
          <span class="badge crit">${M.ico('trend', 12, 2.4)} +${Math.round((h.now - h.was) / h.was * 100)}%</span></div>`).join('')}
        ${dupsList[0] ? `<div class="hike"><span class="tile" style="--c:var(--warn);width:38px;height:38px">${M.ico('copy', 18)}</span><div class="hk-n">${M.t('dup')}<div class="hk-p">${M.L(dupsList[0].m)}</div></div><span class="badge warn">${ar ? 'مستبعد' : 'Excluded'}</span></div>` : ''}
      </div>`
    : `<div class="card tap anim" data-act="hikes">
        <div class="sec-h"><h3>${M.t('hikeT')}</h3><span class="badge safe">${M.ico('check', 11, 3)} ${ar ? 'مفعّل' : 'Active'}</span></div>
        <div class="muted small" style="line-height:1.5">${ar ? 'يراقب الذكاء الاصطناعي إيصالاتك تلقائياً لتنبيهك عند ارتفاع أسعار السلع أو تكرار نفس الإيصال.' : 'AI automatically monitors your scanned receipts for price hikes or duplicate charges.'}</div>
      </div>`;

  return `
  <div class="ins-head anim burn" data-act="burn">
    <div class="ih-t" style="display:flex;gap:6px;align-items:center">${M.ico('spark', 15, 2)} ${M.t('insHead')} · ${M.t('burn')}</div>
    <div class="ih-b">${b.ok ? M.t('burnOk') : M.t('burnBad')(b.runout)}</div>
    <div class="burn-chart" style="margin-top:12px">${M.burnSvg()}</div>
    <div class="legend" style="color:rgba(255,255,255,.82)"><span><i style="background:#6EE7B7"></i>${M.t('actual')}</span><span><i style="background:rgba(255,255,255,.5)"></i>${M.t('ideal')}</span><span><i style="background:#FCD34D"></i>${M.t('forecast')}</span></div>
  </div>
  ${hikesSection}
  <div class="card tap anim" data-act="goal">
    <div class="goal">
      <div class="ring">${M.ringSvg(gp, 'var(--primary)')}<b class="num">${gp}%</b></div>
      <div style="flex:1"><div class="muted small">${M.t('goalT')}</div><div style="font-size:17px;font-weight:700;margin:2px 0 4px;display:flex;align-items:center;gap:6px">${M.ico('plane', 17)} ${goalTitle}</div>
        <div class="priv"><b>${M.money(g.saved || 0)}</b> <span class="muted small">/ ${M.money(target)}</span></div>
        <div class="muted small" style="margin-top:4px">${M.t('reachBy')(monthsLeft)}</div></div>
      <span class="muted">${M.ico('pen', 16)}</span>
    </div>
  </div>`;
};

M.acts.burn = () => {
  const b = M.burnData(), c = M.calc();
  M.sheet.open(M.t('burn'), `
    <div class="alert-box" style="--bc:${b.ok ? 'var(--safe)' : 'var(--warn)'}"><span class="ab-i">${M.ico(b.ok ? 'checkc' : 'alert', 20)}</span><div>${b.ok ? M.t('burnOk') : M.t('burnBad')(b.runout)}</div></div>
    <div class="group">
      <div class="kv"><span>${M.s.lang === 'ar' ? 'معدل صرفك اليومي' : 'Your daily pace'}</span><b>${M.money(b.pace)}</b></div>
      <div class="kv"><span>${M.t('daily')}</span><b style="color:var(--safe)">${M.money(c.daily)}</b></div>
      <div class="kv"><span>${M.t('daysLeft')(c.daysLeft)}</span><b>${M.money(c.spendable)}</b></div>
    </div>`);
};

M.acts.hikes = () => {
  const s = M.s, ar = s.lang === 'ar';
  const hikesList = s.hikes || [];
  const dupsList = s.dups || [];
  if (!hikesList.length && !dupsList.length) {
    return M.sheet.open(M.t('hikeT'), `<div class="empty">${M.illu('done')}<h4>${ar ? 'لا توجد زيادات أسعار أو فواتير مكررة' : 'No price hikes or duplicate receipts'}</h4><p>${ar ? 'عند تصوير الإيصالات بالكاميرا، سيقارن الذكاء الاصطناعي الأسعار تلقائياً وينبهك هنا.' : 'As you scan receipts, AI automatically compares item prices and alerts you here.'}</p></div>`);
  }
  M.sheet.open(M.t('hikeT'), `
    <div class="group">${hikesList.map(h => `<div class="hike">${M.tile('groceries', 38)}<div class="hk-n">${M.L(h.n)}<div class="hk-p"><span>${M.t('vsLast')}</span> <span class="num">${M.fmt(h.was)}</span> <span class="arr">→</span> <span class="num">${M.fmt(h.now)}</span> <span class="cur-u">${M.t('cur')}</span></div></div>
      <span class="badge crit">+${Math.round((h.now - h.was) / h.was * 100)}%</span></div>`).join('')}</div>
    ${dupsList[0] ? `<div class="alert-box" style="--bc:var(--warn)"><span class="ab-i">${M.ico('copy', 20)}</span><div>${M.t('dupWarn')} — ${M.L(dupsList[0].m)} (${M.dateStr(dupsList[0].d)})</div></div>` : ''}`);
};

M.acts.goal = () => {
  const ar = M.s.lang === 'ar';
  const g = M.s.goal || { name: { ar: 'هدف التوفير العائلي', en: 'Family Savings Goal' }, target: 100000, saved: 0, monthly: 10000 };
  const target = Math.max(1, g.target || 100000);
  const monthly = Math.max(1, g.monthly || 10000);
  const gp = Math.min(100, Math.round((g.saved || 0) / target * 100));
  const goalTitle = g.name ? M.L(g.name) : M.t('goalName');

  M.sheet.open(M.t('goalT'), `
    <div style="text-align:center"><div class="goal" style="justify-content:center"><div class="ring" style="width:110px;height:110px">${M.ringSvg(gp, 'var(--primary)')}<b class="num" style="font-size:22px">${gp}%</b></div></div>
      <div style="font-size:17px;font-weight:700;margin-top:6px">${goalTitle}</div><div class="muted priv">${M.money(g.saved || 0)} / ${M.money(target)}</div></div>
    <form class="manual-form" data-form="goal-edit">
      <label>${ar ? 'اسم هدف التوفير' : 'Goal Name'}
        <input name="gname" required value="${goalTitle}" autocomplete="off">
      </label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label>${ar ? 'المبلغ المستهدف' : 'Target Amount'} (${M.t('cur')})
          <input name="gtarget" type="text" inputmode="numeric" required value="${g.target || 100000}">
        </label>
        <label>${ar ? 'المبلغ المدخر حالياً' : 'Saved So Far'} (${M.t('cur')})
          <input name="gsaved" type="text" inputmode="numeric" value="${g.saved || 0}">
        </label>
      </div>
      <div class="group" style="padding:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px"><span>${M.t('monthly')}</span><b id="gMon">${M.money(monthly)}</b></div>
        <input type="range" class="range" id="gRange" name="gmonthly" min="1000" max="100000" step="1000" value="${monthly}">
        <div class="muted small" style="margin-top:10px" id="gReach">${M.t('reachBy')(Math.max(0, Math.ceil(Math.max(0, target - (g.saved || 0)) / monthly)))}</div>
      </div>
      <button class="btn" type="submit">${M.ico('check', 18, 2.5)} ${M.t('save')}</button>
    </form>`, {
    onOpen: sh => {
      M.animateRings(sh);
      const r = sh.querySelector('#gRange');
      let _goalDebounce;
      const upd = () => {
        g.monthly = +r.value;
        r.style.setProperty('--p', ((r.value - 1000) / 99000 * 100) + '%');
        r.style.setProperty('--dirx', M.s.lang === 'ar' ? 'left' : 'right');
        sh.querySelector('#gMon').innerHTML = M.money(g.monthly);
        sh.querySelector('#gReach').textContent = M.t('reachBy')(Math.max(0, Math.ceil(Math.max(0, (g.target || 100000) - (g.saved || 0)) / Math.max(1, g.monthly))));
        if (M.api) {
          M.api.saveLocal(M.s);
          clearTimeout(_goalDebounce);
          _goalDebounce = setTimeout(() => {
            M.api.updateGoal({ monthly: g.monthly }).catch(() => {});
          }, 350);
        }
      };
      r.addEventListener('input', upd); upd();
    }
  });
};

M.saveGoalEdit = f => {
  const ar = M.s.lang === 'ar';
  const name = (f.gname.value || '').trim() || (ar ? 'هدف التوفير العائلي' : 'Family Savings Goal');
  const target = parseFloat(M.toWesternDigits(String(f.gtarget.value || '100000'))) || 100000;
  const saved = parseFloat(M.toWesternDigits(String(f.gsaved.value || '0'))) || 0;
  const monthly = parseFloat(M.toWesternDigits(String(f.gmonthly.value || '10000'))) || 10000;
  M.s.goal = { name: { ar: name, en: name }, target, saved, monthly };
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateGoal(M.s.goal).catch(() => {});
  }
  M.sheet.close();
  M.render();
  M.toast(`${M.ico('checkc', 16)} ${ar ? 'تم تحديث هدف التوفير' : 'Savings goal updated'}`);
};
