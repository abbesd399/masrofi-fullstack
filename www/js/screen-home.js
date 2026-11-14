/* Tab 1 — Home dashboard: AI monthly alert banner (7,000 km oil + bills) · hero salary card · family strip · simplified profile */
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
  const s = M.s, c = M.calc();
  const last = (s.purchases || [])[0];
  const lm = last ? M.member(last.member) : null;
  const ar = s.lang === 'ar';
  const aiAlert = M.getMonthlyAIAlert ? M.getMonthlyAIAlert() : { title: M.t('alertTitle'), body: '', oil: { dueThisMonth: false }, unpaid: [] };

  let banner = '';
  if (s.bannerHidden) {
    banner = `<button type="button" class="banner-mini anim" data-act="banner-show">${M.ico('spark', 14)} ${aiAlert.title}</button>`;
  } else {
    banner = `<div class="banner anim" data-act="banner-open" id="banner">
      <span class="b-ico">${M.ico('spark', 18, 2)}</span>
      <div class="b-txt"><b>${aiAlert.title}</b>${aiAlert.body}</div>
      <button type="button" class="b-x" data-act="banner-hide" aria-label="dismiss">${M.ico('close', 14, 2.4)}</button>
    </div>`;
  }

  const tickerHtml = last
    ? `<div class="ticker" data-act="receipt" data-id="${last.id}">
        ${M.avatar(last.member, 'sm')}
        <span class="tk-txt ${M.tickerNew ? 'new' : ''}"><b>${M.L(lm.n)}</b> · ${M.L(last.merchant)} · <span class="priv">${M.moneyNeg(last.amount)}</span></span>
        <span class="muted small" style="flex:none">${last.time}</span>
      </div>`
    : `<div class="ticker" data-act="add-purch-open">
        <span class="tile" style="--c:var(--primary);width:30px;height:30px;border-radius:9px">${M.ico('plus', 15, 2.3)}</span>
        <span class="tk-txt muted">${ar ? 'لا توجد مشتريات مسجلة بعد — اضغط لتسجيل أول عملية أو مسح إيصال' : 'No purchases recorded yet — tap to record or scan a receipt'}</span>
      </div>`;

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
    <div class="sec-h">
      <h3>${M.L(s.familyName || { ar: M.t('family'), en: M.t('family') })}</h3>
      <button type="button" class="badge safe" data-act="family-invite" style="cursor:pointer;border:0">
        <span class="pulse"></span>
        <span>${s.familyCode ? `${ar ? 'كود العائلة:' : 'Code:'} ${s.familyCode}` : M.t('live')}</span>
      </button>
    </div>
    <div class="fam-avs">
      ${M.MEMBERS.map(m => `<div class="fam-av" data-act="member" data-id="${m.id}">
        <span class="av has-char ring" style="--avc:${m.c || '#0D9488'}">${M.charSvg(m.id)}${last && m.id === last.member ? '<span class="live"></span>' : ''}</span>
        <span>${m.id === (s.currentMemberId || 'abu') ? (ar ? `${M.L(m.n)} (أنا)` : `${M.L(m.n)}`) : M.L(m.n)}</span>
      </div>`).join('')}
      <div class="fam-av fam-add" data-act="family-invite"><span class="av">${M.ico('plus', 18)}</span><span>${ar ? 'دعوة فرد' : 'Invite'}</span></div>
    </div>
    ${tickerHtml}
  </div>`;
};

M.afterHome = () => {
  M.animateGauge();
  const el = document.getElementById('bigBal');
  if (el) { const to = M.calc().spendable; M.countUp(el, to); M.prevBal = to; }
  M.tickerNew = false;
};

/* ── home actions & sheets ── */
M.acts['banner-hide'] = (el, ev) => {
  ev.stopPropagation();
  M.s.bannerHidden = true;
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateConfig({ bannerHidden: true }).catch(() => {});
  }
  M.render();
};
M.acts['banner-show'] = () => {
  M.s.bannerHidden = false;
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateConfig({ bannerHidden: false }).catch(() => {});
  }
  M.render();
};
M.acts['banner-open'] = () => {
  const ar = M.s.lang === 'ar';
  const aiAlert = M.getMonthlyAIAlert ? M.getMonthlyAIAlert() : { title: M.t('alertTitle'), body: '', oil: M.getCarOilStatus(), unpaid: [] };
  const oil = aiAlert.oil;
  const unpaid = aiAlert.unpaid || [];

  M.sheet.open(aiAlert.title, `
    <div class="alert-box" style="--bc:var(--primary)">
      <span class="ab-i">${M.ico('spark', 20)}</span>
      <div><b>${ar ? 'المساعد الذكي لهذا الشهر' : 'Monthly AI Assistant'}</b> — ${aiAlert.body}</div>
    </div>

    <div class="sec-h" style="margin-top:4px"><h3>${ar ? 'متابعة زيت السيارة (دائماً عند 7,000 كم)' : 'Car Oil Change Tracker (Always at 7,000 km)'}</h3></div>
    <div class="group">
      <div class="row" data-act="goto-car">
        <span class="tile" style="--c:#F59E0B">${M.ico('drop', 20)}</span>
        <div class="r-main">
          <div class="r-t">${ar ? 'تغيير زيت المحرك (كل 7,000 كم)' : 'Engine Oil Change (Every 7,000 km)'} <span class="badge info">AI</span></div>
          <div class="r-s">${ar ? `العداد: ${M.fmt(oil.odo)} كم · التغيير عند: ${M.fmt(oil.nextOil)} كم` : `Current: ${M.fmt(oil.odo)} km · Always at: ${M.fmt(oil.nextOil)} km`}</div>
        </div>
        <div class="count ${oil.toOil <= 1000 ? 'crit' : 'warn'}"><b class="num">${M.fmt(oil.toOil)}</b><span>${M.t('km')}</span></div>
      </div>
    </div>

    <div class="sec-h" style="margin-top:4px"><h3>${ar ? 'تعبئة البنزين (اكتب سعر التعبئة)' : 'Petrol Fill-Up (Enter Price)'}</h3></div>
    <form class="add-item" data-form="fuel-add">
      <div class="add-row">
        <div class="in-wrap in-price" style="flex:1">
          <input name="fuelPrice" type="text" inputmode="decimal" required placeholder="${ar ? 'سعر التعبئة (مثال: 1500 د.ج)' : 'Enter petrol fill-up price (e.g. 1500 DZD)'}" autocomplete="off">
        </div>
        <button type="submit" class="btn sm" style="height:44px;padding:0 14px;border-radius:12px;flex:none">
          ${M.ico('fuel', 15, 2.2)} <span>${ar ? 'تسجيل البنزين' : 'Save Fuel'}</span>
        </button>
      </div>
    </form>

    ${unpaid.length ? `
      <div class="sec-h" style="margin-top:4px"><h3>${ar ? 'فواتير هذا الشهر غير المسددة' : 'Unpaid Bills This Month'}</h3></div>
      <div class="group">${unpaid.map(b => `<div class="row" data-act="bill" data-id="${b.id}">${M.tile(b.cat)}
        <div class="r-main"><div class="r-t">${M.L(b.n)}</div>
          <div class="r-s"><span>${M.t('dueOn')(M.dateStr(b.due))}</span> · <span class="b-kind ${b.kind === 'var' ? 'var' : 'fixed'}">${M.t(b.kind === 'var' ? 'billVar' : 'billFixed')}</span></div></div>
        <div class="r-end"><div class="r-amt priv">${M.money(b.amount)}</div><span class="badge info">${M.t('reservedAuto')}</span></div></div>`).join('')}</div>
    ` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
      <button type="button" class="btn tonal" data-act="ai-month-notify">${M.ico('bell', 16, 2)} <span>${ar ? 'إرسال إشعار الشهر' : 'Send Month Alert'}</span></button>
      <button type="button" class="btn" data-act="goto-car">${M.ico('car', 16, 2)} <span>${ar ? 'قسم السيارة والفواتير' : 'Car & Bills Hub'}</span></button>
    </div>`);
};
M.acts['goto-bills'] = () => { M.sheet.close(); M.s.billSeg = 'bills'; M.go('bills'); };
M.acts['goto-car'] = () => { M.sheet.close(); M.s.billSeg = 'car'; M.go('bills'); };
M.acts.privacy = (el, ev) => {
  ev.stopPropagation(); M.s.privacy = !M.s.privacy;
  M.phone().classList.toggle('blurred', M.s.privacy);
  el.innerHTML = M.ico(M.s.privacy ? 'eyeOff' : 'eye', 17, 2);
  M.replayAnim(el, 'bump', 420);
  M.toast(M.t(M.s.privacy ? 'privacyOn' : 'privacyOff'));
};

/* ── Family Invite Code, Shareable Link & Simplified Add Member Sheet (No Role Picker) ── */
M.acts['family-invite'] = () => {
  const ar = M.s.lang === 'ar';
  if (!M.s.familyCode) {
    M.s.familyCode = M.genFamilyCode();
    if (M.api) M.api.saveLocal(M.s);
  }
  const code = M.s.familyCode;
  const baseHref = (typeof window !== 'undefined' && window.location.protocol.startsWith('http'))
    ? (window.location.origin + window.location.pathname)
    : 'https://masrofi.app/';
  const inviteLink = `${baseHref}?join=${encodeURIComponent(code)}`;

  M.sheet.open(ar ? 'دعوة وإضافة فرد للعائلة' : 'Invite & Add Family Member', `
    <div class="fam-code-card">
      <div class="small muted">${ar ? 'كود ربط العائلة الموحد (Realtime) — شاركه مع أفراد عائلتك للدخول لنفس المحفظة' : 'Shared Family Realtime Code — share with family to join this wallet'}</div>
      <div class="fam-code-val" id="famCodeVal">${code}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button type="button" class="btn sm tonal" data-act="copy-fam-code" style="width:100%;height:40px;border-radius:11px">
          ${M.ico('copy', 15, 2)} <span>${ar ? 'نسخ الكود' : 'Copy Code'}</span>
        </button>
        <button type="button" class="btn sm" data-act="share-fam-link" data-link="${inviteLink}" data-code="${code}" style="width:100%;height:40px;border-radius:11px">
          ${M.ico('share', 15, 2)} <span>${ar ? 'مشاركة الرابط' : 'Share Link'}</span>
        </button>
      </div>
    </div>

    <div class="sec-h" style="margin:4px 0 0"><h3>${ar ? 'إضافة فرد جديد للمحفظة' : 'Add Family Member'}</h3></div>
    <form class="manual-form" data-form="add-member">
      <label>${ar ? 'الاسم' : 'Name'}
        <input name="mname" required placeholder="${ar ? 'مثال: محمد، سارة…' : 'e.g. Sarah, Mohamed…'}" autocomplete="off">
      </label>
      <label>${ar ? 'لون أيقونة البروفايل' : 'Profile Badge Color'}
        <div class="av-grid" id="addMemAvGrid">
          ${[['umm', ar ? 'أزرق' : 'Blue'], ['khalid', ar ? 'بنفسجي' : 'Purple'], ['sara', ar ? 'ذهبي' : 'Amber'], ['abu', ar ? 'زمردي' : 'Teal']].map(([avKey, lbl], idx) => `
            <div class="av-pick ${idx === 0 ? 'on' : ''}" data-act="pick-av" data-v="${avKey}">
              <span class="av has-char">${M.CHARS[avKey]}</span>
              <span>${lbl}</span>
            </div>
          `).join('')}
        </div>
        <input type="hidden" name="avatar" value="umm">
      </label>
      <button class="btn" type="submit">${M.ico('plus', 18, 2.5)} <span>${ar ? 'إضافة للعائلة' : 'Add Member'}</span></button>
    </form>

    <div class="group" style="margin-top:4px;padding:12px 14px">
      <form class="manual-form" data-form="join-code">
        <label>${ar ? 'أو هل لديك كود عائلة أخرى تريد الانضمام إليها؟' : 'Or join an existing family wallet with a code:'}
          <div style="display:flex;gap:8px;margin-top:4px">
            <input name="jcode" dir="ltr" placeholder="MSR-XXXX" style="flex:1;text-transform:uppercase">
            <button class="btn sm tonal" type="submit" style="height:44px;border-radius:11px;padding:0 16px">${ar ? 'انضمام' : 'Join'}</button>
          </div>
        </label>
      </form>
    </div>
  `);
};

M.acts['pick-av'] = el => {
  const wrap = el.parentElement;
  wrap.querySelectorAll('.av-pick').forEach(p => p.classList.toggle('on', p === el));
  const inp = wrap.parentElement.querySelector('input[name="avatar"]');
  if (inp) inp.value = el.dataset.v;
};

M.acts['copy-fam-code'] = () => {
  const ar = M.s.lang === 'ar';
  const code = M.s.familyCode || '';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).catch(() => {});
  }
  M.toast(`${M.ico('checkc', 16)} ${ar ? 'تم نسخ كود العائلة:' : 'Copied code:'} ${code}`);
};

M.acts['share-fam-link'] = async el => {
  const ar = M.s.lang === 'ar';
  const code = el.dataset.code || M.s.familyCode;
  const link = el.dataset.link || window.location.href;
  const text = ar
    ? `انضم إلى محفظة عائلتنا في تطبيق مصروفي (Masrofi)!\nكود العائلة: ${code}\nرابط الانضمام المباشر:\n${link}`
    : `Join our family wallet on Masrofi!\nFamily Code: ${code}\nDirect link:\n${link}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Masrofi · مصروفي', text, url: link });
      return;
    } catch {}
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
  M.toast(`${M.ico('checkc', 16)} ${ar ? 'تم نسخ رابط وكود الدعوة للمشاركة' : 'Invite link & code copied'}`);
};

M.saveAddMember = f => {
  const ar = M.s.lang === 'ar';
  const name = (f.mname.value || '').trim();
  const avatar = f.avatar?.value || 'umm';
  if (!name) return;
  const id = 'mem_' + Date.now().toString(36);
  const c = M.AVATAR_COLORS[avatar] || '#3B82F6';
  const newMem = {
    id,
    avatar,
    n: { ar: name, en: name },
    i: { ar: name[0], en: name[0].toUpperCase() },
    c,
    role: { ar: 'العائلة', en: 'Family' }
  };
  M.s.members = [...M.MEMBERS, newMem];
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateConfig({ members: M.s.members, familyCode: M.s.familyCode }).catch(() => {});
  }
  M.sheet.close();
  M.render();
  M.toast(`${M.ico('checkc', 16)} ${ar ? 'تمت إضافة ' + name + ' للعائلة' : name + ' added to family'}`);
};

M.saveJoinFamilyCode = async f => {
  const ar = M.s.lang === 'ar';
  const code = (f.jcode.value || '').trim().toUpperCase();
  if (!code || code.length < 4) return;
  M.s.familyCode = code;
  if (M.api) {
    M.api.saveLocal(M.s);
    const remote = await M.api.pullStateFromSupabaseDirect(code);
    if (remote) {
      const me = M.currentUser();
      Object.assign(M.s, remote, { onboarded: true, familyCode: code });
      if (me && !M.s.members.some(m => m.n?.ar === me.n?.ar)) {
        M.s.members.push(me);
      }
      M.api.saveLocal(M.s);
    } else {
      M.api.updateConfig({ familyCode: code, members: M.s.members }).catch(() => {});
    }
  }
  M.sheet.close();
  M.render();
  M.toast(`${M.ico('checkc', 16)} ${ar ? 'تم الربط بمحفظة العائلة: ' : 'Joined family wallet: '}${code}`);
};

M.acts.hero = () => {
  const s = M.s, c = M.calc(), col = { safe: 'var(--safe)', warn: 'var(--warn)', crit: 'var(--crit)' }[c.state];
  const unpaid = (s.bills || []).filter(b => !b.paid);
  M.sheet.open(M.t('breakdown'), `
    <div class="alert-box" style="--bc:${col}"><span class="ab-i">${M.ico(c.state === 'safe' ? 'checkc' : 'alert', 20)}</span><div><b>${M.t('st' + c.state[0].toUpperCase() + c.state.slice(1))}</b> — ${M.t(c.state + 'Msg')}</div></div>
    <div class="group priv">
      <div class="kv"><span>${M.t('salary')}</span><b style="display:flex;align-items:center;gap:6px">${M.money(s.salary)} <button type="button" class="inline-edit-btn" data-act="edit-salary">${M.ico('pen', 13, 2)}</button></b></div>
      <div class="kv"><span>${M.t('spent')}</span><b>${M.moneyNeg(c.spent)}</b></div>
      <div class="kv"><span>${M.t('reserved')}</span><b style="color:var(--warn)">${M.money(c.reserved)}</b></div>
      <div class="kv"><span>${M.t('trueBal')}</span><b style="color:var(--primary);font-size:18px">${M.money(c.spendable)}</b></div>
      <div class="kv"><span>${M.t('daily')}</span><b>${M.money(c.daily)}</b></div>
    </div>
    ${unpaid.length ? `<div><div class="sec-h"><h3>${M.t('upcoming')}</h3></div><div class="group">
      ${unpaid.map(b => `<div class="row" data-act="bill" data-id="${b.id}">${M.tile(b.cat, 38)}<div class="r-main"><div class="r-t">${M.L(b.n)}</div><div class="r-s"><span>${M.t('dueOn')(M.dateStr(b.due))}</span> · <span class="b-kind ${b.kind === 'var' ? 'var' : 'fixed'}">${M.t(b.kind === 'var' ? 'billVar' : 'billFixed')}</span></div></div><div class="r-amt priv">${M.money(b.amount)}</div></div>`).join('')}
    </div></div>` : ''}`);
};

M.acts['edit-salary'] = () => {
  const ar = M.s.lang === 'ar';
  M.sheet.open(M.t('editSalary'), `<form class="manual-form" data-form="salary-edit">
    <label>${M.t('salary')} (${M.t('cur')})<input name="sal" type="text" inputmode="numeric" required value="${M.s.salary || ''}"></label>
    <label>${ar ? 'يوم نزول الراتب في الشهر (1 - 31)' : 'Payday of month (1 - 31)'}<input name="payday" type="text" inputmode="numeric" value="${M.s.payday || 1}"></label>
    <button class="btn" type="submit">${M.ico('check', 18, 2.5)} ${M.t('save')}</button>
  </form>`);
};

M.saveSalaryEdit = f => {
  const raw = typeof f.sal.value === 'string' ? M.toWesternDigits(f.sal.value) : f.sal.value;
  const v = parseFloat(raw);
  if (!(v > 0)) return;
  M.s.salary = v;
  if (f.payday) {
    const pd = parseInt(M.toWesternDigits(String(f.payday.value)), 10);
    if (pd >= 1 && pd <= 31) M.s.payday = pd;
  }
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateSalary(v).catch(() => {});
  }
  M.sheet.close();
  M.render();
  M.checkThreshold();
  M.toast(`${M.ico('checkc', 16, 2)} ${M.t('salaryUpdated')}: ${M.fmt(v)} ${M.t('cur')}`);
};

/* Simplified, Clean Profile Sheet + Inline Edit Name & Color (No Role Clutter) */
M.acts.member = el => {
  const ar = M.s.lang === 'ar';
  const m = M.member(el.dataset.id), list = (M.s.purchases || []).filter(p => p.member === m.id);
  const total = list.reduce((a, p) => a + p.amount, 0);
  M.sheet.open(M.L(m.n), `
    <div class="sheet-profile">
      ${M.avatar(m.id, 'lg ring')}
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px">
          <b style="font-size:15px">${M.L(m.n)}</b>
          <button type="button" class="inline-edit-btn" data-act="edit-member-open" data-id="${m.id}" title="${ar ? 'تعديل الحساب' : 'Edit Profile'}">${M.ico('pen', 12, 2)}</button>
        </div>
        <div style="font-size:21px;font-weight:800;margin:4px 0 2px" class="priv">${M.money(total)}</div>
        <div class="muted small">${M.t('spentBy')} · ${list.length} ${M.t('purchases')}</div>
      </div>
      <button type="button" class="btn sm tonal" data-act="family-invite">${M.ico('share', 14, 2)} <span>${ar ? 'كود العائلة' : 'Invite'}</span></button>
    </div>
    <div class="group">${list.map(M.purchaseRow).join('') || `<div class="empty">${M.illu('cart')}<p>${ar ? 'لا توجد مشتريات مسجلة لهذا الفرد بعد' : 'No purchases recorded yet'}</p></div>`}</div>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button type="button" class="btn tonal" data-act="edit-member-open" data-id="${m.id}" style="flex:1">${M.ico('user', 15, 2)} <span>${ar ? 'تعديل البروفايل' : 'Edit Profile'}</span></button>
      <button type="button" class="btn tonal" data-act="edit-salary" style="flex:1">${M.ico('wallet', 15, 2)} <span>${M.t('editSalary')}</span></button>
    </div>`);
};

M.acts['edit-member-open'] = el => {
  const ar = M.s.lang === 'ar';
  const m = M.member(el.dataset.id || M.s.currentMemberId);
  M.sheet.open(ar ? 'تعديل البروفايل' : 'Edit Profile', `
    <form class="manual-form" data-form="edit-member" data-id="${m.id}">
      <label>${ar ? 'الاسم' : 'Name'}
        <input name="mname" required value="${M.L(m.n)}" autocomplete="off">
      </label>
      <label>${ar ? 'لون أيقونة البروفايل' : 'Profile Badge Color'}
        <div class="av-grid">
          ${[['abu', ar ? 'زمردي' : 'Teal'], ['umm', ar ? 'أزرق' : 'Blue'], ['khalid', ar ? 'بنفسجي' : 'Purple'], ['sara', ar ? 'ذهبي' : 'Amber']].map(([avKey, lbl]) => `
            <div class="av-pick ${(m.avatar || m.id) === avKey ? 'on' : ''}" data-act="pick-av" data-v="${avKey}">
              <span class="av has-char">${M.CHARS[avKey]}</span>
              <span>${lbl}</span>
            </div>
          `).join('')}
        </div>
        <input type="hidden" name="avatar" value="${m.avatar || 'abu'}">
      </label>
      <button class="btn" type="submit">${M.ico('check', 18, 2.5)} <span>${M.t('save')}</span></button>
    </form>
  `);
};

M.saveEditMember = f => {
  const ar = M.s.lang === 'ar';
  const m = M.member(f.dataset.id);
  if (!m) return;
  const name = (f.mname?.value || '').trim();
  const avatar = f.avatar?.value || m.avatar || 'abu';
  if (!name) return;
  m.n = { ar: name, en: name };
  m.i = { ar: name[0], en: name[0].toUpperCase() };
  m.avatar = avatar;
  m.c = M.AVATAR_COLORS[avatar] || '#0D9488';
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateConfig({ members: M.s.members }).catch(() => {});
  }
  M.sheet.close();
  M.render();
  M.toast(`${M.ico('checkc', 16)} ${ar ? 'تم تحديث البروفايل' : 'Profile updated'}`);
};

M.acts['reopen-onboarding'] = () => {
  M.sheet.close();
  M.openOnboarding(2);
};

M.purchaseRow = p => `<div class="row" data-act="receipt" data-id="${p.id}">${M.tile(p.cat)}
  <div class="r-main">
    <div class="r-t">${M.L(p.merchant)}</div>
    <div class="r-s">${M.avatar(p.member, 'xs')} <span class="r-s-txt">${M.L(M.member(p.member).n)} · ${M.dayLabel(p.day)} ${p.time}</span>${p.scanned ? `<span class="scan-tag" title="Scanned">${M.ico('scan', 11, 2)}</span>` : ''}</div>
  </div>
  <div class="r-end"><div class="r-amt priv">${M.moneyNeg(p.amount)}</div></div></div>`;

M.acts.receipt = el => {
  const p = (M.s.purchases || []).find(x => x.id == el.dataset.id); if (!p) return;
  const m = M.member(p.member);
  M.sheet.open(M.t('receipt'), `
    <div style="display:flex;gap:14px;align-items:center">${M.tile(p.cat, 52)}
      <div><div style="font-size:18px;font-weight:700">${M.L(p.merchant)}</div><div class="muted small">${M.L(M.CATS[p.cat]?.n || M.CATS.groceries.n)} · ${M.dayLabel(p.day)} ${p.time}</div></div></div>
    <div class="group">${(p.items || []).map(it => `<div class="kv"><span>${M.L(it.n)} <span class="muted">×${it.q}</span></span><b class="priv">${M.money(it.p * it.q)}</b></div>`).join('')}
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
  const delItem = (M.s.purchases || []).find(p => p.id == id);
  if (delItem && delItem.cat === 'car' && M.s.car) {
    M.s.car.fuelUsed = Math.max(0, (Number(M.s.car.fuelUsed) || 0) - Number(delItem.amount || 0));
  }
  M.s.purchases = (M.s.purchases || []).filter(p => p.id != id);
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.deletePurchase(id).catch(() => {});
  }
  M.sheet.close();
  M.render();
  M.checkThreshold();
  M.toast(`${M.ico('trash', 15, 2)} ${M.s.lang === 'ar' ? 'تم حذف العملية' : 'Transaction deleted'}`);
};
