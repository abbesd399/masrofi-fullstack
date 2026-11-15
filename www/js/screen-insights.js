/* Tab 4 — AI Financial Coach: burn-rate forecast · AI upcoming obligations & oil predictor · category breakdown · price-hike guard · savings goal */
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
  const rep = M.getPaydaySmartReport ? M.getPaydaySmartReport() : null;
  const oil = rep ? rep.oil : M.getCarOilStatus();
  const g = s.goal || { name: { ar: '', en: '' }, target: 0, saved: 0, monthly: 0 };
  const hasGoal = Number(g.target) > 0;
  const target = Math.max(1, g.target || 100000);
  const monthly = Math.max(1, g.monthly || 10000);
  const gp = hasGoal ? Math.min(100, Math.round((g.saved || 0) / target * 100)) : 0;
  const monthsLeft = hasGoal ? Math.max(0, Math.ceil(Math.max(0, target - (g.saved || 0)) / monthly)) : 0;
  const goalTitle = (g.name && (g.name.ar || g.name.en)) ? M.L(g.name) : (ar ? 'هدف التوفير العائلي' : 'Family Savings Goal');
  const hikesList = s.hikes || [];
  const dupsList = s.dups || [];

  // Category Spending Breakdown
  const catTotals = {};
  for (const p of (s.purchases || [])) {
    const k = p.cat || 'groceries';
    catTotals[k] = (catTotals[k] || 0) + (Number(p.amount) || 0);
  }
  for (const bl of (s.bills || []).filter(x => x.paid)) {
    const k = bl.cat || 'utilities';
    catTotals[k] = (catTotals[k] || 0) + (Number(bl.amount) || 0);
  }
  const totalCatSpent = Object.values(catTotals).reduce((a, v) => a + v, 0);
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const catBreakdownHtml = sortedCats.length ? `
    <div class="card anim">
      <div class="sec-h"><h3>${ar ? 'توزيع المصاريف حسب الفئة' : 'Spending by Category'}</h3><span class="muted small priv">${M.money(totalCatSpent)}</span></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${sortedCats.map(([k, val]) => {
          const catObj = M.CATS[k] || M.CATS.groceries;
          const pct = totalCatSpent > 0 ? Math.round((val / totalCatSpent) * 100) : 0;
          return `<div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;margin-bottom:4px">
              <span style="display:inline-flex;align-items:center;gap:6px;font-weight:700"><i style="width:9px;height:9px;border-radius:50%;background:${catObj.c};display:inline-block"></i> ${M.L(catObj.n)}</span>
              <span class="priv"><b>${M.money(val)}</b> <span class="muted">(${pct}%)</span></span>
            </div>
            <div class="bar" style="height:6px"><i style="width:${pct}%;--bc:${catObj.c}"></i></div>
          </div>`;
        }).join('')}
      </div>
    </div>` : '';

  // AI Forecast Card (Next Oil Change + Next Bills)
  const allBillsWithCd = (s.bills || []).slice(0, 3).map(bl => ({ b: bl, cd: M.getBillCountdown(bl) }));
  const forecastCardHtml = `
    <div class="card tap anim" data-act="banner-open">
      <div class="sec-h">
        <h3>${ar ? 'توقعات الذكاء الاصطناعي للمواعيد القادمة' : 'AI Upcoming Dates & Oil Forecast'}</h3>
        <span class="badge info">AI</span>
      </div>
      <div class="list">
        <div class="row" style="padding:6px 0">
          <span class="tile" style="--c:#F59E0B;width:38px;height:38px">${M.ico('drop', 18)}</span>
          <div class="r-main">
            <div class="r-t">${ar ? 'موعد تغيير الزيت المتوقع (7,000 كم)' : 'Predicted 7,000 km Oil Change'}</div>
            <div class="r-s">${ar ? `📅 ${oil.predictedDate.ar} · والذي بعده عند ${M.fmt(oil.followingOil)} كم` : `📅 ${oil.predictedDate.en} · Next at ${M.fmt(oil.followingOil)} km`}</div>
          </div>
          <span class="badge ${oil.dueThisMonth ? 'warn' : 'safe'}">${oil.days} ${M.t('days')}</span>
        </div>
        ${allBillsWithCd.map(({ b: bl, cd }) => `
          <div class="row" style="padding:6px 0">
            ${M.tile(bl.cat, 38)}
            <div class="r-main">
              <div class="r-t">${M.L(bl.n)}</div>
              <div class="r-s">${ar ? `📅 الفاتورة القادمة: ${cd.nextBillDate.ar} (${cd.cycleLabel})` : `📅 Next bill: ${cd.nextBillDate.en} (${cd.cycleLabel})`}</div>
            </div>
            <span class="badge ${cd.daysLeft <= 5 && !bl.paid ? 'crit' : 'info'}">${cd.daysLeft} ${M.t('days')}</span>
          </div>`).join('')}
      </div>
    </div>`;

  const hikesSection = (hikesList.length || dupsList.length)
    ? `<div class="card tap anim" data-act="hikes">
        <div class="sec-h"><h3>${M.t('hikeT')}</h3><span class="badge crit"><span class="pulse"></span>${hikesList.length + dupsList.length}</span></div>
        ${hikesList.slice(0, 3).map(h => `<div class="hike">${M.tile('groceries', 38)}<div class="hk-n">${M.L(h.n)}<div class="hk-p"><span class="num">${M.fmt(h.was)}</span> <span class="arr">→</span> <span class="num">${M.fmt(h.now)}</span> <span class="cur-u">${M.t('cur')}</span></div></div>
          <span class="badge crit">${M.ico('trend', 12, 2.4)} +${Math.round((h.now - h.was) / Math.max(1, h.was) * 100)}%</span></div>`).join('')}
        ${dupsList[0] ? `<div class="hike"><span class="tile" style="--c:var(--warn);width:38px;height:38px">${M.ico('copy', 18)}</span><div class="hk-n">${M.t('dup')}<div class="hk-p">${M.L(dupsList[0].m)}</div></div><span class="badge warn">${ar ? 'مستبعد' : 'Excluded'}</span></div>` : ''}
      </div>`
    : `<div class="card tap anim" data-act="hikes">
        <div class="sec-h"><h3>${M.t('hikeT')}</h3><span class="badge safe">${M.ico('spark', 11, 2.4)} ${ar ? 'ذكاء اصطناعي نشط' : 'AI Active'}</span></div>
        <div class="muted small" style="line-height:1.5">${ar ? 'يراقب الذكاء الاصطناعي أسعار السلع والفواتير التي تدخلها أو تصورها بالكاميرا بمرور الوقت، وينبهك هنا تلقائياً فور ارتفاع سعر أي سلعة أو فاتورة.' : 'AI automatically tracks item and bill prices over time as you scan receipts or log purchases, alerting you whenever a price increases.'}</div>
      </div>`;

  const goalCard = hasGoal
    ? `<div class="card tap anim" data-act="goal">
        <div class="goal">
          <div class="ring">${M.ringSvg(gp, 'var(--primary)')}<b class="num">${gp}%</b></div>
          <div style="flex:1"><div class="muted small">${M.t('goalT')}</div><div style="font-size:17px;font-weight:700;margin:2px 0 4px;display:flex;align-items:center;gap:6px">${M.ico('piggy', 17)} ${goalTitle}</div>
            <div class="priv"><b>${M.money(g.saved || 0)}</b> <span class="muted small">/ ${M.money(target)}</span></div>
            <div class="muted small" style="margin-top:4px">${M.t('reachBy')(monthsLeft)}</div></div>
          <span class="muted">${M.ico('pen', 16)}</span>
        </div>
      </div>`
    : `<div class="card tap anim" data-act="goal">
        <div style="display:flex;align-items:center;gap:12px">
          <span class="tile" style="--c:var(--primary)">${M.ico('piggy', 21)}</span>
          <div style="flex:1">
            <div style="font-size:14.5px;font-weight:700">${ar ? 'هدف ادخار عائلي (اختياري)' : 'Family Savings Goal (Optional)'}</div>
            <div class="muted small" style="margin-top:2px">${ar ? 'اضغط لتحديد هدف توفير اختياري ومتابعة تقدمك متى أردت' : 'Tap to set an optional savings goal whenever you want'}</div>
          </div>
          <span class="btn sm tonal">${M.ico('plus', 14, 2.5)} <span>${ar ? 'إضافة' : 'Set'}</span></span>
        </div>
      </div>`;

  return `
  <div class="ins-head anim burn" data-act="burn">
    <div class="ih-t" style="display:flex;gap:6px;align-items:center">${M.ico('spark', 15, 2)} ${M.t('insHead')} · ${M.t('burn')}</div>
    <div class="ih-b">${b.ok ? M.t('burnOk') : M.t('burnBad')(b.runout)}</div>
    <div class="burn-chart" style="margin-top:12px">${M.burnSvg()}</div>
    <div class="legend" style="color:rgba(255,255,255,.82)"><span><i style="background:#6EE7B7"></i>${M.t('actual')}</span><span><i style="background:rgba(255,255,255,.5)"></i>${M.t('ideal')}</span><span><i style="background:#FCD34D"></i>${M.t('forecast')}</span></div>
  </div>
  ${forecastCardHtml}
  ${catBreakdownHtml}
  ${hikesSection}
  ${goalCard}
  <button type="button" class="btn tonal anim" data-act="share-month-report">
    ${M.ico('share', 16, 2)} <span>${ar ? 'مشاركة ملخص وميزانية الشهر للعائلة 📋' : 'Share Monthly Family Summary Report 📋'}</span>
  </button>`;
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
    return M.sheet.open(M.t('hikeT'), `<div class="empty">${M.illu('done')}<h4>${ar ? 'لا توجد زيادات أسعار مسجلة حتى الآن' : 'No price hikes detected yet'}</h4><p>${ar ? 'يقوم الذكاء الاصطناعي بحفظ أسعار مشترياتك وفواتيرك تلقائياً ومقارنتها مع مرور الوقت لتنبيهك عند غلاء أي سلعة.' : 'AI automatically remembers your item and bill prices over time and alerts you whenever a price rises.'}</p></div>`);
  }
  M.sheet.open(M.t('hikeT'), `
    <div class="group">${hikesList.map(h => `<div class="hike">${M.tile('groceries', 38)}<div class="hk-n">${M.L(h.n)}<div class="hk-p"><span>${M.t('vsLast')}</span> <span class="num">${M.fmt(h.was)}</span> <span class="arr">→</span> <span class="num">${M.fmt(h.now)}</span> <span class="cur-u">${M.t('cur')}</span></div></div>
      <span class="badge crit">+${Math.round((h.now - h.was) / Math.max(1, h.was) * 100)}%</span></div>`).join('')}</div>
    ${dupsList[0] ? `<div class="alert-box" style="--bc:var(--warn)"><span class="ab-i">${M.ico('copy', 20)}</span><div>${M.t('dupWarn')} — ${M.L(dupsList[0].m)} (${M.dateStr(dupsList[0].d)})</div></div>` : ''}`);
};

M.acts.goal = () => {
  const ar = M.s.lang === 'ar';
  const g = M.s.goal || { name: { ar: '', en: '' }, target: 0, saved: 0, monthly: 0 };
  const hasGoal = Number(g.target) > 0;
  const target = Math.max(1, g.target || 100000);
  const monthly = Math.max(1, g.monthly || 10000);
  const gp = hasGoal ? Math.min(100, Math.round((g.saved || 0) / target * 100)) : 0;
  const goalTitle = (g.name && (g.name.ar || g.name.en)) ? M.L(g.name) : (ar ? 'صندوق التوفير العائلي' : 'Family Savings Fund');

  M.sheet.open(M.t('goalT'), `
    ${hasGoal ? `<div style="text-align:center"><div class="goal" style="justify-content:center"><div class="ring" style="width:110px;height:110px">${M.ringSvg(gp, 'var(--primary)')}<b class="num" style="font-size:22px">${gp}%</b></div></div>
      <div style="font-size:17px;font-weight:700;margin-top:6px">${goalTitle}</div><div class="muted priv">${M.money(g.saved || 0)} / ${M.money(target)}</div></div>` : ''}
    <form class="manual-form" data-form="goal-edit">
      <label>${ar ? 'اسم هدف التوفير (اختياري)' : 'Goal Name (Optional)'}
        <input name="gname" required placeholder="${ar ? 'مثال: عطلة الصيف / صندوق الطوارئ' : 'e.g. Emergency Fund'}" value="${hasGoal ? goalTitle : ''}" autocomplete="off">
      </label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label>${ar ? 'المبلغ المستهدف' : 'Target Amount'} (${M.t('cur')})
          <input name="gtarget" type="text" inputmode="numeric" required placeholder="100000" value="${hasGoal ? g.target : ''}">
        </label>
        <label>${ar ? 'المبلغ المدخر حالياً' : 'Saved So Far'} (${M.t('cur')})
          <input name="gsaved" type="text" inputmode="numeric" placeholder="0" value="${hasGoal ? (g.saved || 0) : 0}">
        </label>
      </div>
      <div class="group" style="padding:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px"><span>${M.t('monthly')}</span><b id="gMon">${M.money(monthly)}</b></div>
        <input type="range" class="range" id="gRange" name="gmonthly" min="1000" max="100000" step="1000" value="${monthly}">
        <div class="muted small" style="margin-top:10px" id="gReach">${M.t('reachBy')(Math.max(0, Math.ceil(Math.max(0, target - (g.saved || 0)) / monthly)))}</div>
      </div>
      <button class="btn" type="submit">${M.ico('check', 18, 2.5)} <span>${M.t('save')}</span></button>
      ${hasGoal ? `<button type="button" class="btn ghost" data-act="goal-clear" style="margin-top:4px;color:var(--crit)">${M.ico('trash', 15, 2)} <span>${ar ? 'إلغاء هدف الادخار' : 'Clear Savings Goal'}</span></button>` : ''}
    </form>`, {
    onOpen: sh => {
      M.animateRings(sh);
      const r = sh.querySelector('#gRange');
      let _goalDebounce;
      const upd = () => {
        const curT = Number(sh.querySelector('input[name="gtarget"]')?.value) || target;
        const curS = Number(sh.querySelector('input[name="gsaved"]')?.value) || (g.saved || 0);
        const curM = +r.value;
        r.style.setProperty('--p', ((curM - 1000) / 99000 * 100) + '%');
        r.style.setProperty('--dirx', M.s.lang === 'ar' ? 'left' : 'right');
        sh.querySelector('#gMon').innerHTML = M.money(curM);
        sh.querySelector('#gReach').textContent = M.t('reachBy')(Math.max(0, Math.ceil(Math.max(0, curT - curS) / Math.max(1, curM))));
        if (hasGoal && M.api) {
          g.monthly = curM;
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

M.acts['goal-clear'] = () => {
  const ar = M.s.lang === 'ar';
  M.s.goal = { name: { ar: '', en: '' }, target: 0, saved: 0, monthly: 0 };
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateGoal(M.s.goal).catch(() => {});
  }
  M.sheet.close();
  M.render();
  M.toast(`${M.ico('trash', 15, 2)} ${ar ? 'تم إلغاء هدف الادخار' : 'Savings goal cleared'}`);
};

M.saveGoalEdit = f => {
  const ar = M.s.lang === 'ar';
  const name = (f.gname.value || '').trim() || (ar ? 'هدف التوفير العائلي' : 'Family Savings Goal');
  const target = parseFloat(M.toWesternDigits(String(f.gtarget.value || '0'))) || 0;
  const saved = parseFloat(M.toWesternDigits(String(f.gsaved.value || '0'))) || 0;
  const monthly = parseFloat(M.toWesternDigits(String(f.gmonthly.value || '10000'))) || 10000;
  if (!(target > 0)) return;
  M.s.goal = { name: { ar: name, en: name }, target, saved, monthly };
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateGoal(M.s.goal).catch(() => {});
  }
  M.sheet.close();
  M.render();
  M.toast(`${M.ico('checkc', 16)} ${ar ? 'تم حفظ هدف التوفير' : 'Savings goal saved'}`);
};

M.acts['share-month-report'] = async () => {
  const s = M.s, ar = s.lang === 'ar', c = M.calc(), oil = M.getCarOilStatus();
  const unpaid = (s.bills || []).filter(b => !b.paid);
  const lines = ar ? [
    `📊 ملخص محفظة العائلة (${M.L(s.familyName || { ar: 'مصروفي', en: 'Masrofi' })})`,
    `• الراتب الشهري: ${M.fmt(s.salary)} د.ج`,
    `• إجمالي المصروف حتى الآن: ${M.fmt(c.spent)} د.ج`,
    `• المحجوز للفواتير والالتزامات: ${M.fmt(c.reserved)} د.ج (${unpaid.length} فواتير غير مسددة)`,
    `• الصافي الحر المتبقي للصرف: ${M.fmt(c.spendable)} د.ج (${M.fmt(c.daily)} د.ج/يوم)`,
    `• عداد السيارة: ${M.fmt(oil.odo)} كم (تغيير الزيت القادم عند ${M.fmt(oil.nextOil)} كم · متوقع يوم ${oil.predictedDate.ar})`
  ] : [
    `📊 Family Wallet Summary (${M.L(s.familyName || { ar: 'Masrofi', en: 'Masrofi' })})`,
    `• Monthly Salary: ${M.fmt(s.salary)} DZD`,
    `• Total Spent: ${M.fmt(c.spent)} DZD`,
    `• Reserved for Bills & Oil: ${M.fmt(c.reserved)} DZD`,
    `• Safe Spendable Balance: ${M.fmt(c.spendable)} DZD (${M.fmt(c.daily)} DZD/day)`,
    `• Car Odometer: ${M.fmt(oil.odo)} km (Next oil at ${M.fmt(oil.nextOil)} km · Est. ${oil.predictedDate.en})`
  ];
  const text = lines.join('\n');
  if (navigator.share) {
    try { await navigator.share({ title: 'Masrofi · مصروفي', text }); return; } catch {}
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
  M.toast(`${M.ico('checkc', 16)} ${ar ? 'تم نسخ ملخص الشهر للمشاركة' : 'Monthly summary copied to clipboard'}`);
};
