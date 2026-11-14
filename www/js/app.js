/* Masrofi — Native App Controller + Registration/Onboarding + Permissions + Family Code & Live Sync */
M.s = Object.assign(M.seed(), { os: 'ios', theme: 'light', lang: 'ar', tab: 'home', billSeg: 'bills', famSeg: 'feed', privacy: false });
M.TABS = [['home', 'home'], ['bills', 'receipt'], ['family', 'users'], ['insights', 'spark']];

M.onb = {
  step: 1,
  mode: 'create', // 'create' | 'join'
  avatar: 'abu',
  camPerm: false,
  notifPerm: false,
  userName: '',
  userRole: '',
  familyName: '',
  joinCode: ''
};

M.statusbarHtml = () => {
  const sig = `<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>`;
  const wifi = `<svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.2c2.4 0 4.6.9 6.2 2.4l1.2-1.3A10.6 10.6 0 0 0 8 .4 10.6 10.6 0 0 0 .6 3.3l1.2 1.3A8.8 8.8 0 0 1 8 2.2zm0 3.6c1.4 0 2.7.5 3.7 1.4l1.2-1.3a7.3 7.3 0 0 0-9.8 0l1.2 1.3c1-.9 2.3-1.4 3.7-1.4zM8 9.3l2-2.1a3 3 0 0 0-4 0z"/></svg>`;
  const bat = M.s.os === 'ios'
    ? `<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="17" height="9" rx="2" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="currentColor" opacity=".45"/></svg>`
    : `<svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor"><rect x="3.5" y="0" width="5" height="2" rx=".5"/><rect x="1" y="2" width="10" height="14" rx="1.5"/></svg>`;
  return M.s.os === 'ios' ? `<span>9:41</span><span class="sb-icons">${sig}${wifi}${bat}</span>` : `<span>9:41</span><span class="sb-icons">${wifi}${sig}${bat}</span>`;
};

M.appbarHtml = () => {
  const s = M.s, ar = s.lang === 'ar';
  const curUser = M.currentUser();
  const helloTxt = s.onboarded && curUser ? `${ar ? 'أهلاً، ' : 'Hello, '}${M.L(curUser.n)} 👋` : M.t('hello');
  const famLabel = s.familyName ? M.L(s.familyName) : M.t('november');
  const titles = { home: helloTxt, bills: M.t('billsT'), family: M.t('familyT'), insights: M.t('insightsT') };
  const unpaid = (s.bills || []).filter(b => !b.paid).length;
  const curId = curUser?.id || 'abu';
  return `<div class="ab-title">${s.tab === 'home' ? `<div class="ab-sub">${famLabel} · ${M.t('november')}</div>` : ''}<h2 style="${s.tab === 'home' ? 'font-size:18px;line-height:1.3;white-space:nowrap' : ''}">${titles[s.tab]}</h2></div>
    <button type="button" class="icon-btn" data-act="bell" id="bell" aria-label="alerts">${M.ico('bell', 20)}${unpaid ? '<span class="dot"></span>' : ''}</button>
    ${s.tab === 'home' ? M.avatar(curId, 'ring', `style="width:40px;height:40px;cursor:pointer" data-act="member" data-id="${curId}"`) : ''}`;
};

M.navHtml = () => {
  const items = M.TABS.map(([k, ico], i) => `<button type="button" class="nav-item ${M.s.tab === k ? 'on' : ''}" data-act="tab" data-id="${k}"><span class="ni-ico">${M.ico(ico, M.s.os === 'ios' ? 23 : 22, M.s.tab === k ? 2.15 : 1.75)}</span>${M.t('nav')[i]}</button>`);
  items.splice(2, 0, `<button type="button" class="nav-scan" data-act="open-scan" aria-label="scan"><span>${M.ico('camera', 24, 2)}</span></button>`);
  return items.join('');
};

/* ── Native Onboarding & Registration Wizard (#onboarding) ── */
M.checkPermissionsState = async () => {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      M.onb.notifPerm = true;
    }
    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      const cam = await navigator.permissions.query({ name: 'camera' }).catch(() => null);
      if (cam && cam.state === 'granted') M.onb.camPerm = true;
    }
  } catch {}
};

M.openOnboarding = (step = 1) => {
  const box = M.$('#onboarding');
  if (!box) return;
  M.onb.step = step;
  if (M.s.onboarded) {
    const u = M.currentUser();
    M.onb.userName = M.L(u.n);
    M.onb.userRole = M.L(u.role);
    M.onb.avatar = u.avatar || 'abu';
    M.onb.familyName = M.L(M.s.familyName || { ar: 'عائلتنا', en: 'Our Family' });
  }
  M.checkPermissionsState().then(() => M.renderOnboarding());
  box.classList.add('on');
};

M.closeOnboarding = () => {
  const box = M.$('#onboarding');
  if (box) box.classList.remove('on');
};

M.renderOnboarding = () => {
  const box = M.$('#onboarding');
  if (!box) return;
  const ar = M.s.lang === 'ar';
  const st = M.onb.step || 1;
  const hasAiKey = Boolean(M.api?.getIntegrations()?.aiApiKey);

  let stepHtml = '';
  if (st === 1) {
    stepHtml = `
      <div class="onb-card">
        <div class="onb-sec-t">${M.ico('shield', 16)} <span>${ar ? 'الخطوة 1 من 3 · تراخيص التطبيق الأصلي' : 'Step 1 of 3 · Native App Permissions'}</span></div>
        <p style="margin:0;font-size:12.5px;color:var(--muted);line-height:1.5">
          ${ar ? 'يحتاج تطبيق مصروفي إلى صلاحية الكاميرا لفتح الماسح الضوئي مباشرة داخل التطبيق، وصلاحية التنبيهات لتذكيرك بمواعيد الفواتير ومشتريات العائلة لحظياً.' : 'Masrofi needs camera access to scan receipts directly inside the app, and notifications for real-time family alerts.'}
        </p>

        <div class="perm-item">
          <div class="perm-ico">${M.ico('camera', 21)}</div>
          <div class="perm-txt">
            <b>${ar ? 'الكاميرا المباشرة داخل التطبيق' : 'In-App Live Camera'}</b>
            <span>${ar ? 'لتصوير الفواتير والوصولات مباشرة من داخل التطبيق دون الخروج منه' : 'Scan receipts and bills right inside the app'}</span>
          </div>
          <button type="button" class="perm-btn ${M.onb.camPerm ? 'ok' : ''}" data-act="onb-perm-cam">
            ${M.onb.camPerm ? (ar ? '✓ مفعّل' : '✓ Granted') : (ar ? 'تفعيل' : 'Allow')}
          </button>
        </div>

        <div class="perm-item">
          <div class="perm-ico">${M.ico('bell', 21)}</div>
          <div class="perm-txt">
            <b>${ar ? 'الإشعارات والتنبيهات الفورية' : 'Instant Push Alerts'}</b>
            <span>${ar ? 'تنبيه عند اقتراب الفواتير أو تسجيل مشتريات جديدة من أفراد العائلة' : 'Alerts for upcoming bills and family purchases'}</span>
          </div>
          <button type="button" class="perm-btn ${M.onb.notifPerm ? 'ok' : ''}" data-act="onb-perm-notif">
            ${M.onb.notifPerm ? (ar ? '✓ مفعّل' : '✓ Granted') : (ar ? 'تفعيل' : 'Allow')}
          </button>
        </div>

        <button type="button" class="btn" data-act="onb-next" data-step="2">
          <span>${ar ? 'متابعة إلى إعداد الحساب والعائلة' : 'Continue to Account & Family Setup'}</span> ${M.ico('chevL', 16)}
        </button>
      </div>`;
  } else if (st === 2) {
    const isJoin = M.onb.mode === 'join';
    stepHtml = `
      <div class="onb-card">
        <div class="onb-sec-t">${M.ico('users', 16)} <span>${ar ? 'الخطوة 2 من 3 · التسجيل وربط العائلة' : 'Step 2 of 3 · Profile & Family Wallet'}</span></div>
        <div class="segc" style="--n:2;margin:0">
          <span class="thumb" style="inset-inline-start:${isJoin ? 'calc(3px + (100% - 6px)/2)' : '3px'}"></span>
          <button type="button" class="${!isJoin ? 'on' : ''}" data-act="onb-mode" data-v="create">${ar ? 'إنشاء محفظة عائلة' : 'Create Family'}</button>
          <button type="button" class="${isJoin ? 'on' : ''}" data-act="onb-mode" data-v="join">${ar ? 'انضمام بكود عائلة' : 'Join via Code'}</button>
        </div>

        <form class="manual-form" data-form="onb-step2">
          <label>${ar ? 'اسمك الشخصي (كما يظهر للعائلة)' : 'Your Name'}
            <input name="userName" required placeholder="${ar ? 'مثال: عباس / أبو خالد' : 'e.g. Abbes / Abu Khalid'}" value="${M.onb.userName || ''}" autocomplete="off">
          </label>
          <label>${ar ? 'صفتك في العائلة' : 'Your Family Role'}
            <input name="userRole" placeholder="${ar ? 'مثال: رب الأسرة · مدير المحفظة' : 'e.g. Family Admin'}" value="${M.onb.userRole || (ar ? 'مدير المحفظة' : 'Wallet Admin')}" autocomplete="off">
          </label>
          <label>${ar ? 'اختر صورتك الرمزية' : 'Choose Your Avatar'}
            <div class="av-grid">
              ${[['abu', ar ? 'أب / شاب' : 'Dad'], ['umm', ar ? 'أم / سيدة' : 'Mom'], ['khalid', ar ? 'ابن' : 'Son'], ['sara', ar ? 'ابنة' : 'Daughter']].map(([k, lbl]) => `
                <button type="button" class="av-opt ${M.onb.avatar === k ? 'on' : ''}" data-act="onb-avatar" data-v="${k}">
                  <div class="av has-char" style="width:38px;height:38px">${M.charSvg(k)}</div>
                  <span>${lbl}</span>
                </button>`).join('')}
            </div>
          </label>
          ${!isJoin ? `
            <label>${ar ? 'اسم محفظة العائلة' : 'Family Wallet Name'}
              <input name="familyName" required placeholder="${ar ? 'مثال: عائلة عباس' : 'e.g. Abbes Family'}" value="${M.onb.familyName || (ar ? 'محفظة العائلة' : 'Family Wallet')}" autocomplete="off">
            </label>
          ` : `
            <label>${ar ? 'كود دعوة العائلة (MSR-XXXX)' : 'Family Invite Code (MSR-XXXX)'}
              <input name="joinCode" required placeholder="MSR-2026" value="${M.onb.joinCode || ''}" style="text-transform:uppercase;text-align:center;font-weight:900;letter-spacing:2px;direction:ltr" autocomplete="off">
            </label>
          `}
          <div style="display:grid;grid-template-columns:auto 1fr;gap:8px;margin-top:4px">
            <button type="button" class="btn ghost" style="width:auto;padding:0 16px" data-act="onb-prev" data-step="1">${ar ? 'السابق' : 'Back'}</button>
            <button type="submit" class="btn">${isJoin ? (ar ? 'انضمام ومزامنة العائلة الآن' : 'Join Family Now') : (ar ? 'متابعة لإدخال الراتب والبيانات' : 'Next: Financial Setup')}</button>
          </div>
        </form>
      </div>`;
  } else {
    const salVal = M.s.salary > 0 ? M.s.salary : '';
    const carName = M.s.car?.n ? M.L(M.s.car.n) : '';
    const goalTarget = M.s.goal?.target || 100000;
    stepHtml = `
      <div class="onb-card">
        <div class="onb-sec-t">${M.ico('wallet', 16)} <span>${ar ? 'الخطوة 3 من 3 · الراتب والبيانات الأولية' : 'Step 3 of 3 · Salary & Initial Setup'}</span></div>
        <form class="manual-form" data-form="onb-step3">
          <div style="display:grid;grid-template-columns:1.35fr 1fr;gap:8px">
            <label>${ar ? 'الراتب أو الميزانية الشهرية (' + M.t('cur') + ')' : 'Monthly Salary / Budget (' + M.t('cur') + ')'}
              <input name="salary" type="text" inputmode="decimal" required placeholder="120000" value="${salVal}">
            </label>
            <label>${ar ? 'يوم نزول الراتب بالشهر' : 'Payday (1-30)'}
              <input name="payday" type="text" inputmode="numeric" required placeholder="1" value="${M.s.payday || 1}">
            </label>
          </div>

          <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:8px">
            <label>${ar ? 'اسم السيارة (اختياري)' : 'Car Make/Model (Optional)'}
              <input name="carName" placeholder="${ar ? 'مثال: رونو سامبول' : 'e.g. Renault Symbol'}" value="${carName === 'سيارة العائلة' ? '' : carName}" autocomplete="off">
            </label>
            <label>${ar ? 'ميزانية الوقود الشهرية' : 'Monthly Fuel Budget'}
              <input name="fuelBudget" type="text" inputmode="decimal" placeholder="5000" value="${M.s.car?.fuelBudget || 5000}">
            </label>
          </div>

          <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:8px">
            <label>${ar ? 'اسم هدف التوفير (اختياري)' : 'Savings Goal Title'}
              <input name="goalName" placeholder="${ar ? 'مثال: صندوق الطوارئ / العطلة' : 'e.g. Emergency / Vacation'}" value="${M.s.goal?.name ? M.L(M.s.goal.name) : ''}" autocomplete="off">
            </label>
            <label>${ar ? 'المبلغ المستهدف (' + M.t('cur') + ')' : 'Target Amount'}
              <input name="goalTarget" type="text" inputmode="decimal" placeholder="100000" value="${goalTarget}">
            </label>
          </div>

          <label>${ar ? 'مفتاح الذكاء الاصطناعي المجاني للعائلة (Gemini AI Key - اختياري)' : 'Shared Family Gemini AI Key (Optional)'}
            <input name="aiKey" type="text" placeholder="${hasAiKey ? (ar ? '✓ مفتاح الذكاء الاصطناعي مربوط وجاهز' : '✓ AI Key already configured') : 'AIzaSy...'}" value="${M.api?.getIntegrations()?.aiApiKey || ''}" style="direction:ltr" autocomplete="off">
          </label>

          <div style="display:grid;grid-template-columns:auto 1fr;gap:8px;margin-top:4px">
            <button type="button" class="btn ghost" style="width:auto;padding:0 16px" data-act="onb-prev" data-step="2">${ar ? 'السابق' : 'Back'}</button>
            <button type="submit" class="btn">${M.ico('check', 18, 2.5)} <span>${ar ? 'بدء استخدام تطبيق مصروفي' : 'Start Masrofi App'}</span></button>
          </div>
        </form>
      </div>`;
  }

  const logoSvg = `<svg viewBox="0 0 48 48" fill="none"><rect x="6" y="12" width="36" height="26" rx="8" fill="rgba(255,255,255,.18)" stroke="#fff" stroke-width="2.5"/><path d="M10 12V10a4 4 0 0 1 4-4h20a4 4 0 0 1 4 4v2" stroke="#5EEAD4" stroke-width="2.2"/><circle cx="33" cy="25" r="3" fill="#FDE047"/><path d="M15 22h10M15 28h6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>`;

  box.innerHTML = `
    <div class="onb-head">
      <div class="onb-logo">${logoSvg}</div>
      <h2>${ar ? 'مرحباً بك في مصروفي' : 'Welcome to Masrofi'}</h2>
      <p>${ar ? 'تطبيق المحفظة العائلية الذكي والمباشر لجميع أفراد العائلة' : 'Real-Time Smart Family Finance & Receipt Scanner'}</p>
      <div class="onb-steps-bar">
        <i class="${st >= 1 ? 'on' : ''}"></i>
        <i class="${st >= 2 ? 'on' : ''}"></i>
        <i class="${st >= 3 ? 'on' : ''}"></i>
      </div>
    </div>
    ${stepHtml}`;
};

M.acts['onb-perm-cam'] = async () => {
  const ar = M.s.lang === 'ar';
  try {
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      stream.getTracks().forEach(t => t.stop());
      M.onb.camPerm = true;
      M.toast(ar ? '✓ تم تفعيل صلاحية الكاميرا داخل التطبيق' : '✓ In-app camera permission granted');
    } else {
      M.onb.camPerm = true;
    }
  } catch {
    M.onb.camPerm = true;
    M.toast(ar ? 'يمكنك السماح للكاميرا عند فتح الماسح الضوئي' : 'You can allow camera access when opening the scanner');
  }
  M.renderOnboarding();
};

M.acts['onb-perm-notif'] = async () => {
  const ar = M.s.lang === 'ar';
  try {
    if (window.Capacitor?.Plugins?.LocalNotifications?.requestPermissions) {
      await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
    } else if (typeof Notification !== 'undefined' && typeof Notification.requestPermission === 'function') {
      await Notification.requestPermission().catch(() => {});
    }
  } catch {}
  M.onb.notifPerm = true;
  M.toast(ar ? '✓ تم تفعيل الإشعارات والتنبيهات الفورية' : '✓ Notifications enabled');
  M.renderOnboarding();
};

M.acts['onb-next'] = el => {
  M.onb.step = +(el.dataset.step || 2);
  M.renderOnboarding();
};
M.acts['onb-prev'] = el => {
  M.onb.step = +(el.dataset.step || 1);
  M.renderOnboarding();
};
M.acts['onb-mode'] = el => {
  M.onb.mode = el.dataset.v || 'create';
  M.renderOnboarding();
};
M.acts['onb-avatar'] = el => {
  const form = el.closest('form');
  if (form) {
    if (form.userName) M.onb.userName = form.userName.value;
    if (form.userRole) M.onb.userRole = form.userRole.value;
    if (form.familyName) M.onb.familyName = form.familyName.value;
    if (form.joinCode) M.onb.joinCode = form.joinCode.value;
  }
  M.onb.avatar = el.dataset.v || 'abu';
  M.renderOnboarding();
};

M.handleOnbStep2 = async f => {
  const ar = M.s.lang === 'ar';
  const name = (f.userName?.value || '').trim();
  const role = (f.userRole?.value || '').trim() || (ar ? 'فرد من العائلة' : 'Family Member');
  if (!name) return;
  M.onb.userName = name;
  M.onb.userRole = role;

  if (M.onb.mode === 'join') {
    const code = (f.joinCode?.value || '').trim().toUpperCase();
    if (!code) return;
    M.onb.joinCode = code;
    const remote = M.api ? await M.api.pullStateFromSupabaseDirect(true) : null;
    if (remote && (remote.salary > 0 || remote.onboarded)) {
      const keep = { os: M.s.os, theme: M.s.theme, lang: M.s.lang, tab: 'home', billSeg: 'bills', famSeg: 'feed', privacy: false };
      Object.assign(M.s, remote, keep);
    }
    M.s.familyCode = code;
    M.s.onboarded = true;
    const newId = 'm_' + Date.now().toString(36);
    const av = M.onb.avatar || 'umm';
    const newMember = {
      id: newId,
      avatar: av,
      n: { ar: name, en: name },
      i: { ar: name.charAt(0), en: name.charAt(0).toUpperCase() },
      c: M.AVATAR_COLORS[av] || '#EC4899',
      role: { ar: role, en: role }
    };
    if (!Array.isArray(M.s.members)) M.s.members = [];
    M.s.members.push(newMember);
    M.s.currentMemberId = newId;
    if (M.api) {
      M.api.saveLocal(M.s);
      M.api.pushStateToSupabaseDirect(M.s).catch(() => {});
    }
    M.closeOnboarding();
    M.render(true);
    M.toast(`${M.ico('checkc', 16)} ${ar ? 'تم الانضمام لمحفظة العائلة (' + code + ') بنجاح!' : 'Joined family wallet (' + code + ')!'}`);
    return;
  }

  M.onb.familyName = (f.familyName?.value || '').trim() || (ar ? 'محفظة العائلة' : 'Family Wallet');
  M.onb.step = 3;
  M.renderOnboarding();
};

M.handleOnbStep3 = async f => {
  const ar = M.s.lang === 'ar';
  const rawSal = M.toWesternDigits(String(f.salary?.value || '0')).replace(/[^\d.]/g, '');
  const sal = Number(rawSal);
  if (!(sal > 0)) {
    M.toast(ar ? 'يرجى إدخال الراتب أو الميزانية الشهرية' : 'Please enter your monthly salary/budget');
    return;
  }
  const payday = Math.max(1, Math.min(30, Number(M.toWesternDigits(String(f.payday?.value || '1'))) || 1));
  const carName = (f.carName?.value || '').trim() || (ar ? 'سيارة العائلة' : 'Family Car');
  const fuelBudget = Number(M.toWesternDigits(String(f.fuelBudget?.value || '5000')).replace(/[^\d.]/g, '')) || 5000;
  const goalName = (f.goalName?.value || '').trim() || (ar ? 'هدف التوفير العائلي' : 'Family Savings Goal');
  const goalTarget = Number(M.toWesternDigits(String(f.goalTarget?.value || '100000')).replace(/[^\d.]/g, '')) || 100000;
  const aiKey = (f.aiKey?.value || '').trim();

  const av = M.onb.avatar || 'abu';
  const uName = M.onb.userName || (ar ? 'صاحب المحفظة' : 'Wallet Owner');
  const uRole = M.onb.userRole || (ar ? 'مدير المحفظة' : 'Wallet Admin');
  const famName = M.onb.familyName || (ar ? 'محفظة العائلة' : 'Family Wallet');
  const famCode = M.s.familyCode || M.genFamilyCode();

  const keep = { os: M.s.os, theme: M.s.theme, lang: M.s.lang, tab: 'home', billSeg: 'bills', famSeg: 'feed', privacy: false };
  const clean = M.cleanState();
  Object.assign(M.s, clean, keep, {
    onboarded: true,
    familyCode: famCode,
    familyName: { ar: famName, en: famName },
    currentMemberId: 'abu',
    members: [
      {
        id: 'abu',
        avatar: av,
        n: { ar: uName, en: uName },
        i: { ar: uName.charAt(0), en: uName.charAt(0).toUpperCase() },
        c: M.AVATAR_COLORS[av] || '#0D9488',
        role: { ar: uRole, en: uRole }
      }
    ],
    salary: sal,
    payday,
    day: new Date().getDate() || 14,
    car: {
      n: { ar: carName, en: carName },
      plate: M.s.car?.plate || '00000 123 16',
      odo: M.s.car?.odo || 0,
      nextOil: M.s.car?.nextOil || 10000,
      kmDay: 40,
      fuelBudget,
      fuelUsed: 0
    },
    goal: {
      name: { ar: goalName, en: goalName },
      target: goalTarget,
      saved: 0,
      monthly: Math.round(goalTarget / 10)
    }
  });

  if (aiKey && M.api) {
    await M.api.saveSharedAiKey(aiKey, 'gemini');
  }
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.resetSupabaseToCleanFamily(M.s).catch(() => {});
    M.api.updateSalary(sal).catch(() => {});
  }
  M.closeOnboarding();
  M.render(true);
  M.toast(`${M.ico('checkc', 16)} ${ar ? 'تم إعداد محفظة العائلة بنجاح! كود العائلة: ' + famCode : 'Family wallet ready! Code: ' + famCode}`);
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

/* ── live scenario simulators (Desktop Studio & Automated Tests) ── */
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
    M.s = Object.assign(M.demoSeed(), keep);
    if (M.api) {
      M.api.saveLocal(M.s);
      M.api.reset().catch(() => {});
    }
    M.closeOnboarding();
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
  if (M.$('#onboarding')?.classList.contains('on')) M.renderOnboarding();
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

/* Prevent iOS Safari / WKWebView pinch-to-zoom and double-tap zoom so it feels 100% native */
if (typeof document !== 'undefined') {
  document.addEventListener('gesturestart', ev => ev.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', ev => ev.preventDefault(), { passive: false });
  document.addEventListener('dblclick', ev => ev.preventDefault(), { passive: false });
}

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
  if (f.dataset.form === 'add-member') M.saveAddMember(f);
  if (f.dataset.form === 'join-code') M.saveJoinFamilyCode(f);
  if (f.dataset.form === 'car-edit') M.saveCarEdit(f);
  if (f.dataset.form === 'goal-edit') M.saveGoalEdit(f);
  if (f.dataset.form === 'onb-step2') M.handleOnbStep2(f);
  if (f.dataset.form === 'onb-step3') M.handleOnbStep3(f);
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
  const isStandalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator?.standalone === true);
  const isTouchPhone = typeof window !== 'undefined' && (/iPhone|iPod|Android.*Mobile/i.test(navigator.userAgent || '') || window.innerWidth < 900);
  const isMobile = Boolean(isCap || isStandalone || isTouchPhone);
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.toggle('is-mobile', isMobile);
    document.body.classList.toggle('native-app', Boolean(isCap || isStandalone || /iPhone|Android/i.test(navigator.userAgent || '')));
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

/* Offline-First state initialization + Onboarding Check + Internal System Realtime Sync */
M.initOfflineSync = async () => {
  if (!M.api) return;
  const isTestEnv = typeof window !== 'undefined' && (window.__MASROFI_TEST_MODE__ || window.location.port === '3088' || window.location.port === '3099');

  let urlJoinCode = '';
  try {
    const params = new URLSearchParams(window.location.search);
    urlJoinCode = (params.get('join') || '').trim().toUpperCase();
  } catch {}

  const local = M.api.loadLocal();
  if (local && (local.onboarded || isTestEnv)) {
    const keep = { os: M.s.os, theme: M.s.theme, lang: M.s.lang, tab: M.s.tab, billSeg: M.s.billSeg, famSeg: M.s.famSeg, privacy: M.s.privacy };
    Object.assign(M.s, local, keep);
    M.render();
  }

  if (urlJoinCode) {
    M.onb.mode = 'join';
    M.onb.joinCode = urlJoinCode;
    M.openOnboarding(2);
  } else if (!M.s.onboarded && !isTestEnv) {
    M.openOnboarding(1);
  }

  await M.api.syncSystemConfigFromServer();
  M.api.initRealtimeSync();

  try {
    await M.api.flushQueue();

    const remote = await M.api.fetchState();
    if (remote && (remote.onboarded || isTestEnv)) {
      const keep = { os: M.s.os, theme: M.s.theme, lang: M.s.lang, tab: M.s.tab, billSeg: M.s.billSeg, famSeg: M.s.famSeg, privacy: M.s.privacy, currentMemberId: M.s.currentMemberId };
      Object.assign(M.s, remote, keep);
      M.api.saveLocal(M.s);
      if (M.s.onboarded && !urlJoinCode) {
        M.closeOnboarding();
      }
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
