/* Tab 2 — Bills & Car Hub (Fixed vs Variable Bills + Smart Customizable Car Tracker) */
M.carSvg = () => `<svg class="car-svg" viewBox="0 0 250 105">
  <defs>
    <linearGradient id="cb" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F1F5F9"/>
      <stop offset=".45" stop-color="#94A3B8"/>
      <stop offset="1" stop-color="#334155"/>
    </linearGradient>
    <linearGradient id="cw" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#38BDF8" stop-opacity=".95"/>
      <stop offset=".6" stop-color="#0284C7" stop-opacity=".75"/>
      <stop offset="1" stop-color="#0F172A" stop-opacity=".95"/>
    </linearGradient>
    <radialGradient id="cGlow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#38BDF8" stop-opacity=".45"/>
      <stop offset="1" stop-color="#38BDF8" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="125" cy="92" rx="104" ry="8" fill="#000" opacity=".42"/>
  <ellipse cx="32" cy="66" rx="22" ry="12" fill="url(#cGlow)"/>
  <path d="M18 70c0-10 6-16 18-18l34-6c12-14 26-22 48-22h30c18 0 30 8 42 20l26 6c10 2 14 8 14 18v6c0 4-3 6-6 6H24c-4 0-6-3-6-6z" fill="url(#cb)"/>
  <path d="M76 46c10-11 22-17 40-17h26c13 0 22 5 31 15l3 3H76z" fill="url(#cw)"/>
  <path d="M128 29v18" stroke="#E2E8F0" stroke-width="2.5" opacity=".8"/>
  <path d="M36 56h156" stroke="#fff" stroke-width="1" opacity=".35"/>
  <path d="M21 63h15" stroke="#FEF08A" stroke-width="4" stroke-linecap="round"/>
  <path d="M206 59h16" stroke="#FB7185" stroke-width="4" stroke-linecap="round"/>
  <circle cx="64" cy="80" r="15.5" fill="#0F172A" stroke="#475569" stroke-width="1.5"/>
  <circle cx="64" cy="80" r="8" fill="#CBD5E1"/><circle cx="64" cy="80" r="3" fill="#0F172A"/>
  <circle cx="188" cy="80" r="15.5" fill="#0F172A" stroke="#475569" stroke-width="1.5"/>
  <circle cx="188" cy="80" r="8" fill="#CBD5E1"/><circle cx="188" cy="80" r="3" fill="#0F172A"/>
</svg>`;

M.billRow = b => {
  const isVar = b.kind === 'var';
  const kindBadge = `<span class="b-kind ${isVar ? 'var' : 'fixed'}">${M.ico(isVar ? 'bolt' : 'shield', 10.5, 2.2)} ${M.t(isVar ? 'billVar' : 'billFixed')}</span>`;
  const dueSoon = !b.paid && (b.due - M.s.day <= 5);
  return `<div class="row ${b.paid ? 'paid' : ''} ${b.id === M.freshBillId ? 'fresh' : ''}" data-act="bill" data-id="${b.id}">${M.tile(b.cat)}
  <div class="r-main">
    <div class="r-t">${M.L(b.n)}</div>
    <div class="r-s">
      ${kindBadge}
      <span style="${dueSoon ? 'color:var(--warn);font-weight:600' : ''}">${b.paid ? M.t('paidOn')(M.dateStr(b.paidDay)) : M.t('dueOn')(M.dateStr(b.due))}</span>
      ${b.scanned ? `<span class="scan-tag" title="Scanned">${M.ico('scan', 11, 2)}</span>` : ''}
    </div>
  </div>
  <div class="r-end">
    <div class="r-amt priv" style="margin-bottom:4px;display:flex;align-items:center;justify-content:flex-end;gap:4px">
      ${isVar && !b.paid ? `<span class="var-edit-ic" title="${M.t('editBillAmt')}">${M.ico('pen', 11.5, 2)}</span>` : ''}
      ${M.money(b.amount)}
    </div>
    ${b.paid ? `<span class="badge safe">${M.ico('check', 11, 3)} ${M.t('paidL')}</span>` : `<button type="button" class="paid-btn" data-act="pay" data-id="${b.id}">${M.t('markPaid')}</button>`}
  </div></div>`;
};

M.billsListCardHtml = () => {
  const s = M.s, flt = s.billFilter || 'all';
  const filtered = (s.bills || []).filter(b => flt === 'all' || (b.kind || 'fixed') === flt);
  const unpaid = filtered.filter(b => !b.paid).sort((a, b) => a.due - b.due);
  const paid = filtered.filter(b => b.paid);
  return `
    <div class="sec-h" style="margin-bottom:6px"><h3>${M.t('segBills')}</h3><button type="button" class="btn sm tonal" data-act="scan-manual">${M.ico('plus', 14, 2.5)} <span>${M.t('addBillBtn')}</span></button></div>
    ${unpaid.length ? `<div class="list">${unpaid.map(M.billRow).join('')}</div>` : `<div class="empty">${M.illu('done')}<h4>${(s.bills || []).length ? M.t('allPaid') : (s.lang === 'ar' ? 'لا توجد فواتير مضافة بعد' : 'No bills added yet')}</h4><p>${(s.bills || []).length ? M.t('allPaidSub') : (s.lang === 'ar' ? 'أضف فواتيرك الشهرية الثابتة أو المتغيرة أو صوّرها بالكاميرا ليتم حجزها تلقائياً.' : 'Add your monthly fixed or variable bills or scan them with the camera.')}</p></div>`}
    ${(s.scheduled || []).length && (flt === 'all' || s.scheduled.some(b => (b.kind || 'fixed') === flt)) ? `<div class="feed-day" style="margin-top:12px">${s.lang === 'ar' ? 'مجدولة للأشهر القادمة' : 'Scheduled ahead'}</div>
      <div class="list">${s.scheduled.filter(b => flt === 'all' || (b.kind || 'fixed') === flt).map(b => `<div class="row ${b.id === M.freshBillId ? 'fresh' : ''}" data-act="bill" data-id="${b.id}"><span class="tile" style="--c:${M.CATS[b.cat]?.c || '#3B82F6'}">${M.ico(M.CATS[b.cat]?.ico || 'receipt', 20)}</span><div class="r-main"><div class="r-t">${M.L(b.n)}</div><div class="r-s"><span class="b-kind ${b.kind === 'var' ? 'var' : 'fixed'}">${M.t(b.kind === 'var' ? 'billVar' : 'billFixed')}</span> <span>${M.L(b.dueStr)} · ${M.ico('bell', 11)} ${M.L(b.remStr)}</span> <span class="scan-tag">${M.ico('scan', 11, 2)}</span></div></div><div class="r-amt priv">${M.money(b.amount)}</div></div>`).join('')}</div>` : ''}
    ${paid.length ? `<div class="feed-day" style="margin-top:12px">${M.t('paidL')}</div><div class="list">${paid.map(M.billRow).join('')}</div>` : ''}`;
};

M.billsBodyHtml = () => {
  const s = M.s, seg = s.billSeg || 'bills', ar = s.lang === 'ar';
  if (seg === 'bills') {
    const unpaidAll = (s.bills || []).filter(b => !b.paid), paidAll = (s.bills || []).filter(b => b.paid);
    const sum = a => a.reduce((x, b) => x + b.amount, 0);
    const flt = s.billFilter || 'all';
    return `
    <div class="bill-sum">
      <div class="bs">
        <span class="muted small">${M.t('totalDue')}</span>
        <b class="priv" style="color:var(--warn)">${M.money(sum(unpaidAll))}</b>
      </div>
      <div class="bs">
        <span class="muted small">${M.t('paidThis')}</span>
        <b class="priv" style="color:var(--safe)">${M.money(sum(paidAll))}</b>
      </div>
    </div>
    <div class="chips bill-chips" id="billChips">
      <button type="button" class="chip ${flt === 'all' ? 'on' : ''}" data-act="bill-filter" data-id="all">${M.t('all')} (${(s.bills || []).length})</button>
      <button type="button" class="chip ${flt === 'fixed' ? 'on' : ''}" style="--chip-c:#0D9488" data-act="bill-filter" data-id="fixed">${M.ico('shield', 13, 2)} <span>${M.t('billFixed')}</span></button>
      <button type="button" class="chip ${flt === 'var' ? 'on' : ''}" style="--chip-c:#D97706" data-act="bill-filter" data-id="var">${M.ico('bolt', 13, 2)} <span>${M.t('billVar')}</span></button>
    </div>
    <div class="card" id="billsCard">${M.billsListCardHtml()}</div>`;
  }
  const car = s.car || { n: { ar: 'سيارة العائلة', en: 'Family Car' }, plate: '00000 123 16', odo: 0, nextOil: 10000, kmDay: 40, fuelBudget: 5000, fuelUsed: 0 };
  const toOil = Math.max(0, (car.nextOil || 10000) - (car.odo || 0));
  const kmDay = Math.max(1, car.kmDay || 40);
  const fuelPct = car.fuelBudget > 0 ? Math.min(100, (car.fuelUsed / car.fuelBudget) * 100) : 0;
  return `
  <div class="car3d">
    <div class="car-card" data-act="car-timeline" data-tilt3d>
      <div class="car-card-bg" aria-hidden="true"></div>
      <div class="cc-top">
        <div>
          <div class="cc-name">${M.L(car.n)} <span style="opacity:.75;display:inline-flex;vertical-align:middle">${M.ico('pen', 13, 2)}</span></div>
          <div class="cc-sub">${M.t('reminderOn')}</div>
        </div>
        <span class="plate">DZ · ${car.plate || '—'}</span>
      </div>
      ${M.carSvg()}
      <div class="cc-odo"><b class="num">${M.fmt(car.odo || 0)}</b><span>${M.t('odo')} · ${M.t('km')}</span></div>
    </div>
  </div>
  <div class="ai-pill"><span class="spark">${M.ico('spark', 16, 2)}</span><span>${M.t('aiOdo')(M.fmt(toOil), Math.round(toOil / kmDay))}</span></div>
  <div class="card">
    <div class="sec-h">
      <h3>${M.t('carObl')}</h3>
      <button type="button" class="btn sm tonal" data-act="car-edit">${M.ico('pen', 13, 2)} <span>${ar ? 'تعديل السيارة' : 'Edit Car'}</span></button>
    </div>
    <div class="list">${(s.carItems || []).map(it => `<div class="row" data-act="car-item" data-id="${it.id}">
      <span class="tile" style="--c:${it.c}">${M.ico(it.ico, 20)}</span>
      <div class="r-main"><div class="r-t">${M.L(it.n)} ${it.ai ? `<span class="badge info">AI</span>` : ''}</div><div class="r-s">${M.L(it.s)}</div></div>
      <div class="count ${it.days <= 7 ? 'crit' : it.days <= 30 ? 'warn' : ''}"><b class="num">${it.days}</b><span>${M.t('days')}</span></div></div>`).join('')}
      <div class="row" data-act="car-item" data-id="fuel"><span class="tile" style="--c:#06B6D4">${M.ico('fuel', 20)}</span>
        <div class="r-main"><div class="r-t">${M.t('fuelBudget')}</div><div class="bar" style="margin-top:8px;--bc:#06B6D4"><i style="width:${fuelPct}%"></i></div></div>
        <div class="r-end small priv"><b class="num">${M.fmt(car.fuelUsed || 0)}</b>/<span class="num">${M.fmt(car.fuelBudget || 0)}</span></div></div>
    </div>
  </div>`;
};

M.screens.bills = () => {
  const seg = M.s.billSeg || 'bills';
  return `<div class="anim">${M.segc('billSeg', [['bills', M.t('segBills')], ['car', M.t('segCar')]], seg)}</div>
  <div class="seg-body anim" id="segBody">${M.billsBodyHtml()}</div>`;
};

/* ── actions ── */
M.acts['bill-filter'] = el => {
  const nextId = el.dataset.id;
  if (M.s.billFilter === nextId) return;
  M.s.billFilter = nextId;
  const wrap = document.getElementById('billChips');
  if (wrap) wrap.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.id === nextId));
  const card = document.getElementById('billsCard');
  if (card) {
    card.innerHTML = M.billsListCardHtml();
    M.replayAnim(card, 'feed-swap', 360);
  } else {
    M.render();
  }
};

M.acts.pay = (el, ev) => {
  ev.stopPropagation();
  const b = (M.s.bills || []).find(x => x.id === el.dataset.id);
  if (!b) return;
  el.outerHTML = `<span class="mini-check">${M.ico('check', 16, 3)}</span>`;
  M.toast(`${M.ico('checkc', 16)} ${M.t('billPaid')} · ${M.L(b.n)}`);
  setTimeout(() => {
    b.paid = true;
    b.paidDay = M.s.day;
    if (M.api) {
      M.api.saveLocal(M.s);
      M.api.updateBill(b.id, { paid: true, paidDay: M.s.day }).catch(() => {});
    }
    M.render();
    M.checkThreshold();
  }, 650);
};

M.acts.bill = el => {
  const b = (M.s.bills || []).find(x => x.id === el.dataset.id) || (M.s.scheduled || []).find(x => x.id === el.dataset.id);
  if (!b) return;
  const isVar = b.kind === 'var';
  const dueInfo = b.dueStr ? M.L(b.dueStr) : (b.paid ? M.t('paidOn')(M.dateStr(b.paidDay)) : M.t('dueOn')(M.dateStr(b.due)));
  M.sheet.open(M.L(b.n), `
    <div style="text-align:center">
      ${M.tile(b.cat, 60)}
      <div style="font-size:30px;font-weight:800;margin-top:8px" class="priv">${M.money(b.amount)}</div>
      <div style="display:flex;gap:6px;justify-content:center;align-items:center;margin-top:6px">
        <span class="b-kind ${isVar ? 'var' : 'fixed'}">${M.ico(isVar ? 'bolt' : 'shield', 12, 2.2)} ${M.t(isVar ? 'billVar' : 'billFixed')}</span>
        <span class="badge ${b.paid ? 'safe' : 'warn'}">${dueInfo}</span>
      </div>
    </div>

    <form class="manual-form" data-form="bill-edit" data-id="${b.id}">
      <div class="group" style="padding:12px 14px">
        <label style="margin-bottom:8px">${M.t('billType')}
          <div class="kind-pick">
            <button type="button" class="kp-btn ${!isVar ? 'on' : ''}" data-act="pick-kind" data-v="fixed">${M.ico('shield', 14, 2)} ${M.t('billFixed')}</button>
            <button type="button" class="kp-btn ${isVar ? 'on' : ''}" data-act="pick-kind" data-v="var">${M.ico('bolt', 14, 2)} ${M.t('billVar')}</button>
          </div>
          <input type="hidden" name="kind" id="billKindIn" value="${b.kind || 'fixed'}">
        </label>
        <label>${M.t('editBillAmt')} (${M.t('cur')})
          <div style="display:flex;gap:8px">
            <input name="amt" type="text" inputmode="decimal" required value="${b.amount}" style="flex:1">
            <button class="btn sm tonal" type="submit" style="height:44px;border-radius:11px;padding:0 16px">${M.t('save')}</button>
          </div>
        </label>
        <div class="muted small" style="margin-top:6px">${isVar ? M.t('varDesc') : M.t('fixedDesc')}</div>
      </div>
    </form>

    <div class="group">
      <div class="kv"><span>${M.t('category')}</span><b>${M.L(M.CATS[b.cat]?.n || { ar: 'أخرى', en: 'Other' })}</b></div>
      <div class="kv"><span>${M.t('reminder')}</span><b>${b.remStr ? M.L(b.remStr) : M.t('reminderAt')(M.dateStr(1))}</b></div>
      <div class="kv"><span>${M.t('reserved')}</span><b>${b.paid ? '—' : M.t('reservedAuto')}</b></div>
    </div>
    ${b.paid ? `<div class="empty" style="padding:0">${M.successCheck()}</div>` : `<button type="button" class="btn" data-act="pay-sheet" data-id="${b.id}">${M.ico('check', 18, 2.6)} ${M.t('markPaid')}</button>`}
    <div style="margin-top:8px">
      <button type="button" class="btn tonal" data-act="bill-del" data-id="${b.id}" style="color:var(--crit);background:color-mix(in srgb,var(--crit) 12%,transparent)">
        ${M.ico('trash', 16, 2)} <span>${M.s.lang === 'ar' ? 'حذف هذه الفاتورة' : 'Delete bill'}</span>
      </button>
    </div>`);
};

M.acts['bill-del'] = el => {
  const id = el.dataset.id;
  M.s.bills = (M.s.bills || []).filter(b => b.id != id);
  M.s.scheduled = (M.s.scheduled || []).filter(b => b.id != id);
  M.s.carItems = (M.s.carItems || []).filter(ci => ci.id != id);
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.deleteBill(id).catch(() => {});
  }
  M.sheet.close();
  M.render();
  M.checkThreshold();
  M.toast(`${M.ico('trash', 15, 2)} ${M.s.lang === 'ar' ? 'تم حذف الفاتورة' : 'Bill deleted'}`);
};

M.acts['pick-kind'] = el => {
  const wrap = el.parentElement;
  wrap.querySelectorAll('.kp-btn').forEach(b => b.classList.toggle('on', b === el));
  const inp = wrap.parentElement.querySelector('input[name="kind"]');
  if (inp) inp.value = el.dataset.v;
};

M.saveBillEdit = f => {
  const b = (M.s.bills || []).find(x => x.id === f.dataset.id) || (M.s.scheduled || []).find(x => x.id === f.dataset.id);
  if (!b) return;
  const raw = typeof f.amt.value === 'string' ? M.toWesternDigits(f.amt.value) : f.amt.value;
  const amt = parseFloat(raw);
  if (!(amt > 0)) return;
  b.amount = amt;
  b.kind = f.kind.value || b.kind;
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateBill(b.id, { amount: b.amount, kind: b.kind }).catch(() => {});
  }
  M.sheet.close();
  M.render();
  M.checkThreshold();
  M.toast(`${M.ico('checkc', 16, 2)} ${M.t('billUpdated')} · ${M.fmt(amt)} ${M.t('cur')}`);
};

M.acts['pay-sheet'] = el => {
  const b = (M.s.bills || []).find(x => x.id === el.dataset.id) || (M.s.scheduled || []).find(x => x.id === el.dataset.id);
  if (!b) return;
  const amtIn = el.closest('.sh-body')?.querySelector('input[name="amt"]');
  const rawA = amtIn && typeof amtIn.value === 'string' ? M.toWesternDigits(amtIn.value) : amtIn?.value;
  if (amtIn && +rawA > 0) b.amount = +rawA;
  el.outerHTML = `<div class="empty" style="padding:0">${M.successCheck()}<h4>${M.t('billPaid')}</h4></div>`;
  b.paid = true; b.paidDay = M.s.day;
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateBill(b.id, { amount: b.amount, paid: true, paidDay: M.s.day }).catch(() => {});
  }
  setTimeout(() => { M.sheet.close(); M.render(); M.checkThreshold(); }, 1300);
};

/* Editable Car Profile Modal */
M.acts['car-edit'] = () => {
  const ar = M.s.lang === 'ar';
  const car = M.s.car || { n: { ar: 'سيارة العائلة', en: 'Family Car' }, plate: '', odo: 0, nextOil: 10000, kmDay: 40, fuelBudget: 5000, fuelUsed: 0 };
  M.sheet.open(ar ? 'بيانات السيارة والصيانة' : 'Car Details & Maintenance', `
    <form class="manual-form" data-form="car-edit">
      <label>${ar ? 'نوع واسم السيارة' : 'Car Make & Model'}
        <input name="cn" required value="${M.L(car.n)}" autocomplete="off">
      </label>
      <label>${ar ? 'رقم اللوحة' : 'License Plate'}
        <input name="plate" dir="ltr" value="${car.plate || ''}" autocomplete="off">
      </label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label>${ar ? 'العداد الحالي (كم)' : 'Current Odometer (km)'}
          <input name="odo" type="text" inputmode="numeric" value="${car.odo || 0}">
        </label>
        <label>${ar ? 'تغيير الزيت القادم (كم)' : 'Next Oil Change (km)'}
          <input name="nextOil" type="text" inputmode="numeric" value="${car.nextOil || 10000}">
        </label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label>${ar ? 'ميزانية الوقود الشهرية' : 'Monthly Fuel Budget'}
          <input name="fuelBudget" type="text" inputmode="numeric" value="${car.fuelBudget || 5000}">
        </label>
        <label>${ar ? 'المصروف من الوقود' : 'Fuel Used'}
          <input name="fuelUsed" type="text" inputmode="numeric" value="${car.fuelUsed || 0}">
        </label>
      </div>
      <button class="btn" type="submit">${M.ico('check', 18, 2.5)} ${M.t('save')}</button>
    </form>
    <button type="button" class="btn tonal" data-act="car-timeline" style="margin-top:4px">${M.t('timeline')}</button>
  `);
};

M.saveCarEdit = f => {
  const ar = M.s.lang === 'ar';
  const name = (f.cn.value || '').trim() || (ar ? 'سيارة العائلة' : 'Family Car');
  const plate = (f.plate.value || '').trim();
  const odo = parseInt(M.toWesternDigits(String(f.odo.value || '0')), 10) || 0;
  const nextOil = parseInt(M.toWesternDigits(String(f.nextOil.value || '10000')), 10) || (odo + 5000);
  const fuelBudget = parseFloat(M.toWesternDigits(String(f.fuelBudget.value || '5000'))) || 5000;
  const fuelUsed = parseFloat(M.toWesternDigits(String(f.fuelUsed.value || '0'))) || 0;
  M.s.car = Object.assign({}, M.s.car, {
    n: { ar: name, en: name },
    plate,
    odo,
    nextOil,
    fuelBudget,
    fuelUsed
  });
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateCar({ car: M.s.car }).catch(() => {});
  }
  M.sheet.close();
  M.render();
  M.toast(`${M.ico('checkc', 16)} ${ar ? 'تم تحديث بيانات السيارة' : 'Car details updated'}`);
};

M.acts['car-timeline'] = () => {
  const ar = M.s.lang === 'ar', kmU = M.t('km'), curU = M.t('cur');
  const car = M.s.car || { odo: 0, nextOil: 10000 };
  const tl = [
    [ar ? 'العداد الحالي' : 'Current Odometer', M.L(car.n), `${M.fmt(car.odo || 0)} ${kmU}`, true, '#0D9488'],
    [ar ? 'الصيانة القادمة' : 'Next Oil Service', ar ? 'تغيير زيت + فلتر' : 'Oil + filter', `${M.fmt(car.nextOil || 10000)} ${kmU}`, false, '#F59E0B'],
    ...(M.s.carItems || []).map(it => [ `${it.days} ${M.t('days')}`, M.L(it.n), M.L(it.s), false, it.c || '#3B82F6' ])
  ];
  M.sheet.open(M.t('timeline'), `<div class="tl">${tl.map(([d, n, m, done, c]) => `<div class="tl-i ${done ? 'done' : ''}" style="--tc:${c}"><b>${n}</b><p>${d} · ${m}</p></div>`).join('')}</div>`);
};

M.acts['car-item'] = el => {
  const id = el.dataset.id, car = M.s.car || { fuelBudget: 5000, fuelUsed: 0, nextOil: 10000, odo: 0, kmDay: 40 };
  if (id === 'fuel') {
    const pct = car.fuelBudget > 0 ? Math.min(100, (car.fuelUsed / car.fuelBudget) * 100) : 0;
    return M.sheet.open(M.t('fuelBudget'), `<div class="group"><div class="kv"><span>${M.t('fuelBudget')}</span><b>${M.money(car.fuelBudget)}</b></div>
      <div class="kv"><span>${M.t('spent')}</span><b>${M.moneyNeg(car.fuelUsed)}</b></div></div>
      <div class="bar" style="--bc:#06B6D4;height:12px;border-radius:6px"><i style="width:${pct}%"></i></div>
      <button type="button" class="btn tonal" data-act="car-edit" style="margin-top:8px">${M.ico('pen', 15, 2)} <span>${M.s.lang === 'ar' ? 'تعديل ميزانية الوقود' : 'Edit Fuel Budget'}</span></button>`);
  }
  const it = (M.s.carItems || []).find(x => x.id === id);
  if (!it) return;
  M.sheet.open(M.L(it.n), `
    <div style="text-align:center"><span class="tile" style="--c:${it.c};width:64px;height:64px;margin:auto">${M.ico(it.ico, 32)}</span>
      <div style="font-size:40px;font-weight:700;margin-top:8px" class="num">${it.days}</div><div class="muted">${M.t('days')}</div></div>
    <div class="group"><div class="kv"><span>${M.L(it.n)}</span><b>${M.L(it.s)}</b></div>
      <div class="kv"><span>${M.t('reminder')}</span><b>${M.t('reminderOn')}</b></div></div>
    ${it.ai ? `<div class="ai-pill"><span class="spark">${M.ico('spark', 16, 2)}</span><span>${M.t('aiOdo')(M.fmt(Math.max(0, car.nextOil - car.odo)), Math.round(Math.max(0, car.nextOil - car.odo) / Math.max(1, car.kmDay || 40)))}</span></div>` : ''}
    <button type="button" class="btn tonal" data-act="car-timeline">${M.t('timeline')}</button>`);
};
