/* Tab 1 — Home dashboard: alert banner · hero salary card · family strip */
M.screens = M.screens || {};
M.acts = M.acts || {};

M.waves = () => `
  <div class="hero-bg" aria-hidden="true">
    <svg class="waves" viewBox="0 0 400 100" preserveAspectRatio="none">
      <path d="M0 64 C 90 38 170 88 260 62 S 355 40 400 58 V100 H0z" fill="rgba(255,255,255,.05)"/>
      <path d="M0 82 C 110 62 190 98 280 78 S 365 68 400 82 V100 H0z" fill="rgba(0,0,0,.1)"/>
    </svg>
    <div class="hero-sheen"></div>
  </div>`;

M.screens.home = () => {
  const s = M.s, c = M.calc(), unpaid = s.bills.filter(b => !b.paid);
  const ins = s.bills.find(b => b.id === 'ins');
  const last = s.purchases[0], lm = M.member(last.member);
  const banner = s.bannerHidden
    ? `<button type="button" class="banner-mini anim" data-act="banner-show">${M.ico('bell', 15)} ${M.t('alertMini')} · ${unpaid.length}</button>`
    : `<div class="banner anim" data-act="banner-open" id="banner">
        <span class="b-ico">${M.ico('bell', 18, 2)}</span>
        <div class="b-txt"><b>${M.t('alertTitle')}</b>${M.t('alertBody')(unpaid.length, ins && !ins.paid ? 15 : unpaid[0]?.due ?? '—')}</div>
        <button type="button" class="b-x" data-act="banner-hide" aria-label="dismiss">${M.ico('close', 14, 2.4)}</button></div>`;
  return `
  ${banner}
  <div class="hero state-${c.state} anim" data-act="hero" data-tilt>
    ${M.waves()}
    <div class="h-top">
      <span class="h-date-pill">${M.ico('calendar', 13, 2)} <span>${M.t('november')} · ${M.t('daysLeft')(c.daysLeft)}</span></span>
      <button type="button" class="eye" data-act="privacy" aria-label="privacy">${M.ico(s.privacy ? 'eyeOff' : 'eye', 17, 2)}</button>
    </div>
    <div class="h-mid">
      <div class="h-bal">
        <div class="h-label">${M.t('remaining')}</div>
        <div class="h-big priv"><span class="num" id="bigBal" data-from="${M.prevBal ?? 0}">${M.fmt(c.spendable)}</span><small>${M.t('cur')}</small></div>
        <div class="h-salary priv">${M.t('salary')}: ${M.money(s.salary)}</div>
      </div>
      ${M.gauge(c.pct, c.state, M.t('st' + c.state[0].toUpperCase() + c.state.slice(1)))}
    </div>
    <div class="h-stats">
      <div class="stat">
        <div class="st-l"><span class="st-ic">${M.ico('piggy', 14, 2)}</span> <span>${M.t('reserved')}</span></div>
        <div class="st-v priv">${M.money(c.reserved)}</div>
      </div>
      <div class="stat">
        <div class="st-l"><span class="st-ic">${M.ico('spark', 14, 2)}</span> <span>${M.t('daily')}</span></div>
        <div class="st-v priv"><span class="num">${M.fmt(c.daily)}</span><small style="font-size:11.5px;opacity:.8"> ${M.t('cur')}${M.t('perDay')}</small></div>
      </div>
    </div>
  </div>
  <div class="card fam-strip anim">
    <div class="sec-h"><h3>${M.t('family')}</h3><span class="badge safe"><span class="pulse"></span>${M.t('live')}</span></div>
    <div class="fam-avs">
      ${M.MEMBERS.map(m => `<div class="fam-av" data-act="member" data-id="${m.id}">
        <span class="av has-char ring" style="--avc:${m.c}">${M.charSvg(m.id)}${m.id === last.member ? '<span class="live"></span>' : ''}</span>
        <span>${m.id === 'abu' ? (M.s.lang === 'ar' ? 'أنا' : 'Me') : m.id === 'umm' ? (M.s.lang === 'ar' ? 'أم خالد' : 'Mom') : M.L(m.n)}</span>
      </div>`).join('')}
      <div class="fam-av fam-add" data-act="add-purch-open"><span class="av">${M.ico('plus', 18)}</span><span>${M.t('add')}</span></div>
    </div>
    <div class="ticker" data-act="receipt" data-id="${last.id}">
      ${M.avatar(last.member, 'sm')}
      <span class="tk-txt ${M.tickerNew ? 'new' : ''}"><b>${M.L(lm.n)}</b> · ${M.L(last.merchant)} · <span class="priv">${M.moneyNeg(last.amount)}</span></span>
      <span class="muted small" style="flex:none">${last.time}</span>
    </div>
  </div>`;
};

M.afterHome = () => {
  M.animateGauge();
  const el = document.getElementById('bigBal');
  if (el) { const to = M.calc().spendable; M.countUp(el, to); M.prevBal = to; }
  M.tickerNew = false;
};

/* ── home actions & sheets ── */
M.acts['banner-hide'] = (el, ev) => { ev.stopPropagation(); M.s.bannerHidden = true; M.render(); };
M.acts['banner-show'] = () => { M.s.bannerHidden = false; M.render(); };
M.acts['banner-open'] = () => {
  const unpaid = M.s.bills.filter(b => !b.paid).sort((a, b) => a.due - b.due);
  M.sheet.open(M.t('alertTitle'), `
    <div class="alert-box" style="--bc:var(--warn)"><span class="ab-i">${M.ico('bell', 20)}</span><div>${M.t('alertBody')(unpaid.length, 15)}</div></div>
    <div class="group">${unpaid.map(b => `<div class="row" data-act="bill" data-id="${b.id}">${M.tile(b.cat)}
      <div class="r-main"><div class="r-t">${M.L(b.n)}</div>
        <div class="r-s"><span>${M.t('dueOn')(M.dateStr(b.due))}</span> · <span class="b-kind ${b.kind === 'var' ? 'var' : 'fixed'}">${M.t(b.kind === 'var' ? 'billVar' : 'billFixed')}</span></div></div>
      <div class="r-end"><div class="r-amt priv">${M.money(b.amount)}</div><span class="badge info">${M.t('reservedAuto')}</span></div></div>`).join('')}</div>
    <button type="button" class="btn" data-act="goto-bills">${M.t('viewBills')}</button>`);
};
M.acts['goto-bills'] = () => { M.sheet.close(); M.go('bills'); };
M.acts.privacy = (el, ev) => {
  ev.stopPropagation(); M.s.privacy = !M.s.privacy;
  M.phone().classList.toggle('blurred', M.s.privacy);
  el.innerHTML = M.ico(M.s.privacy ? 'eyeOff' : 'eye', 17, 2);
  M.replayAnim(el, 'bump', 420);
  M.toast(M.t(M.s.privacy ? 'privacyOn' : 'privacyOff'));
};
M.acts['toast-add'] = () => M.toast('＋ ' + (M.s.lang === 'ar' ? 'تم إرسال رابط دعوة للعائلة' : 'Family invite link sent'));
M.acts.hero = () => {
  const s = M.s, c = M.calc(), col = { safe: 'var(--safe)', warn: 'var(--warn)', crit: 'var(--crit)' }[c.state];
  M.sheet.open(M.t('breakdown'), `
    <div class="alert-box" style="--bc:${col}"><span class="ab-i">${M.ico(c.state === 'safe' ? 'checkc' : 'alert', 20)}</span><div><b>${M.t('st' + c.state[0].toUpperCase() + c.state.slice(1))}</b> — ${M.t(c.state + 'Msg')}</div></div>
    <div class="group priv">
      <div class="kv"><span>${M.t('salary')}</span><b style="display:flex;align-items:center;gap:6px">${M.money(s.salary)} <button type="button" class="inline-edit-btn" data-act="edit-salary">${M.ico('pen', 13, 2)}</button></b></div>
      <div class="kv"><span>${M.t('spent')}</span><b>${M.moneyNeg(c.spent)}</b></div>
      <div class="kv"><span>${M.t('reserved')}</span><b style="color:var(--warn)">${M.money(c.reserved)}</b></div>
      <div class="kv"><span>${M.t('trueBal')}</span><b style="color:var(--primary);font-size:18px">${M.money(c.spendable)}</b></div>
      <div class="kv"><span>${M.t('daily')}</span><b>${M.money(c.daily)}</b></div>
    </div>
    <div><div class="sec-h"><h3>${M.t('upcoming')}</h3></div><div class="group">
      ${s.bills.filter(b => !b.paid).map(b => `<div class="row" data-act="bill" data-id="${b.id}">${M.tile(b.cat, 38)}<div class="r-main"><div class="r-t">${M.L(b.n)}</div><div class="r-s"><span>${M.t('dueOn')(M.dateStr(b.due))}</span> · <span class="b-kind ${b.kind === 'var' ? 'var' : 'fixed'}">${M.t(b.kind === 'var' ? 'billVar' : 'billFixed')}</span></div></div><div class="r-amt priv">${M.money(b.amount)}</div></div>`).join('')}
    </div></div>`);
};

M.acts['edit-salary'] = () => {
  M.sheet.open(M.t('editSalary'), `<form class="manual-form" data-form="salary-edit">
    <label>${M.t('salary')} (${M.t('cur')})<input name="sal" type="text" inputmode="numeric" required value="${M.s.salary}"></label>
    <button class="btn" type="submit">${M.ico('check', 18, 2.5)} ${M.t('save')}</button>
  </form>`);
};

M.saveSalaryEdit = f => {
  const raw = typeof f.sal.value === 'string' ? M.toWesternDigits(f.sal.value) : f.sal.value;
  const v = parseFloat(raw);
  if (!(v > 0)) return;
  M.s.salary = v;
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateSalary(v).catch(() => {});
  }
  M.sheet.close();
  M.render();
  M.checkThreshold();
  M.toast(`${M.ico('checkc', 16, 2)} ${M.t('salaryUpdated')}: ${M.fmt(v)} ${M.t('cur')}`);
};

M.acts.member = el => {
  const m = M.member(el.dataset.id), list = M.s.purchases.filter(p => p.member === m.id);
  const total = list.reduce((a, p) => a + p.amount, 0);
  M.sheet.open(M.L(m.n), `
    <div class="sheet-profile">
      ${M.avatar(m.id, 'lg ring')}
      <div>
        <div class="muted small">${M.L(m.role)}</div>
        <div style="font-size:22px;font-weight:800;margin:2px 0" class="priv">${M.money(total)}</div>
        <div class="muted small">${M.t('spentBy')} · ${list.length} ${M.t('purchases')}</div>
      </div>
    </div>
    <div class="group">${list.map(M.purchaseRow).join('') || `<div class="empty">${M.illu('cart')}<p>—</p></div>`}</div>`);
};

M.purchaseRow = p => `<div class="row" data-act="receipt" data-id="${p.id}">${M.tile(p.cat)}
  <div class="r-main">
    <div class="r-t">${M.L(p.merchant)}</div>
    <div class="r-s">${M.avatar(p.member, 'xs')} <span class="r-s-txt">${M.L(M.member(p.member).n)} · ${M.dayLabel(p.day)} ${p.time}</span>${p.scanned ? `<span class="scan-tag" title="Scanned">${M.ico('scan', 11, 2)}</span>` : ''}</div>
  </div>
  <div class="r-end"><div class="r-amt priv">${M.moneyNeg(p.amount)}</div></div></div>`;

M.acts.receipt = el => {
  const p = M.s.purchases.find(x => x.id == el.dataset.id); if (!p) return;
  const m = M.member(p.member);
  M.sheet.open(M.t('receipt'), `
    <div style="display:flex;gap:14px;align-items:center">${M.tile(p.cat, 52)}
      <div><div style="font-size:18px;font-weight:700">${M.L(p.merchant)}</div><div class="muted small">${M.L(M.CATS[p.cat].n)} · ${M.dayLabel(p.day)} ${p.time}</div></div></div>
    <div class="group">${p.items.map(it => `<div class="kv"><span>${M.L(it.n)} <span class="muted">×${it.q}</span></span><b class="priv">${M.money(it.p * it.q)}</b></div>`).join('')}
      <div class="kv"><span><b>${M.t('total')}</b></span><b style="font-size:18px" class="priv">${M.moneyNeg(p.amount)}</b></div></div>
    <div class="group"><div class="kv"><span>${M.t('scannedBy')}</span><span style="display:flex;gap:8px;align-items:center;font-weight:600">${M.avatar(m.id, 'sm')}${M.L(m.n)}</span></div></div>
    <div style="margin-top:6px">
      <button type="button" class="btn tonal" data-act="purch-del" data-id="${p.id}" style="color:var(--crit);background:color-mix(in srgb,var(--crit) 12%,transparent)">
        ${M.ico('trash', 16, 2)} <span>${M.s.lang === 'ar' ? 'حذف هذه العملية' : 'Delete transaction'}</span>
      </button>
    </div>`);
};

M.acts['purch-del'] = el => {
  const id = el.dataset.id;
  M.s.purchases = M.s.purchases.filter(p => p.id != id);
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.deletePurchase(id).catch(() => {});
  }
  M.sheet.close();
  M.render();
  M.checkThreshold();
  M.toast(`${M.ico('trash', 15, 2)} ${M.s.lang === 'ar' ? 'تم حذف العملية' : 'Transaction deleted'}`);
};
