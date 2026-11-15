/* Tab 2 — Bills & Car Hub (Smart Next-Bill Predictor + Live Countdown Timers + 7,000 km AI Oil Date Predictor) */
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
  const ar = M.s.lang === 'ar';
  const isVar = b.kind === 'var';
  const cd = M.getBillCountdown ? M.getBillCountdown(b) : { daysLeft: 10, nextBillDate: { ar: 'الشهر القادم', en: 'Next month' }, progressPct: 50, dueInCurrentSalaryCycle: true };
  const kindBadge = `<span class="b-kind ${isVar ? 'var' : 'fixed'}">${M.ico(isVar ? 'bolt' : 'shield', 10.5, 2.2)} ${M.t(isVar ? 'billVar' : 'billFixed')}</span>`;
  const dueSoon = !b.paid && cd.daysLeft <= 5;
  const cdBadgeText = b.paid
    ? (ar ? `🔄 القادمة بعد ${cd.daysLeft} يوم` : `🔄 Next in ${cd.daysLeft}d`)
    : (cd.daysLeft === 0 ? (ar ? '⏳ تستحق اليوم!' : '⏳ Due today!') : (ar ? `⏳ باقي ${cd.daysLeft} يوم` : `⏳ ${cd.daysLeft}d left`));

  return `<div class="row ${b.paid ? 'paid' : ''} ${b.id === M.freshBillId ? 'fresh' : ''}" data-act="bill" data-id="${b.id}">${M.tile(b.cat)}
  <div class="r-main">
    <div class="r-t">${M.L(b.n)}</div>
    <div class="r-s">
      ${kindBadge}
      <span style="${dueSoon ? 'color:var(--crit);font-weight:700' : 'font-weight:600;color:var(--primary)'}">${cdBadgeText}</span>
      ${b.scanned ? `<span class="scan-tag" title="Scanned">${M.ico('scan', 11, 2)}</span>` : ''}
    </div>
    <div class="r-s muted" style="font-size:11px;margin-top:1px">
      <span>${ar ? `📅 الفاتورة القادمة المتوقعة: ${cd.nextBillDate.ar}` : `📅 Next expected: ${cd.nextBillDate.en}`}</span>
    </div>
    <div class="bar" style="height:4px;margin-top:5px"><i style="width:${cd.progressPct}%;--bc:${b.paid ? 'var(--safe)' : (dueSoon ? 'var(--crit)' : 'var(--primary)')}"></i></div>
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
  const s = M.s, flt = s.billFilter || 'all', ar = s.lang === 'ar';
  const filtered = (s.bills || []).filter(b => flt === 'all' || (b.kind || 'fixed') === flt);
  const unpaid = filtered.filter(b => !b.paid).sort((a, b) => a.due - b.due);
  const paid = filtered.filter(b => b.paid);
  return `
    <div class="sec-h" style="margin-bottom:6px"><h3>${M.t('segBills')}</h3><button type="button" class="btn sm tonal" data-act="scan-manual">${M.ico('plus', 14, 2.5)} <span>${M.t('addBillBtn')}</span></button></div>
    ${unpaid.length ? `<div class="list">${unpaid.map(M.billRow).join('')}</div>` : `<div class="empty">${M.illu('done')}<h4>${(s.bills || []).length ? M.t('allPaid') : (ar ? 'لا توجد فواتير مضافة بعد' : 'No bills added yet')}</h4><p>${(s.bills || []).length ? M.t('allPaidSub') : (ar ? 'أضف فواتيرك الشهرية أو الدورية أو صوّرها بالكاميرا ليحسب الذكاء الاصطناعي عدادها وموعد الفاتورة التي بعدها تلقائياً.' : 'Add or scan your bills so AI automatically tracks their countdown and predicts the next bill arrival.')}</p></div>`}
    ${(s.scheduled || []).length && (flt === 'all' || s.scheduled.some(b => (b.kind || 'fixed') === flt)) ? `<div class="feed-day" style="margin-top:12px">${ar ? 'مجدولة للأشهر القادمة' : 'Scheduled ahead'}</div>
      <div class="list">${s.scheduled.filter(b => flt === 'all' || (b.kind || 'fixed') === flt).map(b => `<div class="row ${b.id === M.freshBillId ? 'fresh' : ''}" data-act="bill" data-id="${b.id}"><span class="tile" style="--c:${M.CATS[b.cat]?.c || '#3B82F6'}">${M.ico(M.CATS[b.cat]?.ico || 'receipt', 20)}</span><div class="r-main"><div class="r-t">${M.L(b.n)}</div><div class="r-s"><span class="b-kind ${b.kind === 'var' ? 'var' : 'fixed'}">${M.t(b.kind === 'var' ? 'billVar' : 'billFixed')}</span> <span>${M.L(b.dueStr)} · ${M.ico('bell', 11)} ${M.L(b.remStr)}</span> <span class="scan-tag">${M.ico('scan', 11, 2)}</span></div></div><div class="r-amt priv">${M.money(b.amount)}</div></div>`).join('')}</div>` : ''}
    ${paid.length ? `<div class="feed-day" style="margin-top:12px">${ar ? `${M.t('paidL')} · عداد الفاتورة القادمة` : `${M.t('paidL')} · Next Bill Countdown`}</div><div class="list">${paid.map(M.billRow).join('')}</div>` : ''}`;
};

M.billsBodyHtml = () => {
  const s = M.s, seg = s.billSeg || 'bills', ar = s.lang === 'ar';
  if (seg === 'bills') {
    const unpaidAll = (s.bills || []).filter(b => !b.paid), paidAll = (s.bills || []).filter(b => b.paid);
    const sum = a => a.reduce((x, b) => x + b.amount, 0);
    const flt = s.billFilter || 'all';
    const rep = M.getPaydaySmartReport ? M.getPaydaySmartReport() : null;
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
    ${rep && (rep.unpaidBills.length || rep.oil.dueThisMonth) ? `
      <div class="ai-pill" data-act="banner-open" style="cursor:pointer">
        <span class="spark">${M.ico('spark', 16, 2)}</span>
        <div style="flex:1;min-width:0">
          <b>${ar ? 'رادار الذكاء الاصطناعي للراتب والفواتير القادمة' : 'AI Payday & Next-Bill Radar'}</b>
          <div class="muted small" style="margin-top:2px">
            ${ar
              ? `يُنصح بحجز <b>${M.fmt(rep.totalRecommendedReserve)} د.ج</b> من راتب هذا الشهر (${rep.unpaidBills.length} فواتير${rep.oil.dueThisMonth ? ` + تغيير زيت السيارة عند ${M.fmt(rep.oil.nextOil)} كم` : ''}).`
              : `Reserve <b>${M.fmt(rep.totalRecommendedReserve)} DZD</b> from this month's salary (${rep.unpaidBills.length} bills${rep.oil.dueThisMonth ? ` + 7,000 km oil change` : ''}).`}
          </div>
        </div>
      </div>` : ''}
    <div class="chips bill-chips" id="billChips">
      <button type="button" class="chip ${flt === 'all' ? 'on' : ''}" data-act="bill-filter" data-id="all">${M.t('all')} (${(s.bills || []).length})</button>
      <button type="button" class="chip ${flt === 'fixed' ? 'on' : ''}" style="--chip-c:#0D9488" data-act="bill-filter" data-id="fixed">${M.ico('shield', 13, 2)} <span>${M.t('billFixed')}</span></button>
      <button type="button" class="chip ${flt === 'var' ? 'on' : ''}" style="--chip-c:#D97706" data-act="bill-filter" data-id="var">${M.ico('bolt', 13, 2)} <span>${M.t('billVar')}</span></button>
    </div>
    <div class="card" id="billsCard">${M.billsListCardHtml()}</div>`;
  }

  if (typeof M.syncCarOilItem === 'function') M.syncCarOilItem();
  const car = s.car || { n: { ar: 'سيارة العائلة', en: 'Family Car' }, plate: '', odo: 0, oilInterval: 7000, nextOil: 7000, kmDay: 45, fuelUsed: 0 };
  const oil = M.getCarOilStatus ? M.getCarOilStatus() : { odo: car.odo || 0, interval: 7000, nextOil: car.nextOil || 7000, followingOil: (car.nextOil || 7000) + 7000, toOil: 7000, pctUsed: 10, kmDay: 45, days: 30, predictedDate: { ar: 'الشهر القادم', en: 'Next month' }, followingDate: { ar: 'بعد 5 أشهر', en: 'In 5 mos' }, oilCost: 4500, dueThisMonth: false };
  const carPurchFuel = (s.purchases || []).filter(p => p.cat === 'car').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const fuelSpent = Math.max(Number(car.fuelUsed) || 0, carPurchFuel);

  return `
  <div class="car3d">
    <div class="car-card" data-act="car-timeline" data-tilt3d>
      <div class="car-card-bg" aria-hidden="true"></div>
      <div class="cc-top">
        <div>
          <div class="cc-name">${M.L(car.n)} <span style="opacity:.75;display:inline-flex;vertical-align:middle">${M.ico('pen', 13, 2)}</span></div>
          <div class="cc-sub">${ar ? `التغيير القادم عند ${M.fmt(oil.nextOil)} كم · متوقع: ${oil.predictedDate.ar}` : `Next oil at ${M.fmt(oil.nextOil)} km · Est: ${oil.predictedDate.en}`}</div>
        </div>
        <span class="plate">DZ · ${car.plate || '—'}</span>
      </div>
      ${M.carSvg()}
      <div class="cc-odo"><b class="num">${M.fmt(oil.odo)}</b><span>${M.t('odo')} · ${M.t('km')}</span></div>
    </div>
  </div>
  <div class="ai-pill" style="flex-direction:column;align-items:stretch;gap:8px">
    <div style="display:flex;gap:10px;align-items:flex-start">
      <span class="spark">${M.ico('spark', 16, 2)}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:13px;color:var(--text)">
          ${ar ? `توقع الذكاء الاصطناعي لتغيير الزيت (دورة 7,000 كم)` : `AI 7,000 km Oil Change Predictor`}
        </div>
        <div style="margin-top:3px;font-size:12px;line-height:1.45">
          ${ar
            ? `متبقي <b>${M.fmt(oil.toOil)} كم</b> (بمعدل قيادتك ~${oil.kmDay} كم/يوم) · الموعد المتوقع لتغيير الزيت القادم: <b style="color:var(--primary)">${oil.predictedDate.ar}</b> (خلال <b>${oil.days} يوم</b>).`
            : `<b>${M.fmt(oil.toOil)} km</b> left (~${oil.kmDay} km/day) · Predicted next oil change: <b style="color:var(--primary)">${oil.predictedDate.en}</b> (in <b>${oil.days} days</b>).`}
        </div>
        <div class="muted small" style="margin-top:2px">
          ${ar
            ? `🔄 والتغيير الذي بعده متوقع عند عداد <b>${M.fmt(oil.followingOil)} كم</b> (حوالي ${oil.followingDate.ar}).`
            : `🔄 Subsequent oil change after that: at <b>${M.fmt(oil.followingOil)} km</b> (~${oil.followingDate.en}).`}
        </div>
        ${oil.dueThisMonth ? `<div style="margin-top:5px;padding:6px 10px;border-radius:10px;background:color-mix(in srgb,var(--warn) 14%,transparent);color:var(--warn);font-size:11.5px;font-weight:700">
          ⚠️ ${ar ? `يقع موعد تغيير الزيت في هذا الشهر! ينصحك الذكاء الاصطناعي بحجز ~${M.fmt(oil.oilCost)} د.ج عند استلام الراتب.` : `Oil change falls in this month! AI recommends reserving ~${M.fmt(oil.oilCost)} DZD from your salary.`}
        </div>` : ''}
      </div>
    </div>
    <div class="bar"><i style="width:${oil.pctUsed}%;--bc:${oil.toOil <= 1000 ? 'var(--crit)' : '#F59E0B'}"></i></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button type="button" class="btn sm tonal" data-act="car-oil-reset" style="height:34px;font-size:11.5px;padding:0 12px;flex:1">
        ${M.ico('check', 13, 2.4)} <span>${ar ? 'تم تغيير الزيت اليوم (+7,000 كم)' : 'Oil Changed Today (+7,000 km)'}</span>
      </button>
      <button type="button" class="btn sm plain" data-act="ai-month-notify" style="height:34px;font-size:11.5px;padding:0 12px">
        ${M.ico('bell', 13, 2)} <span>${ar ? 'إرسال تنبيه' : 'Send Alert'}</span>
      </button>
    </div>
  </div>
  <div class="card">
    <div class="sec-h">
      <h3>${ar ? 'عداد التزامات وصيانة السيارة' : 'Car Maintenance & Timed Countdowns'}</h3>
      <div style="display:flex;gap:6px">
        <button type="button" class="btn sm tonal" data-act="add-car-item-open">${M.ico('plus', 13, 2.4)} <span>${ar ? 'إضافة مدة/عداد' : 'Add Timer'}</span></button>
        <button type="button" class="btn sm plain" data-act="car-edit">${M.ico('pen', 13, 2)} <span>${ar ? 'العداد' : 'Odo'}</span></button>
      </div>
    </div>
    <div class="list">${(s.carItems || []).map(it => {
      const cyc = Number(it.cycleDays) || (it.id === 'oil' ? 150 : 365);
      const pct = Math.max(6, Math.min(100, Math.round(((cyc - Math.min(cyc, Number(it.days) || 0)) / Math.max(1, cyc)) * 100)));
      const nextDate = M.formatFutureDate ? M.formatFutureDate(Number(it.days) || 0) : { ar: '', en: '' };
      return `<div class="row" data-act="car-item" data-id="${it.id}">
        <span class="tile" style="--c:${it.c}">${M.ico(it.ico, 20)}</span>
        <div class="r-main">
          <div class="r-t">${M.L(it.n)} ${it.ai ? `<span class="badge info">AI</span>` : ''}</div>
          <div class="r-s">${M.L(it.s)}</div>
          <div class="r-s muted" style="font-size:11px">${ar ? `⏳ الموعد: ${nextDate.ar}` : `⏳ Due: ${nextDate.en}`}</div>
          <div class="bar" style="height:4px;margin-top:4px"><i style="width:${pct}%;--bc:${it.days <= 7 ? 'var(--crit)' : (it.days <= 30 ? 'var(--warn)' : (it.c || 'var(--primary)'))}"></i></div>
        </div>
        <div class="count ${it.days <= 7 ? 'crit' : it.days <= 30 ? 'warn' : ''}"><b class="num">${it.days}</b><span>${M.t('days')}</span></div>
      </div>`;
    }).join('')}
      <div class="row" data-act="car-item" data-id="fuel">
        <span class="tile" style="--c:#06B6D4">${M.ico('fuel', 20)}</span>
        <div class="r-main">
          <div class="r-t">${ar ? 'تعبئة البنزين ومصاريف السيارة' : 'Petrol Fill-Ups & Car Expenses'}</div>
          <div class="r-s">${ar ? 'سجّل سعر كل تعبئة بنزين بالأسفل' : 'Tap for fill-up history or enter price below'}</div>
        </div>
        <div class="r-end priv" style="font-weight:800;font-size:14.5px;color:var(--primary)">${M.money(fuelSpent)}</div>
      </div>
    </div>
    <form class="add-item" data-form="fuel-add" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line)">
      <div class="small muted" style="margin-bottom:6px;font-weight:600">${ar ? 'هل قمت بتعبئة البنزين؟ اكتب سعر التعبئة هنا:' : 'Filled up petrol? Enter the fill-up price:'}</div>
      <div class="add-row">
        <div class="in-wrap in-price" style="flex:1">
          <input name="fuelPrice" type="text" inputmode="decimal" required placeholder="${ar ? 'سعر تعبئة البنزين (مثال: 1500 د.ج)' : 'Petrol fill-up price (e.g. 1500 DZD)'}" autocomplete="off">
        </div>
        <button type="submit" class="btn sm" style="height:44px;padding:0 15px;border-radius:12px;flex:none">
          ${M.ico('fuel', 15, 2.2)} <span>${ar ? 'تسجيل البنزين' : 'Log Petrol'}</span>
        </button>
      </div>
    </form>
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
  const ar = M.s.lang === 'ar';
  const b = (M.s.bills || []).find(x => x.id === el.dataset.id);
  if (!b) return;
  el.outerHTML = `<span class="mini-check">${M.ico('check', 16, 3)}</span>`;
  b.paid = true;
  b.paidDay = M.s.day;
  const cd = M.getBillCountdown ? M.getBillCountdown(b) : null;
  const nextInfo = cd ? (ar ? ` · الفاتورة القادمة المتوقعة: ${cd.nextBillDate.ar}` : ` · Next bill: ${cd.nextBillDate.en}`) : '';
  M.toast(`${M.ico('checkc', 16)} ${M.t('billPaid')} · ${M.L(b.n)}${nextInfo}`);
  setTimeout(() => {
    if (M.api) {
      M.api.saveLocal(M.s);
      M.api.updateBill(b.id, { paid: true, paidDay: M.s.day }).catch(() => {});
    }
    M.render();
    M.checkThreshold();
  }, 650);
};

M.acts.bill = el => {
  const ar = M.s.lang === 'ar';
  const b = (M.s.bills || []).find(x => x.id === el.dataset.id) || (M.s.scheduled || []).find(x => x.id === el.dataset.id);
  if (!b) return;
  const isVar = b.kind === 'var';
  const cd = M.getBillCountdown ? M.getBillCountdown(b) : { cycleDays: 30, cycleLabel: '', daysLeft: 10, nextBillDate: { ar: '', en: '' }, nextCycleDaysFromToday: 40, progressPct: 50 };
  const dueInfo = b.dueStr ? M.L(b.dueStr) : (b.paid ? M.t('paidOn')(M.dateStr(b.paidDay)) : M.t('dueOn')(M.dateStr(b.due)));
  M.sheet.open(M.L(b.n), `
    <div style="text-align:center">
      ${M.tile(b.cat, 60)}
      <div style="font-size:30px;font-weight:800;margin-top:8px" class="priv">${M.money(b.amount)}</div>
      <div style="display:flex;gap:6px;justify-content:center;align-items:center;margin-top:6px;flex-wrap:wrap">
        <span class="b-kind ${isVar ? 'var' : 'fixed'}">${M.ico(isVar ? 'bolt' : 'shield', 12, 2.2)} ${M.t(isVar ? 'billVar' : 'billFixed')}</span>
        <span class="badge ${b.paid ? 'safe' : 'warn'}">${dueInfo}</span>
        <span class="badge info">⏳ ${ar ? `باقي ${cd.daysLeft} يوم` : `${cd.daysLeft}d left`}</span>
      </div>
    </div>

    <div class="ai-pill">
      <span class="spark">${M.ico('spark', 16, 2)}</span>
      <div style="flex:1;min-width:0">
        <b>${ar ? 'توقع الذكاء الاصطناعي للفاتورة القادمة' : 'AI Next-Bill Prediction'}</b>
        <div class="muted small" style="margin-top:2px">
          ${ar
            ? `الدورة: <b>${cd.cycleLabel}</b> · ستأتي الفاتورة التي بعد هذه يوم <b style="color:var(--primary)">${cd.nextBillDate.ar}</b> (بعد ${cd.nextCycleDaysFromToday} يوم) وسيذكرك التطبيق تلقائياً عند نزول الراتب.`
            : `Cycle: <b>${cd.cycleLabel}</b> · Next bill arrives on <b style="color:var(--primary)">${cd.nextBillDate.en}</b> (in ${cd.nextCycleDaysFromToday} days).`}
        </div>
      </div>
    </div>

    <form class="manual-form" data-form="bill-edit" data-id="${b.id}">
      <div class="group" style="padding:12px 14px;display:flex;flex-direction:column;gap:10px">
        <label>${M.t('billType')}
          <div class="kind-pick">
            <button type="button" class="kp-btn ${!isVar ? 'on' : ''}" data-act="pick-kind" data-v="fixed">${M.ico('shield', 14, 2)} ${M.t('billFixed')}</button>
            <button type="button" class="kp-btn ${isVar ? 'on' : ''}" data-act="pick-kind" data-v="var">${M.ico('bolt', 14, 2)} ${M.t('billVar')}</button>
          </div>
          <input type="hidden" name="kind" id="billKindIn" value="${b.kind || 'fixed'}">
        </label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <label>${M.t('editBillAmt')} (${M.t('cur')})
            <input name="amt" type="text" inputmode="decimal" required value="${b.amount}">
          </label>
          <label>${ar ? 'دورة تكرار الفاتورة (المدة)' : 'Billing Cycle (Duration)'}
            <select name="cycleDays">
              ${[
                [30, ar ? 'كل شهر (30 يوم)' : 'Monthly (30d)'],
                [60, ar ? 'كل شهرين · سونلغاز/سيال (60 يوم)' : 'Bi-Monthly (60d)'],
                [90, ar ? 'كل 3 أشهر (90 يوم)' : 'Quarterly (90d)'],
                [180, ar ? 'كل 6 أشهر (180 يوم)' : 'Semi-Annual (180d)'],
                [365, ar ? 'كل سنة · تأمين/مراقبة (365 يوم)' : 'Annual (365d)']
              ].map(([val, lbl]) => `<option value="${val}" ${Number(cd.cycleDays) === val ? 'selected' : ''}>${lbl}</option>`).join('')}
            </select>
          </label>
        </div>
        <button class="btn sm tonal" type="submit" style="height:42px;border-radius:11px">${M.ico('check', 15, 2.5)} <span>${M.t('save')}</span></button>
      </div>
    </form>

    <div class="group">
      <div class="kv"><span>${M.t('category')}</span><b>${M.L(M.CATS[b.cat]?.n || { ar: 'أخرى', en: 'Other' })}</b></div>
      <div class="kv"><span>${ar ? 'تاريخ الفاتورة القادمة المتوقعة' : 'Predicted Next Bill Date'}</span><b style="color:var(--primary)">${cd.nextBillDate[ar ? 'ar' : 'en']}</b></div>
      <div class="kv"><span>${M.t('reserved')}</span><b>${b.paid ? '—' : M.t('reservedAuto')}</b></div>
    </div>
    ${b.paid ? `<div class="empty" style="padding:0">${M.successCheck()}</div>` : `<button type="button" class="btn" data-act="pay-sheet" data-id="${b.id}">${M.ico('check', 18, 2.6)} ${M.t('markPaid')}</button>`}
    <div style="margin-top:8px">
      <button type="button" class="btn tonal" data-act="bill-del" data-id="${b.id}" style="color:var(--crit);background:color-mix(in srgb,var(--crit) 12%,transparent)">
        ${M.ico('trash', 16, 2)} <span>${ar ? 'حذف هذه الفاتورة' : 'Delete bill'}</span>
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
  const oldAmt = Number(b.amount) || 0;
  let hikeIncreased = false;
  if (oldAmt > 0 && amt > oldAmt && typeof M.recordDetectedHikes === 'function') {
    b.prevAmount = oldAmt;
    M.recordDetectedHikes([{ n: b.n, was: oldAmt, now: amt }]);
    hikeIncreased = true;
  }
  b.amount = amt;
  b.kind = f.kind.value || b.kind;
  if (f.cycleDays) {
    b.cycleDays = parseInt(f.cycleDays.value, 10) || 30;
  }
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateBill(b.id, { amount: b.amount, kind: b.kind, cycleDays: b.cycleDays }).catch(() => {});
  }
  M.sheet.close();
  M.render();
  M.checkThreshold();
  if (hikeIncreased) {
    M.toast(`${M.ico('trend', 16, 2)} ${M.s.lang === 'ar' ? `تم رصد زيادة في الفاتورة (+${Math.round(((amt - oldAmt) / oldAmt) * 100)}%)` : `Bill increase detected (+${Math.round(((amt - oldAmt) / oldAmt) * 100)}%)`}`);
  } else {
    M.toast(`${M.ico('checkc', 16, 2)} ${M.t('billUpdated')} · ${M.fmt(amt)} ${M.t('cur')}`);
  }
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

/* Add Custom Timed Car / Document Obligation with Live Countdown */
M.acts['add-car-item-open'] = () => {
  const ar = M.s.lang === 'ar';
  M.sheet.open(ar ? 'إضافة التزام بمدة وعدّاد تنازلي' : 'Add Timed Obligation & Countdown', `
    <form class="manual-form" data-form="car-item-add">
      <label>${ar ? 'اسم الالتزام أو الوثيقة' : 'Obligation / Document Name'}
        <input name="ciname" required placeholder="${ar ? 'مثال: تجديد تأمين السيارة / المراقبة التقنية / قسيمة' : 'e.g. Car Insurance / Technical Inspection'}" autocomplete="off">
      </label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label>${ar ? 'الأيام المتبقية للموعد القادم' : 'Days Remaining Until Due'}
          <input name="cidays" type="text" inputmode="numeric" required placeholder="${ar ? 'مثال: 45' : 'e.g. 45'}" value="30">
        </label>
        <label>${ar ? 'المبلغ التقديري (اختياري · د.ج)' : 'Estimated Cost (Optional · DZD)'}
          <input name="ciamt" type="text" inputmode="decimal" placeholder="${ar ? 'مثال: 18500' : 'e.g. 18500'}">
        </label>
      </div>
      <label>${ar ? 'مدة الدورة الكاملة (لحساب العداد)' : 'Full Cycle Duration'}
        <select name="cicycle">
          <option value="30">${ar ? 'شهري (30 يوم)' : 'Monthly (30 days)'}</option>
          <option value="90">${ar ? 'كل 3 أشهر (90 يوم)' : 'Quarterly (90 days)'}</option>
          <option value="180">${ar ? 'كل 6 أشهر (180 يوم)' : 'Semi-Annual (180 days)'}</option>
          <option value="365" selected>${ar ? 'سنوي · كل سنة (365 يوم)' : 'Annual (365 days)'}</option>
        </select>
      </label>
      <button class="btn" type="submit">${M.ico('check', 18, 2.5)} <span>${ar ? 'حفظ وتشغيل العداد التنازلي' : 'Save & Start Countdown'}</span></button>
    </form>`);
};

M.saveCarItemAdd = f => {
  const ar = M.s.lang === 'ar';
  const name = (f.ciname?.value || '').trim();
  const days = Math.max(1, parseInt(M.toWesternDigits(String(f.cidays?.value || '30')), 10) || 30);
  const cycleDays = Math.max(days, parseInt(f.cicycle?.value || '365', 10) || 365);
  const amt = parseFloat(M.toWesternDigits(String(f.ciamt?.value || '0'))) || 0;
  if (!name) return;
  const dueDate = M.formatFutureDate(days);
  const subAr = amt > 0 ? `${dueDate.ar} · ${M.fmt(amt)} د.ج` : `يستحق يوم ${dueDate.ar}`;
  const subEn = amt > 0 ? `${dueDate.en} · ${M.fmt(amt)} DZD` : `Due ${dueDate.en}`;
  const newItem = {
    id: 'ci_' + Date.now(),
    ico: 'shield',
    c: '#3B82F6',
    n: { ar: name, en: name },
    s: { ar: subAr, en: subEn },
    days,
    cycleDays,
    ai: true
  };
  if (!Array.isArray(M.s.carItems)) M.s.carItems = [];
  M.s.carItems.push(newItem);
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateCar({ carItems: M.s.carItems }).catch(() => {});
  }
  M.sheet.close();
  M.render();
  M.toast(`${M.ico('checkc', 16)} ${ar ? `تم تفعيل العداد التنازلي لـ ${name} (${days} يوم)` : `Countdown started for ${name} (${days}d)`}`);
};

/* One-Tap Reset Oil Change (+7,000 km from current odometer) */
M.acts['car-oil-reset'] = () => {
  const ar = M.s.lang === 'ar';
  const car = M.s.car || { odo: 0, oilInterval: 7000 };
  const interval = 7000;
  const odo = Number(car.odo) || 0;
  car.oilInterval = interval;
  car.lastOilOdo = odo;
  car.nextOil = odo + interval;
  M.s.car = car;
  if (typeof M.syncCarOilItem === 'function') M.syncCarOilItem();
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateCar({ car: M.s.car, carItems: M.s.carItems }).catch(() => {});
  }
  M.sheet.close();
  M.render();
  const oil = M.getCarOilStatus();
  M.toast(`${M.ico('checkc', 16)} ${ar ? `تم ضبط تغيير الزيت القادم عند ${M.fmt(car.nextOil)} كم (المتوقع: ${oil.predictedDate.ar})` : `Next oil change set at ${M.fmt(car.nextOil)} km (Est: ${oil.predictedDate.en})`}`);
};

/* Editable Car Profile Modal (7,000 km Oil Cycle + Daily Rate kmDay for AI Date Prediction) */
M.acts['car-edit'] = () => {
  const ar = M.s.lang === 'ar';
  const car = M.s.car || { n: { ar: 'سيارة العائلة', en: 'Family Car' }, plate: '', odo: 0, oilInterval: 7000, nextOil: 7000, kmDay: 45, oilCost: 4500 };
  const oil = M.getCarOilStatus ? M.getCarOilStatus() : { odo: car.odo || 0, interval: 7000, nextOil: car.nextOil || 7000, kmDay: 45, oilCost: 4500 };
  M.sheet.open(ar ? 'بيانات السيارة وتوقع تغيير الزيت (كل 7,000 كم)' : 'Car & 7,000 km AI Oil Predictor', `
    <form class="manual-form" data-form="car-edit">
      <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:8px">
        <label>${ar ? 'نوع واسم السيارة' : 'Car Make & Model'}
          <input name="cn" required value="${M.L(car.n)}" autocomplete="off">
        </label>
        <label>${ar ? 'رقم اللوحة' : 'License Plate'}
          <input name="plate" dir="ltr" value="${car.plate || ''}" autocomplete="off">
        </label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label>${ar ? 'العداد الحالي (كم)' : 'Current Odometer (km)'}
          <input name="odo" type="text" inputmode="numeric" value="${oil.odo}">
        </label>
        <label>${ar ? 'تغيير الزيت القادم (كم)' : 'Next Oil Change (km)'}
          <input name="nextOil" type="text" inputmode="numeric" value="${oil.nextOil}">
        </label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label>${ar ? 'معدل السير اليومي (كم/يوم)' : 'Daily Driving (km/day)'}
          <input name="kmDay" type="text" inputmode="numeric" value="${oil.kmDay || 45}">
        </label>
        <label>${ar ? 'تكلفة تغيير الزيت التقريبية (د.ج)' : 'Est. Oil Change Cost (DZD)'}
          <input name="oilCost" type="text" inputmode="numeric" value="${oil.oilCost || 4500}">
        </label>
      </div>
      <div class="muted small">${ar ? 'يحسب الذكاء الاصطناعي من عدادك ومعدل سيرك اليومي التاريخ المتوقع لتغيير الزيت القادم والتغيير الذي بعده، وينبهك عند اقترابه أو عند نزول راتب الشهر.' : 'AI calculates the exact predicted date of your next oil change and alerts you on payday if due this month.'}</div>
      <button class="btn" type="submit">${M.ico('check', 18, 2.5)} ${M.t('save')}</button>
    </form>
    <button type="button" class="btn tonal" data-act="car-oil-reset" style="margin-top:6px">${M.ico('drop', 16, 2)} <span>${ar ? 'تم تغيير الزيت اليوم (ضبط +7,000 كم من العداد الحالي)' : 'Oil Changed Today (Set +7,000 km)'}</span></button>
    <button type="button" class="btn plain" data-act="car-timeline" style="margin-top:4px">${M.t('timeline')}</button>
  `);
};

M.saveCarEdit = f => {
  const ar = M.s.lang === 'ar';
  const name = (f.cn.value || '').trim() || (ar ? 'سيارة العائلة' : 'Family Car');
  const plate = (f.plate.value || '').trim();
  const odo = parseInt(M.toWesternDigits(String(f.odo.value || '0')), 10) || 0;
  const oilInterval = 7000;
  const rawNext = parseInt(M.toWesternDigits(String(f.nextOil.value || '0')), 10);
  const nextOil = rawNext > odo ? rawNext : (odo + oilInterval);
  const kmDay = Math.max(5, parseInt(M.toWesternDigits(String(f.kmDay?.value || '45')), 10) || 45);
  const oilCost = Math.max(500, parseInt(M.toWesternDigits(String(f.oilCost?.value || '4500')), 10) || 4500);

  M.s.car = Object.assign({}, M.s.car, {
    n: { ar: name, en: name },
    plate,
    odo,
    oilInterval,
    nextOil,
    kmDay,
    oilCost
  });
  if (typeof M.syncCarOilItem === 'function') M.syncCarOilItem();
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateCar({ car: M.s.car, carItems: M.s.carItems }).catch(() => {});
  }
  M.sheet.close();
  M.render();
  const oil = M.getCarOilStatus ? M.getCarOilStatus() : { dueThisMonth: false, predictedDate: { ar: '', en: '' } };
  if (oil.dueThisMonth) {
    setTimeout(() => M.triggerMonthlyAINotification(), 400);
  }
  M.toast(`${M.ico('checkc', 16)} ${ar ? `تم التحديث · الموعد المتوقع لتغيير الزيت: ${oil.predictedDate.ar}` : `Updated · Predicted oil change: ${oil.predictedDate.en}`}`);
};

M.acts['car-timeline'] = () => {
  const ar = M.s.lang === 'ar', kmU = M.t('km');
  const oil = M.getCarOilStatus ? M.getCarOilStatus() : { odo: 0, nextOil: 7000, followingOil: 14000, interval: 7000, predictedDate: { ar: '', en: '' }, followingDate: { ar: '', en: '' } };
  const tl = [
    [ar ? 'العداد الحالي' : 'Current Odometer', M.L(M.s.car?.n || { ar: 'سيارة العائلة', en: 'Family Car' }), `${M.fmt(oil.odo)} ${kmU}`, true, '#0D9488'],
    [ar ? `تغيير الزيت القادم (${oil.predictedDate.ar})` : `Next Oil Change (${oil.predictedDate.en})`, ar ? 'زيت محرك + فلتر (دورة 7,000 كم)' : 'Engine oil + filter (7,000 km cycle)', `${M.fmt(oil.nextOil)} ${kmU}`, false, '#F59E0B'],
    [ar ? `التغيير الذي بعده المتوقع (${oil.followingDate.ar})` : `Subsequent Oil Change (${oil.followingDate.en})`, ar ? 'الدورة التالية (+14,000 كم)' : 'Following cycle (+14,000 km)', `${M.fmt(oil.followingOil)} ${kmU}`, false, '#3B82F6'],
    ...(M.s.carItems || []).filter(it => it.id !== 'oil').map(it => [ `${it.days} ${M.t('days')}`, M.L(it.n), M.L(it.s), false, it.c || '#3B82F6' ])
  ];
  M.sheet.open(M.t('timeline'), `<div class="tl">${tl.map(([d, n, m, done, c]) => `<div class="tl-i ${done ? 'done' : ''}" style="--tc:${c}"><b>${n}</b><p>${d} · ${m}</p></div>`).join('')}</div>`);
};

M.acts['car-item'] = el => {
  const ar = M.s.lang === 'ar';
  const id = el.dataset.id, car = M.s.car || { fuelUsed: 0 };
  if (id === 'fuel') {
    const carPurchs = (M.s.purchases || []).filter(p => p.cat === 'car');
    const totalSpent = Math.max(Number(car.fuelUsed) || 0, carPurchs.reduce((a, p) => a + (Number(p.amount) || 0), 0));
    const avgFill = carPurchs.length ? Math.round(totalSpent / carPurchs.length) : 0;
    return M.sheet.open(ar ? 'سجل تعبئة البنزين' : 'Petrol Fill-Up Log', `
      <form class="manual-form" data-form="fuel-add" style="margin-bottom:8px">
        <label>${ar ? 'اكتب سعر تعبئة البنزين (' + M.t('cur') + ')' : 'Enter Petrol Fill-Up Price (' + M.t('cur') + ')'}
          <div style="display:flex;gap:8px">
            <input name="fuelPrice" type="text" inputmode="decimal" required placeholder="${ar ? 'مثال: 1500' : 'e.g. 1500'}" style="flex:1" autocomplete="off">
            <button class="btn sm" type="submit" style="height:44px;border-radius:11px;padding:0 16px">${M.ico('check', 15, 2.5)} <span>${ar ? 'حفظ' : 'Save'}</span></button>
          </div>
        </label>
      </form>
      <div class="group">
        <div class="kv"><span>${ar ? 'إجمالي تعبئة البنزين هذا الشهر' : 'Total Petrol Filled This Month'}</span><b class="priv">${M.money(totalSpent)}</b></div>
        <div class="kv"><span>${ar ? 'عدد مرات التعبئة' : 'Fill-ups Count'}</span><b>${carPurchs.length}</b></div>
        ${avgFill > 0 ? `<div class="kv"><span>${ar ? 'متوسط سعر التعبئة الواحدة' : 'Average per Fill-Up'}</span><b class="priv">${M.money(avgFill)}</b></div>` : ''}
      </div>
      ${carPurchs.length ? `<div class="group">${carPurchs.map(M.purchaseRow).join('')}</div>` : `<div class="muted small" style="text-align:center;padding:8px 0">${ar ? 'اكتب سعر تعبئة البنزين بالأعلى في كل مرة تملأ فيها الوقود ليتم تسجيلها وخصمها تلقائياً.' : 'Enter the petrol fill-up price above each time you refuel.'}</div>`}`);
  }
  const it = (M.s.carItems || []).find(x => x.id === id);
  if (!it) return;
  const oil = M.getCarOilStatus ? M.getCarOilStatus() : { toOil: 7000, days: 30, nextOil: 7000, followingOil: 14000, interval: 7000, predictedDate: { ar: '', en: '' }, followingDate: { ar: '', en: '' } };
  const nextDate = M.formatFutureDate ? M.formatFutureDate(Number(it.days) || 0) : { ar: '', en: '' };
  M.sheet.open(M.L(it.n), `
    <div style="text-align:center"><span class="tile" style="--c:${it.c};width:64px;height:64px;margin:auto">${M.ico(it.ico, 32)}</span>
      <div style="font-size:38px;font-weight:800;margin-top:8px" class="num">${it.id === 'oil' ? `${M.fmt(oil.toOil)} ${M.t('km')}` : `${it.days} ${M.t('days')}`}</div>
      <div class="muted">${it.id === 'oil' ? (ar ? `متبقي لتغيير الزيت · المتوقع يوم ${oil.predictedDate.ar}` : `Left until oil change · Est. ${oil.predictedDate.en}`) : (ar ? `الموعد المتوقع: ${nextDate.ar}` : `Expected date: ${nextDate.en}`)}</div></div>
    <div class="group">
      <div class="kv"><span>${M.L(it.n)}</span><b>${M.L(it.s)}</b></div>
      ${it.id === 'oil' ? `<div class="kv"><span>${ar ? 'التغيير الذي بعده المتوقع' : 'Following Oil Change'}</span><b>${M.fmt(oil.followingOil)} ${M.t('km')} (${oil.followingDate[ar ? 'ar' : 'en']})</b></div>` : ''}
      <div class="kv"><span>${M.t('reminder')}</span><b>${ar ? 'تنبيه الذكاء الاصطناعي والراتب مفعّل' : 'AI & Payday Alert Active'}</b></div>
    </div>
    ${it.id === 'oil' ? `<button type="button" class="btn" data-act="car-oil-reset" style="margin-top:4px">${M.ico('check', 17, 2.4)} <span>${ar ? 'تم تغيير الزيت اليوم (ضبط +7,000 كم)' : 'Oil Changed Today (Set +7,000 km)'}</span></button>` : `
      <button type="button" class="btn tonal" data-act="car-item-del" data-id="${it.id}" style="color:var(--crit);background:color-mix(in srgb,var(--crit) 12%,transparent)">
        ${M.ico('trash', 16, 2)} <span>${ar ? 'حذف هذا الالتزام' : 'Delete obligation'}</span>
      </button>
    `}
    <button type="button" class="btn plain" data-act="car-timeline" style="margin-top:4px">${M.t('timeline')}</button>`);
};

M.acts['car-item-del'] = el => {
  const id = el.dataset.id;
  M.s.carItems = (M.s.carItems || []).filter(x => x.id !== id);
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateCar({ carItems: M.s.carItems }).catch(() => {});
  }
  M.sheet.close();
  M.render();
  M.toast(`${M.ico('trash', 15, 2)} ${M.s.lang === 'ar' ? 'تم حذف الالتزام' : 'Obligation deleted'}`);
};

/* Direct Petrol Fill-Up Logger (Enter Price -> Deduct from Wallet & Add to Car Fuel Log) */
M.saveFuelFillUp = f => {
  const ar = M.s.lang === 'ar';
  const raw = M.toWesternDigits(String(f.fuelPrice?.value || '')).replace(/[^\d.]/g, '');
  const price = parseFloat(raw);
  if (!(price > 0)) {
    M.toast(ar ? 'يرجى كتابة سعر تعبئة البنزين' : 'Please enter the petrol fill-up price');
    return;
  }
  const now = new Date();
  const h = now.getHours() % 12 || 12;
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
  const newP = {
    id: Date.now(),
    member: M.s.currentMemberId || 'abu',
    merchant: { ar: 'تعبئة بنزين', en: 'Petrol Fill-Up' },
    cat: 'car',
    amount: price,
    day: M.s.day || now.getDate() || 14,
    time: `${h}:${mm} ${ampm}`,
    scanned: false,
    items: [{ n: { ar: 'تعبئة بنزين', en: 'Petrol Fill-Up' }, q: 1, p: price }]
  };
  if (!Array.isArray(M.s.purchases)) M.s.purchases = [];
  M.s.purchases.unshift(newP);
  M.s.car = M.s.car || { n: { ar: 'سيارة العائلة', en: 'Family Car' }, plate: '', odo: 0, oilInterval: 7000, nextOil: 7000, fuelUsed: 0 };
  M.s.car.fuelUsed = (Number(M.s.car.fuelUsed) || 0) + price;
  M.tickerNew = true;
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.addPurchase(newP).catch(() => {});
    M.api.updateCar({ car: M.s.car }).catch(() => {});
  }
  if (f.fuelPrice) f.fuelPrice.value = '';
  if (M.sheet?.isOpen) M.sheet.close();
  M.render();
  M.checkThreshold();
  M.toast(`${M.ico('fuel', 16, 2)} ${ar ? `تم تسجيل تعبئة البنزين: ${M.fmt(price)} ${M.t('cur')}` : `Logged petrol fill-up: ${M.fmt(price)} ${M.t('cur')}`}`);
};
