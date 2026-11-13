/* Tab 4 — AI Financial Coach: burn-rate forecast · price-hike & duplicate guard · savings goal */
M.burnData = () => {
  const s = M.s, c = M.calc(), cum = [0];
  for (let d = 1; d <= s.day; d++) {
    const v = s.purchases.filter(p => p.day === d).reduce((a, p) => a + p.amount, 0) + s.bills.filter(b => b.paid && b.paidDay === d).reduce((a, b) => a + b.amount, 0);
    cum.push(cum[d - 1] + v);
  }
  const pace = c.spentPurch / s.day;
  const runout = pace ? s.day + c.spendable / pace : 99;
  return { cum, pace, runout: Math.floor(runout), ok: runout >= s.monthDays };
};
M.burnSvg = () => {
  const s = M.s, { cum, pace } = M.burnData(), W = 300, H = 120, c = M.calc();
  const endF = cum[s.day] + pace * (s.monthDays - s.day) + c.reserved;
  const max = Math.max(s.salary, endF) * 1.05;
  const x = d => d / s.monthDays * W, y = v => H - v / max * (H - 10);
  const act = cum.map((v, d) => `${x(d)},${y(v)}`).join(' ');
  return `<svg class="burn-chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs>
      <linearGradient id="burnArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6EE7B7" stop-opacity=".38"/>
        <stop offset="1" stop-color="#6EE7B7" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <line x1="0" x2="${W}" y1="${y(s.salary)}" y2="${y(s.salary)}" stroke="#FFA59B" stroke-width="1.2" stroke-dasharray="4 4" opacity=".85"/>
    <line x1="0" y1="${H}" x2="${W}" y2="${y(s.salary)}" stroke="rgba(255,255,255,.4)" stroke-width="1.5" stroke-dasharray="2 4"/>
    <polygon points="0,${H} ${act} ${x(s.day)},${H}" fill="url(#burnArea)"/>
    <polyline class="burn-line" points="${act}" fill="none" stroke="#6EE7B7" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="${x(s.day)}" y1="${y(cum[s.day])}" x2="${W}" y2="${y(endF)}" stroke="#FCD34D" stroke-width="2.5" stroke-dasharray="5 5"/>
    <circle cx="${x(s.day)}" cy="${y(cum[s.day])}" r="5" fill="#fff" stroke="#10B981" stroke-width="2.8"/>
  </svg>`;
};
M.ringSvg = (pct, col) => {
  const r = 38, C = 2 * Math.PI * r;
  return `<svg viewBox="0 0 88 88"><circle cx="44" cy="44" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="8.5"/>
    <circle class="g-val ring-anim" cx="44" cy="44" r="${r}" fill="none" stroke="${col}" stroke-width="8.5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-target="${C * (1 - pct / 100)}" style="transition:stroke-dashoffset .85s var(--spring)"/></svg>`;
};
M.animateRings = (root = document) => {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    root.querySelectorAll('.ring-anim').forEach(el => {
      el.style.strokeDashoffset = el.dataset.target;
    });
  }));
};

M.screens.insights = () => {
  const s = M.s, b = M.burnData(), g = s.goal, gp = Math.round(g.saved / g.target * 100);
  return `
  <div class="ins-head anim burn" data-act="burn">
    <div class="ih-t" style="display:flex;gap:6px;align-items:center">${M.ico('spark', 15, 2)} ${M.t('insHead')} · ${M.t('burn')}</div>
    <div class="ih-b">${b.ok ? M.t('burnOk') : M.t('burnBad')(b.runout)}</div>
    <div class="burn-chart" style="margin-top:12px">${M.burnSvg()}</div>
    <div class="legend" style="color:rgba(255,255,255,.82)"><span><i style="background:#6EE7B7"></i>${M.t('actual')}</span><span><i style="background:rgba(255,255,255,.5)"></i>${M.t('ideal')}</span><span><i style="background:#FCD34D"></i>${M.t('forecast')}</span></div>
  </div>
  <div class="card tap anim" data-act="hikes">
    <div class="sec-h"><h3>${M.t('hikeT')}</h3><span class="badge crit"><span class="pulse"></span>${s.hikes.length + s.dups.length}</span></div>
    ${s.hikes.slice(0, 2).map(h => `<div class="hike">${M.tile('groceries', 38)}<div class="hk-n">${M.L(h.n)}<div class="hk-p"><span class="num">${M.fmt(h.was)}</span> <span class="arr">→</span> <span class="num">${M.fmt(h.now)}</span> <span class="cur-u">${M.t('cur')}</span></div></div>
      <span class="badge crit">${M.ico('trend', 12, 2.4)} +${Math.round((h.now - h.was) / h.was * 100)}%</span></div>`).join('')}
    <div class="hike"><span class="tile" style="--c:var(--warn);width:38px;height:38px">${M.ico('copy', 18)}</span><div class="hk-n">${M.t('dup')}<div class="hk-p">${M.L(s.dups[0].m)}</div></div><span class="badge warn">${M.s.lang === 'ar' ? 'مستبعد' : 'Excluded'}</span></div>
  </div>
  <div class="card tap anim" data-act="goal">
    <div class="goal">
      <div class="ring">${M.ringSvg(gp, 'var(--primary)')}<b class="num">${gp}%</b></div>
      <div style="flex:1"><div class="muted small">${M.t('goalT')}</div><div style="font-size:17px;font-weight:700;margin:2px 0 4px;display:flex;align-items:center;gap:6px">${M.ico('plane', 17)} ${M.t('goalName')}</div>
        <div class="priv"><b>${M.money(g.saved)}</b> <span class="muted small">/ ${M.money(g.target)}</span></div>
        <div class="muted small" style="margin-top:4px">${M.t('reachBy')(Math.ceil((g.target - g.saved) / g.monthly))}</div></div>
      <span class="muted">${M.ico('chev', 18)}</span>
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
    </div>
    <p class="muted small" style="line-height:1.6">${M.s.lang === 'ar' ? 'نصيحة: تقليل مشتريات المنزل غير الضرورية بـ 600 د.ج يومياً يكفي للوصول للراتب بأمان.' : 'Tip: trimming ~600 DZD/day from non-essential home purchases gets you safely to payday.'}</p>`);
};
M.acts.hikes = () => {
  const s = M.s;
  M.sheet.open(M.t('hikeT'), `
    <div class="group">${s.hikes.map(h => `<div class="hike">${M.tile('groceries', 38)}<div class="hk-n">${M.L(h.n)}<div class="hk-p"><span>${M.t('vsLast')}</span> <span class="num">${M.fmt(h.was)}</span> <span class="arr">→</span> <span class="num">${M.fmt(h.now)}</span> <span class="cur-u">${M.t('cur')}</span></div></div>
      <span class="badge crit">+${Math.round((h.now - h.was) / h.was * 100)}%</span></div>`).join('')}</div>
    <div class="alert-box" style="--bc:var(--warn)"><span class="ab-i">${M.ico('copy', 20)}</span><div>${M.t('dupWarn')} — ${M.L(s.dups[0].m)} (${M.dateStr(s.dups[0].d)})</div></div>
    <div class="ai-pill"><span class="spark">${M.ico('spark', 16, 2)}</span><span>${s.lang === 'ar' ? 'بديل أرخص: سميد 10 كغ في أونو بـ 1,250 د.ج (توفير 11%).' : 'Cheaper option: Semolina 10kg at Uno for 1,250 DZD (save 11%).'}</span></div>`);
};
M.acts.goal = () => {
  const g = M.s.goal, gp = Math.round(g.saved / g.target * 100);
  M.sheet.open(M.t('goalT'), `
    <div style="text-align:center"><div class="goal" style="justify-content:center"><div class="ring" style="width:130px;height:130px">${M.ringSvg(gp, 'var(--primary)')}<b class="num" style="font-size:26px">${gp}%</b></div></div>
      <div style="font-size:18px;font-weight:700;margin-top:8px">${M.t('goalName')}</div><div class="muted priv">${M.money(g.saved)} / ${M.money(g.target)}</div></div>
    <div class="group" style="padding:16px">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px"><span>${M.t('monthly')}</span><b id="gMon">${M.money(g.monthly)}</b></div>
      <input type="range" class="range" id="gRange" min="5000" max="60000" step="1000" value="${g.monthly}">
      <div class="muted small" style="margin-top:12px" id="gReach">${M.t('reachBy')(Math.ceil((g.target - g.saved) / g.monthly))}</div>
    </div>`, {
    onOpen: sh => {
      M.animateRings(sh);
      const r = sh.querySelector('#gRange');
      let _goalDebounce;
      const upd = () => {
        g.monthly = +r.value;
        r.style.setProperty('--p', ((r.value - 5000) / 55000 * 100) + '%');
        r.style.setProperty('--dirx', M.s.lang === 'ar' ? 'left' : 'right');
        sh.querySelector('#gMon').innerHTML = M.money(g.monthly);
        sh.querySelector('#gReach').textContent = M.t('reachBy')(Math.ceil((g.target - g.saved) / g.monthly));
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
