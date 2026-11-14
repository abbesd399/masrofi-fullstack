/* AI Camera Scanner — Capture → AI Parse (Gemini 2.5 Flash / Groq / Smart Local) → Auto-Route & Save in Exact Place */
M.scan = { mode: 'receipt', billIdx: 0, busy: false, timers: [], aiExtracted: null };

/* 3 Realistic Paper Bills (Variable Sonelgaz, Variable SEAAL Water, Fixed SAA Car Insurance) */
M.BILL_SAMPLES = [
  {
    key: 'elec',
    targetId: 'elec',
    kind: 'var',
    cat: 'utilities',
    amount: 7200,
    oldAmount: 6500,
    dueDay: 18,
    isCurrentMonth: true,
    label: { ar: 'سونلغاز (متغيرة)', en: 'Sonelgaz (Variable)' },
    biller: { ar: 'سونلغاز · الكهرباء والغاز', en: 'Sonelgaz · Power & Gas' },
    dueText: { ar: '18 نوفمبر 2026', en: 'Nov 18, 2026' },
    paper: `
      <h5>سونلغاز · SONELGAZ</h5>
      <div style="text-align:center;font-size:9.5px;opacity:.7;margin-bottom:6px">فاتورة استهلاك الكهرباء والغاز · الربع الرابع</div>
      <div class="pl"><span>مرجع الزبون</span><span>549201184-16</span></div>
      <div class="pl"><span>استهلاك الكهرباء</span><span>412 kWh · 4,850 DA</span></div>
      <div class="pl"><span>استهلاك الغاز</span><span>1,620 Th · 1,780 DA</span></div>
      <div class="pl"><span>الرسوم والضرائب</span><span>570.00 DA</span></div>
      <div class="pl" style="font-weight:700;font-size:12.5px;margin-top:5px"><span>المبلغ المستحق</span><span class="hl" data-f="amount">7,200.00 DA</span></div>
      <div class="pl" style="font-weight:700;font-size:12px"><span>آخر أجل للدفع</span><span class="hl" data-f="date">18/11/2026</span></div>`
  },
  {
    key: 'water',
    targetId: 'water',
    kind: 'var',
    cat: 'utilities',
    amount: 3150,
    oldAmount: 2800,
    dueDay: 22,
    isCurrentMonth: true,
    label: { ar: 'سيال · الماء (متغيرة)', en: 'SEAAL · Water (Var)' },
    biller: { ar: 'سيال · فاتورة الماء', en: 'SEAAL · Water bill' },
    dueText: { ar: '22 نوفمبر 2026', en: 'Nov 22, 2026' },
    paper: `
      <h5>سيال · SEAAL</h5>
      <div style="text-align:center;font-size:9.5px;opacity:.7;margin-bottom:6px">شركة المياه والتطهير للجزائر</div>
      <div class="pl"><span>رقم العداد</span><span>WTR-884120</span></div>
      <div class="pl"><span>الاستهلاك</span><span>38 m³</span></div>
      <div class="pl"><span>رسوم التطهير</span><span>480.00 DA</span></div>
      <div class="pl" style="font-weight:700;font-size:12.5px;margin-top:5px"><span>الإجمالي للدفع</span><span class="hl" data-f="amount">3,150.00 DA</span></div>
      <div class="pl" style="font-weight:700;font-size:12px"><span>تاريخ الاستحقاق</span><span class="hl" data-f="date">22/11/2026</span></div>`
  },
  {
    key: 'ins2',
    targetId: 'ins2',
    kind: 'fixed',
    cat: 'car',
    amount: 19800,
    isCurrentMonth: false,
    label: { ar: 'تأمين SAA (ثابتة)', en: 'SAA Insurance (Fixed)' },
    biller: { ar: 'SAA · تأمين أكسنت', en: 'SAA · Accent insurance' },
    dueText: { ar: '8 ديسمبر 2026', en: 'Dec 8, 2026' },
    paper: `
      <h5>الشركة الجزائرية للتأمين · SAA</h5>
      <div style="text-align:center;font-size:10px;opacity:.7;margin-bottom:8px">Motor Policy Renewal Notice · إشعار تجديد</div>
      <div class="pl"><span>Policy No.</span><span>MTR-77310-26</span></div>
      <div class="pl"><span>Vehicle</span><span>Hyundai Accent 2019</span></div>
      <div class="pl"><span>Plate</span><span>05821 119 16</span></div>
      <div class="pl"><span>Insured</span><span>Umm Khalid</span></div>
      <div class="pl" style="font-weight:700;font-size:12.5px;margin-top:6px"><span>Premium</span><span class="hl" data-f="amount">19,800.00 DA</span></div>
      <div class="pl" style="font-weight:700;font-size:12.5px"><span>Due date</span><span class="hl" data-f="date">08/12/2026</span></div>`
  }
];

M.clearScanTimers = () => {
  (M.scan.timers || []).forEach(id => { clearTimeout(id); clearInterval(id); });
  M.scan.timers = [];
  M.scan.busy = false;
};
M.addScanTimer = id => { M.scan.timers.push(id); return id; };

M.paperHtml = mode => {
  if (mode === 'receipt') {
    return `
    <h5>أونو هايبر · Uno Hypermarket</h5>
    <div style="text-align:center;font-size:9.5px;opacity:.7">Bab Ezzouar, Alger · NIF 001616123456789</div>
    <div style="text-align:center;font-size:10px;margin:2px 0 6px">Date: <span class="hl" data-f="date">10/11/2026</span> 18:52</div>
    ${[['Lait 1L x4', '360.00'], ['Oeufs 30', '560.00'], ['Semoule 10kg', '1,400.00'], ['Poulet 1kg', '480.00'], ['Légumes', '340.00'], ['Baguette x6', '90.00'], ['Fromage', '220.00']]
      .map(([a, b]) => `<div class="pl"><span>${a}</span><span>${b}</span></div>`).join('')}
    <div class="pl" style="font-weight:700;font-size:13px;border:0;margin-top:4px"><span>TOTAL</span><span class="hl" data-f="amount">3,450.00 DA</span></div>
    <div style="text-align:center;margin-top:6px;letter-spacing:2px">|||| ||| |||| || |||</div>`;
  }
  const samp = M.BILL_SAMPLES[M.scan.billIdx || 0];
  return samp.paper;
};

M.capturePhoto = async (sourceType = 'camera') => {
  const cap = window.Capacitor;
  const Camera = cap?.Plugins?.Camera;
  if (Camera && (cap.isNativePlatform?.() || (typeof cap.isPluginAvailable === 'function' && cap.isPluginAvailable('Camera')))) {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: 'base64',
        source: sourceType === 'camera' ? 'CAMERA' : 'PHOTOS'
      });
      if (photo && photo.base64String) {
        return `data:image/jpeg;base64,${photo.base64String}`;
      }
    } catch (e) {
      if (e?.message && !e.message.toLowerCase().includes('cancel')) {
        console.warn('[Camera] Plugin error:', e);
      }
      return null;
    }
  }

  // Web fallback using hidden file input
  return new Promise(resolve => {
    const inputId = sourceType === 'camera' ? 'scanCameraIn' : 'scanGalleryIn';
    const input = document.getElementById(inputId);
    if (!input) return resolve(null);
    input.value = '';
    const onChange = ev => {
      input.removeEventListener('change', onChange);
      const file = ev.target.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.addEventListener('change', onChange);
    input.click();
  });
};

M.openScanner = (mode = 'receipt', auto = false) => {
  M.clearScanTimers();
  M.scan.mode = mode; M.scan.open = true; M.scan.aiExtracted = null;
  const sc = M.$('#scanner');
  const billChips = mode === 'bill' ? `<div class="sc-samples">
    ${M.BILL_SAMPLES.map((s, idx) => `<button type="button" class="sc-samp ${idx === (M.scan.billIdx || 0) ? 'on' : ''}" data-act="scan-sample" data-idx="${idx}">${M.L(s.label)}</button>`).join('')}
  </div>` : '';

  sc.innerHTML = `
    <input type="file" id="scanCameraIn" accept="image/*" capture="environment" style="display:none">
    <input type="file" id="scanGalleryIn" accept="image/*" style="display:none">
    <div class="sc-top"><button type="button" class="sc-x" data-act="scan-close">${M.ico('close', 18, 2.4)}</button><h3>${M.ico('spark', 15, 2)} ${M.t('scan')}</h3><button type="button" class="sc-x" data-act="scan-flash">${M.ico('flash', 18)}</button></div>
    <div class="sc-modes" data-m="${mode}"><span class="thumb"></span>
      <button type="button" class="${mode === 'receipt' ? 'on' : ''}" data-act="scan-mode" data-id="receipt">${M.t('scReceipt')}</button>
      <button type="button" class="${mode === 'bill' ? 'on' : ''}" data-act="scan-mode" data-id="bill">${M.t('scBill')}</button></div>
    ${billChips}
    <div class="viewfinder"><div class="vf-grid"></div><div class="vf-noise"></div>
      <div class="vf-frame" id="vfFrame"><i></i><i></i><i></i><i></i></div>
      <div class="paper" id="paper">${M.paperHtml(mode)}</div>
      <div class="laser" id="laser"></div>
      <div class="vf-hint" id="vfHint">${M.t('scanHint')}</div>
      <div class="ai-steps" id="aiSteps"></div>
      <div class="flashfx" id="flashfx"></div></div>
    <div style="padding:12px 18px 0"><button type="button" class="sc-sim" data-act="scan-run" style="width:100%">${M.ico('spark', 16, 2.2)} ${M.t('simulate')}</button></div>
    <div class="sc-bottom">
      <button type="button" class="sc-side" data-act="scan-gallery" aria-label="gallery">${M.ico('image', 20)}</button>
      <button type="button" class="shutter" data-act="scan-capture" aria-label="shutter"><span></span></button>
      <button type="button" class="sc-side" data-act="scan-manual" aria-label="manual">${M.ico('pen', 20)}</button>
    </div>
    ${mode === 'bill' ? `<button type="button" class="manual" data-act="scan-manual">${M.t('manual')}</button>` : ''}`;
  M.$('#statusbar').classList.add('light-ink');
  requestAnimationFrame(() => M.scan.open && sc.classList.add('on'));
  if (auto) M.addScanTimer(setTimeout(() => M.scan.open && M.runScan(), 700));
};

M.acts['scan-sample'] = el => {
  if (M.scan.busy) return;
  M.scan.billIdx = +el.dataset.idx;
  M.openScanner('bill');
};

M.closeScanner = () => {
  M.clearScanTimers();
  M.scan.open = false; M.$('#scanner').classList.remove('on'); M.$('#scrim').classList.remove('on');
  M.$('#statusbar').classList.remove('light-ink');
  M.sheet.close(); M.liftSheet(false);
};
M.liftSheet = on => { M.$('#sheet').style.zIndex = on ? 56 : ''; M.$('#scrim').style.zIndex = on ? 55 : ''; };

M.runScan = (customImage = null) => {
  if (M.scan.busy || !M.scan.open) return;
  M.scan.busy = true;
  M.scan.aiExtracted = null;
  const $ = id => document.getElementById(id), mode = M.scan.mode;
  M.replayAnim(document.querySelector('.shutter'), 'snap', 350);
  M.replayAnim($('flashfx'), 'on', 460);
  if ($('vfHint')) $('vfHint').style.opacity = 0;

  if (customImage && $('paper')) {
    $('paper').innerHTML = `<img src="${customImage}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;filter:contrast(1.04)">`;
    // Trigger real AI Vision extraction in parallel while steps animate
    if (M.api && typeof M.api.analyzeScan === 'function') {
      M.api.analyzeScan({ mode, image: customImage, sampleIdx: M.scan.billIdx || 0 }).then(res => {
        if (res && res.extracted) {
          M.scan.aiExtracted = res.extracted;
        }
      }).catch(() => {});
    }
  }
  $('paper')?.classList.add('on');
  $('vfFrame')?.classList.add('locked');
  M.addScanTimer(setTimeout(() => { $('laser')?.classList.add('on'); }, 320));

  const steps = ['s1', 's2', 's3', 's4'], box = $('aiSteps');
  steps.forEach((k, i) => M.addScanTimer(setTimeout(() => {
    if (!M.scan.open || !box) return;
    box.querySelector('.ai-step:last-child .sp')?.replaceWith(Object.assign(document.createElement('span'), { className: 'ok', textContent: '✓' }));
    box.insertAdjacentHTML('beforeend', `<div class="ai-step"><span class="sp"></span>${M.t(k)}</div>`);
    if (k === 's3' && !customImage) $('paper')?.querySelectorAll('.hl').forEach((h, j) => M.addScanTimer(setTimeout(() => h.classList.add('on'), j * 280)));
  }, 440 + i * 560)));

  M.addScanTimer(setTimeout(() => {
    if (!M.scan.open) return;
    box?.querySelector('.ai-step:last-child .sp')?.replaceWith(Object.assign(document.createElement('span'), { className: 'ok', textContent: '✓' }));
    $('laser')?.classList.remove('on');
    M.scanResult(mode, customImage);
  }, 440 + steps.length * 560 + 260));
};

M.scanResult = (mode, customImage = null) => {
  if (!M.scan.open) return;
  M.scan.customImage = customImage;
  const ar = M.s.lang === 'ar';
  const aiExt = M.scan.aiExtracted;
  const samp = M.BILL_SAMPLES[M.scan.billIdx || 0];

  const rMerchant = aiExt?.merchant ? M.L(aiExt.merchant) : (ar ? 'أونو هايبر' : 'Uno Hypermarket');
  const rAmount = aiExt?.amount ? Number(aiExt.amount) : 3450;
  const rCat = (aiExt?.cat && M.CATS[aiExt.cat]) ? aiExt.cat : 'groceries';

  const bBiller = aiExt?.biller ? M.L(aiExt.biller) : M.L(samp.biller);
  const bKind = aiExt?.kind || samp.kind;
  const bAmount = aiExt?.amount ? Number(aiExt.amount) : samp.amount;
  const bDueText = aiExt?.dueText ? M.L(aiExt.dueText) : M.L(samp.dueText);
  const bIsCurrent = aiExt?.isCurrentMonth !== undefined ? Boolean(aiExt.isCurrentMonth) : samp.isCurrentMonth;

  const dup = mode === 'receipt' ? M.s.scanCount > 0 && !aiExt : (!bIsCurrent && M.s.scheduled.some(b => b.id === 'ins2'));
  const fields = mode === 'receipt'
    ? [
        [M.t('merchant'), rMerchant],
        [M.t('amount'), M.fmt(rAmount) + ' ' + M.t('cur')],
        [M.t('category'), M.L(M.CATS[rCat].n)],
        [M.t('member'), M.L(M.member('umm').n)],
        [M.t('autoDest'), M.t('segFeed')]
      ]
    : [
        [M.t('biller'), bBiller],
        [M.t('billType'), M.t(bKind === 'var' ? 'billVar' : 'billFixed')],
        [M.t('amount'), M.fmt(bAmount) + ' ' + M.t('cur')],
        [M.t('dueDate'), bDueText],
        [M.t('autoDest'), bIsCurrent ? M.t('destMonth') : M.t('destSched')]
      ];

  let alerts = '';
  if (dup) {
    alerts = `<div class="alert-box" style="--bc:var(--crit)"><span class="ab-i">${M.ico('copy', 20)}</span><div>${M.t('dupWarn')}</div></div>`;
  } else if (mode === 'receipt') {
    alerts = `<div class="alert-box" style="--bc:var(--warn)"><span class="ab-i">${M.ico('trend', 20)}</span><div>${M.t('hikeWarn')(ar ? 'سميد 10 كغ' : 'Semolina 10kg', 12)}</div></div>`;
  } else if (bIsCurrent) {
    const existing = M.s.bills.find(b => b.id === (aiExt?.targetId || samp.targetId));
    const oldP = existing ? existing.amount : samp.oldAmount;
    alerts = `<div class="alert-box" style="--bc:var(--primary)"><span class="ab-i">${M.ico('bolt', 20)}</span><div>${M.t('varBillNote')(M.fmt(oldP), M.fmt(bAmount))}</div></div>`;
  }

  M.liftSheet(true);
  M.sheet.open(`<span style="color:var(--safe);display:inline-grid">${M.ico('checkc', 20)}</span> <span>${M.t(mode === 'receipt' ? 'resultR' : 'resultB')}</span>`, `
    <div class="group" id="rf">${fields.map(([k]) => `<div class="result-field"><span class="muted">${k}</span><span class="rf-v"></span></div>`).join('')}</div>
    ${alerts}
    <button type="button" class="btn" data-act="scan-confirm" data-dup="${dup ? 1 : 0}">${dup ? M.t('addAnyway') : M.t(mode === 'receipt' ? 'confirmR' : 'confirmB')}</button>`, {
    onOpen: sh => {
      const vs = sh.querySelectorAll('.rf-v');
      fields.forEach(([, v], i) => M.addScanTimer(setTimeout(() => {
        const el = vs[i]; if (!el) return;
        el.classList.add('typing'); let n = 0;
        const tick = setInterval(() => {
          el.textContent = v.slice(0, ++n);
          if (n >= v.length) {
            clearInterval(tick);
            el.classList.remove('typing');
            el.insertAdjacentHTML('beforeend', `<span style="color:var(--safe)">${M.ico('check', 14, 3)}</span>`);
          }
        }, 18);
        M.addScanTimer(tick);
      }, 180 + i * 210)));
    }
  });
};

M.acts['scan-confirm'] = el => {
  const mode = M.scan.mode, ar = M.s.lang === 'ar';
  const samp = M.BILL_SAMPLES[M.scan.billIdx || 0];
  const aiExt = M.scan.aiExtracted;
  const customImg = M.scan.customImage;
  M.scan.customImage = null;
  M.scan.aiExtracted = null;
  el.closest('.sh-body').innerHTML = `<div class="empty">${M.successCheck()}<h4>${M.t(mode === 'receipt' ? 'addedR' : 'addedB')}</h4></div>`;
  
  const rAmount = aiExt?.amount ? Number(aiExt.amount) : 3450;
  const rMerchant = aiExt?.merchant || { ar: 'أونو هايبر', en: 'Uno Hypermarket' };
  const rCat = (aiExt?.cat && M.CATS[aiExt.cat]) ? aiExt.cat : 'groceries';

  if (mode === 'receipt') {
    const id = Date.now();
    const newP = {
      id, member: 'umm', merchant: rMerchant, cat: rCat, amount: rAmount, day: M.s.day, time: '6:52 PM', scanned: true,
      items: aiExt?.items || [['حليب 1 لتر', 'Milk 1L', 4, 90], ['بيض 30', 'Eggs 30', 1, 560], ['سميد 10 كغ', 'Semolina 10kg', 1, 1400], ['دجاج 1 كغ', 'Chicken 1kg', 1, 480], ['خضر', 'Vegetables', 1, 340], ['باقيت', 'Baguette', 6, 15], ['جبن', 'Cheese', 1, 220]].map(([a, e, q, p]) => ({ n: { ar: a, en: e }, q, p }))
    };
    M.s.purchases.unshift(newP);
    M.s.scanCount++;
    M.freshId = id;
    M.tickerNew = true;
    if (M.api) {
      M.api.saveLocal(M.s);
      const payload = customImg ? { id, mode: 'receipt', image: customImg, ...aiExt } : { id, mode: 'receipt' };
      M.api.scan(payload).then(res => {
        if (res?.persisted?.record?.id) {
          newP.id = res.persisted.record.id;
          M.freshId = res.persisted.record.id;
          M.api.saveLocal(M.s);
        }
      }).catch(() => {});
    }
  } else {
    /* Automatically save or update the scanned bill in its exact place! */
    const sampIdx = M.scan.billIdx || 0;
    const isCur = aiExt?.isCurrentMonth !== undefined ? Boolean(aiExt.isCurrentMonth) : samp.isCurrentMonth;
    const targetId = aiExt?.targetId || samp.targetId;
    const bAmount = aiExt?.amount ? Number(aiExt.amount) : samp.amount;
    const bBiller = aiExt?.biller || samp.biller;

    if (isCur) {
      const existing = M.s.bills.find(b => b.id === targetId);
      if (existing) {
        existing.amount = bAmount;
        existing.paid = false;
        existing.scanned = true;
        M.freshBillId = existing.id;
      } else {
        const nid = targetId || ('b' + Date.now());
        const nb = { id: nid, n: bBiller, cat: aiExt?.cat || samp.cat, amount: bAmount, due: aiExt?.dueDay || samp.dueDay, paid: false, kind: aiExt?.kind || samp.kind, scanned: true };
        M.s.bills.unshift(nb);
        M.freshBillId = nid;
      }
    } else {
      const sched = {
        id: 'ins2', n: { ar: 'تأمين أكسنت · SAA', en: 'Accent insurance · SAA' }, cat: 'car', amount: bAmount || 19800, kind: 'fixed',
        dueStr: { ar: 'يستحق 8 ديسمبر', en: 'Due Dec 8' }, remStr: { ar: 'تذكير 1 ديسمبر', en: 'Reminder Dec 1' }, isScheduled: true
      };
      const existingIdx = M.s.scheduled.findIndex(b => b.id === 'ins2');
      if (existingIdx >= 0) M.s.scheduled[existingIdx] = sched;
      else M.s.scheduled.push(sched);

      const newCarItem = { id: 'ins2', ico: 'shield', c: '#EC4899', n: { ar: 'تأمين أكسنت (أم خالد)', en: 'Accent insurance (Umm Khalid)' }, s: { ar: `8 ديسمبر · ${M.fmt(bAmount || 19800)} د.ج`, en: `Dec 8 · ${M.fmt(bAmount || 19800)} DZD` }, days: 28 };
      const carIdx = M.s.carItems.findIndex(ci => ci.id === 'ins2');
      if (carIdx >= 0) M.s.carItems[carIdx] = newCarItem;
      else M.s.carItems.splice(1, 0, newCarItem);
      M.freshBillId = 'ins2';
    }

    if (M.api) {
      M.api.saveLocal(M.s);
      const payload = customImg ? { mode: 'bill', sampleIdx: sampIdx, image: customImg, ...aiExt } : { mode: 'bill', sampleIdx: sampIdx };
      M.api.scan(payload).then(res => {
        if (res?.state) {
          const keep = { os: M.s.os, theme: M.s.theme, lang: M.s.lang, tab: M.s.tab, billSeg: M.s.billSeg, famSeg: M.s.famSeg, privacy: M.s.privacy };
          Object.assign(M.s, res.state, keep);
          if (res.persisted?.targetId) M.freshBillId = res.persisted.targetId;
          M.api.saveLocal(M.s);
        }
      }).catch(() => {});
    }

    /* Advance sample index for next scan so user can try the next bill effortlessly */
    M.scan.billIdx = ((M.scan.billIdx || 0) + 1) % M.BILL_SAMPLES.length;
  }
  M.addScanTimer(setTimeout(() => {
    M.closeScanner();
    if (mode === 'receipt') {
      M.go('home');
      M.toast(`${M.ico('checkc', 16)} −${M.fmt(rAmount)} ${M.t('cur')} · ${M.L(rMerchant)}`);
      M.checkThreshold();
    } else {
      M.s.billSeg = 'bills';
      M.s.billFilter = 'all';
      M.go('bills');
      M.toast(`${M.ico('checkc', 16)} ${M.t('addedB')} · ${M.L(aiExt?.biller || samp.biller)}`);
      M.checkThreshold();
    }
    M.freshId = null;
    setTimeout(() => { M.freshBillId = null; }, 1600);
  }, 1350));
};

M.acts['scan-close'] = () => M.closeScanner();
M.acts['scan-run'] = () => M.runScan();
M.acts['scan-capture'] = async () => {
  const photo = await M.capturePhoto('camera');
  if (photo) M.runScan(photo);
};
M.acts['scan-gallery'] = async () => {
  const photo = await M.capturePhoto('photos');
  if (photo) M.runScan(photo);
};
M.acts['scan-flash'] = el => { M.replayAnim(document.getElementById('flashfx'), 'on', 460); M.replayAnim(el, 'bump', 400); };
M.acts['scan-mode'] = el => { if (!M.scan.busy) M.openScanner(el.dataset.id); };
M.acts['scan-manual'] = () => {
  M.clearScanTimers();
  if (M.$('#scanner').classList.contains('on')) M.liftSheet(true);
  M.sheet.open(M.t('manualT'), `<form class="manual-form" data-form="manual">
    <label>${M.t('name')}<input name="n" required value="${M.s.lang === 'ar' ? 'رسوم مدرسة سارة' : "Sara's school fees"}" autocomplete="off"></label>
    <label>${M.t('billType')}
      <div class="kind-pick">
        <button type="button" class="kp-btn on" data-act="pick-kind" data-v="fixed">${M.ico('shield', 14, 2)} ${M.t('billFixed')}</button>
        <button type="button" class="kp-btn" data-act="pick-kind" data-v="var">${M.ico('bolt', 14, 2)} ${M.t('billVar')}</button>
      </div>
      <input type="hidden" name="kind" value="fixed">
    </label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <label>${M.t('amount')} (${M.t('cur')})<input name="a" type="text" inputmode="decimal" required value="1500"></label>
      <label>${M.t('dueDate')}<input name="d" type="date" required value="2026-11-25"></label>
    </div>
    <button class="btn" type="submit">${M.ico('check', 18, 2.5)} ${M.t('save')}</button></form>`);
};
M.saveManual = f => {
  const n = f.n.value.trim();
  const rawA = typeof f.a.value === 'string' ? M.toWesternDigits(f.a.value) : f.a.value;
  const a = +rawA, kind = f.kind?.value || 'fixed', d = new Date(f.d.value + 'T00:00');
  if (!n || !(a > 0)) return;
  const nid = 'm' + Date.now();
  let billPayload;
  if (d.getMonth() === 10 && d.getFullYear() === 2026) {
    billPayload = { id: nid, n: { ar: n, en: n }, cat: 'family', amount: a, due: d.getDate(), paid: false, kind, isScheduled: false };
    M.s.bills.push(billPayload);
  } else {
    const dsAr = d.toLocaleDateString('ar-SA-u-nu-latn-ca-gregory', { month: 'short', day: 'numeric' });
    const dsEn = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    billPayload = { id: nid, n: { ar: n, en: n }, cat: 'family', amount: a, kind, dueStr: { ar: 'يستحق ' + dsAr, en: 'Due ' + dsEn }, remStr: { ar: 'تذكير بداية الشهر', en: 'Start-of-month reminder' }, isScheduled: true };
    M.s.scheduled.push(billPayload);
  }
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.saveBill(billPayload).catch(() => {});
  }
  M.freshBillId = nid;
  M.closeScanner(); M.s.billSeg = 'bills'; M.s.billFilter = 'all'; M.go('bills'); M.toast(`${M.ico('calendar', 16)} ${M.t('addedB')}`); M.checkThreshold();
  setTimeout(() => { M.freshBillId = null; }, 1600);
};
