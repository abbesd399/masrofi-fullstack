/* AI Camera Scanner — In-App Live Camera (<video playsinline>) + Real Gemini Vision OCR + Editable Verification */
M.scan = {
  mode: 'receipt',
  billIdx: 0,
  busy: false,
  timers: [],
  aiExtracted: null,
  aiUsed: false,
  stream: null,
  facing: 'environment',
  torch: false,
  customImage: null
};

/* 3 Realistic Paper Bills for Simulator Mode */
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

/* ── In-App Live Camera Stream (opens camera inside .viewfinder without leaving the app!) ── */
M.stopCameraStream = () => {
  if (M.scan._canvasTimer) {
    clearInterval(M.scan._canvasTimer);
    M.scan._canvasTimer = null;
  }
  if (M.scan.stream) {
    try {
      M.scan.stream.getTracks().forEach(t => t.stop());
    } catch {}
    M.scan.stream = null;
  }
  const vid = document.getElementById('camVideo');
  if (vid) {
    try { vid.srcObject = null; } catch {}
    vid.classList.remove('on');
  }
};

M.startCameraStream = async () => {
  M.stopCameraStream();
  const vid = document.getElementById('camVideo');
  if (!vid || !M.scan.open) return false;

  // 1. Primary: Real hardware camera stream inside the app via getUserMedia
  if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
    const constraintsList = [
      {
        video: {
          facingMode: { ideal: M.scan.facing || 'environment' },
          width: { ideal: 1600 },
          height: { ideal: 1200 }
        },
        audio: false
      },
      {
        video: { facingMode: M.scan.facing || 'environment' },
        audio: false
      },
      { video: true, audio: false }
    ];

    for (const constraints of constraintsList) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!M.scan.open) {
          stream.getTracks().forEach(t => t.stop());
          return false;
        }
        M.scan.stream = stream;
        vid.srcObject = stream;
        vid.setAttribute('playsinline', '');
        vid.setAttribute('webkit-playsinline', '');
        vid.muted = true;
        await vid.play().catch(() => {});
        vid.classList.add('on');
        const paper = document.getElementById('paper');
        if (paper) paper.style.opacity = '0';
        return true;
      } catch {
        // try next fallback constraint
      }
    }
  }

  // 2. Fallback: If on a desktop without a webcam or non-HTTPS origin, provide an in-app live viewfinder stream so the camera UI stays 100% inside the app
  try {
    const c = document.createElement('canvas');
    c.width = 720;
    c.height = 960;
    const ctx = c.getContext('2d');
    const drawFrame = () => {
      ctx.fillStyle = '#0D1726';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.strokeStyle = 'rgba(20,184,166,0.22)';
      ctx.lineWidth = 2;
      for (let x = 0; x < c.width; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke();
      }
      for (let y = 0; y < c.height; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke();
      }
    };
    drawFrame();
    if (typeof c.captureStream === 'function') {
      const stream = c.captureStream(15);
      M.scan.stream = stream;
      M.scan._canvasTimer = setInterval(drawFrame, 200);
      vid.srcObject = stream;
      vid.setAttribute('playsinline', '');
      vid.setAttribute('webkit-playsinline', '');
      vid.muted = true;
      await vid.play().catch(() => {});
      vid.classList.add('on');
      const paper = document.getElementById('paper');
      if (paper) paper.style.opacity = '0';
      return true;
    }
  } catch {}
  return false;
};

/* Capture current video frame from #camVideo as optimized JPEG DataURL */
M.captureFrameFromVideo = () => {
  const vid = document.getElementById('camVideo');
  if (!vid || !vid.classList.contains('on') || !(vid.videoWidth > 0)) {
    return null;
  }
  try {
    const maxDim = 1280;
    let w = vid.videoWidth;
    let h = vid.videoHeight;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(vid, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return null;
  }
};

/* Compress gallery/file image so AI Vision uploads fast on mobile networks */
M.compressImageDataUrl = dataUrl => new Promise(resolve => {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return resolve(dataUrl);
  const img = new Image();
  img.onload = () => {
    try {
      const maxDim = 1280;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    } catch {
      resolve(dataUrl);
    }
  };
  img.onerror = () => resolve(dataUrl);
  img.src = dataUrl;
});

M.capturePhoto = async (sourceType = 'camera') => {
  if (sourceType === 'camera') {
    const liveFrame = M.captureFrameFromVideo();
    if (liveFrame) return liveFrame;
    const started = await M.startCameraStream();
    if (started) {
      await new Promise(r => setTimeout(r, 250));
      const frameAfterStart = M.captureFrameFromVideo();
      if (frameAfterStart) return frameAfterStart;
    }
  }

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
      reader.onload = async () => {
        const compressed = await M.compressImageDataUrl(reader.result);
        resolve(compressed);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.addEventListener('change', onChange);
    input.click();
  });
};

M.openScanner = (mode = 'receipt', auto = false) => {
  M.clearScanTimers();
  M.scan.mode = mode;
  M.scan.open = true;
  M.scan.aiExtracted = null;
  M.scan.aiUsed = false;
  const sc = M.$('#scanner');
  const ar = M.s.lang === 'ar';
  const billChips = mode === 'bill' ? `<div class="sc-samples">
    ${M.BILL_SAMPLES.map((s, idx) => `<button type="button" class="sc-samp ${idx === (M.scan.billIdx || 0) ? 'on' : ''}" data-act="scan-sample" data-idx="${idx}">${M.L(s.label)}</button>`).join('')}
  </div>` : '';

  sc.innerHTML = `
    <input type="file" id="scanCameraIn" accept="image/*" style="display:none">
    <input type="file" id="scanGalleryIn" accept="image/*" style="display:none">
    <div class="sc-top">
      <button type="button" class="sc-x" data-act="scan-close" aria-label="close">${M.ico('close', 18, 2.4)}</button>
      <h3>${M.ico('spark', 15, 2)} ${M.t('scan')}</h3>
      <div style="display:flex;gap:6px">
        <button type="button" class="sc-x" data-act="scan-flip" aria-label="flip camera" title="${ar ? 'قلب الكاميرا' : 'Flip camera'}">${M.ico('flip', 17)}</button>
        <button type="button" class="sc-x" data-act="scan-flash" aria-label="flash">${M.ico('flash', 18)}</button>
      </div>
    </div>
    <div class="sc-modes" data-m="${mode}"><span class="thumb"></span>
      <button type="button" class="${mode === 'receipt' ? 'on' : ''}" data-act="scan-mode" data-id="receipt">${M.t('scReceipt')}</button>
      <button type="button" class="${mode === 'bill' ? 'on' : ''}" data-act="scan-mode" data-id="bill">${M.t('scBill')}</button></div>
    ${billChips}
    <div class="viewfinder">
      <div class="vf-grid"></div><div class="vf-noise"></div>
      <video id="camVideo" autoplay playsinline muted webkit-playsinline></video>
      <div class="vf-captured" id="vfCaptured"></div>
      <div class="vf-frame" id="vfFrame"><i></i><i></i><i></i><i></i></div>
      <div class="paper" id="paper">${M.paperHtml(mode)}</div>
      <div class="laser" id="laser"></div>
      <div class="vf-hint" id="vfHint">${M.t('scanHint')}</div>
      <div class="ai-steps" id="aiSteps"></div>
      <div class="flashfx" id="flashfx"></div>
    </div>
    <div style="padding:10px 18px 0"><button type="button" class="sc-sim" data-act="scan-run" style="width:100%">${M.ico('spark', 16, 2.2)} ${M.t('simulate')}</button></div>
    <div class="sc-bottom">
      <button type="button" class="sc-side" data-act="scan-gallery" aria-label="gallery">${M.ico('image', 20)}</button>
      <button type="button" class="shutter" data-act="scan-capture" aria-label="shutter"><span></span></button>
      <button type="button" class="sc-side" data-act="scan-manual" aria-label="manual">${M.ico('pen', 20)}</button>
    </div>
    ${mode === 'bill' ? `<button type="button" class="manual" data-act="scan-manual">${M.t('manual')}</button>` : ''}`;
  M.$('#statusbar').classList.add('light-ink');
  requestAnimationFrame(() => {
    if (!M.scan.open) return;
    sc.classList.add('on');
    if (!auto) {
      M.startCameraStream();
    }
  });
  if (auto) M.addScanTimer(setTimeout(() => M.scan.open && M.runScan(), 700));
};

M.acts['scan-sample'] = el => {
  if (M.scan.busy) return;
  M.scan.billIdx = +el.dataset.idx;
  M.openScanner('bill');
};

M.acts['scan-flip'] = async el => {
  if (M.scan.busy) return;
  M.replayAnim(el, 'bump', 350);
  M.scan.facing = M.scan.facing === 'environment' ? 'user' : 'environment';
  await M.startCameraStream();
};

M.closeScanner = () => {
  M.clearScanTimers();
  M.stopCameraStream();
  M.scan.open = false;
  M.$('#scanner').classList.remove('on');
  M.$('#scrim').classList.remove('on');
  M.$('#statusbar').classList.remove('light-ink');
  M.sheet.close();
  M.liftSheet(false);
};
M.liftSheet = on => { M.$('#sheet').style.zIndex = on ? 56 : ''; M.$('#scrim').style.zIndex = on ? 55 : ''; };

M.runScan = async (customImage = null) => {
  if (M.scan.busy || !M.scan.open) return;
  M.scan.busy = true;
  M.scan.aiExtracted = null;
  M.scan.aiUsed = false;
  const $ = id => document.getElementById(id), mode = M.scan.mode;
  M.replayAnim(document.querySelector('.shutter'), 'snap', 350);
  M.replayAnim($('flashfx'), 'on', 460);
  if ($('vfHint')) $('vfHint').style.opacity = 0;

  let aiPromise = null;
  if (customImage) {
    M.stopCameraStream();
    const capBox = $('vfCaptured');
    if (capBox) {
      capBox.innerHTML = `<img src="${customImage}" alt="Captured paper">`;
      capBox.classList.add('on');
    }
    if ($('paper')) $('paper').style.opacity = '0';
    if (M.api && typeof M.api.analyzeScan === 'function') {
      aiPromise = M.api.analyzeScan({ mode, image: customImage, sampleIdx: M.scan.billIdx || 0 }).then(res => {
        if (res && res.extracted) {
          M.scan.aiExtracted = res.extracted;
          M.scan.aiUsed = Boolean(res.aiUsed);
        }
        return res;
      }).catch(() => null);
    }
  } else {
    M.stopCameraStream();
    if ($('paper')) {
      $('paper').style.opacity = '1';
      $('paper').classList.add('on');
    }
  }

  $('vfFrame')?.classList.add('locked');
  M.addScanTimer(setTimeout(() => { $('laser')?.classList.add('on'); }, 260));

  const steps = ['s1', 's2', 's3', 's4'], box = $('aiSteps');
  steps.forEach((k, i) => M.addScanTimer(setTimeout(() => {
    if (!M.scan.open || !box) return;
    box.querySelector('.ai-step:last-child .sp')?.replaceWith(Object.assign(document.createElement('span'), { className: 'ok', textContent: '✓' }));
    box.insertAdjacentHTML('beforeend', `<div class="ai-step"><span class="sp"></span>${M.t(k)}</div>`);
    if (k === 's3' && !customImage) $('paper')?.querySelectorAll('.hl').forEach((h, j) => M.addScanTimer(setTimeout(() => h.classList.add('on'), j * 280)));
  }, 400 + i * 520)));

  M.addScanTimer(setTimeout(async () => {
    if (!M.scan.open) return;
    if (aiPromise) {
      try {
        await Promise.race([
          aiPromise,
          new Promise(r => setTimeout(r, 12000))
        ]);
      } catch {}
    }
    if (!M.scan.open) return;
    box?.querySelector('.ai-step:last-child .sp')?.replaceWith(Object.assign(document.createElement('span'), { className: 'ok', textContent: '✓' }));
    $('laser')?.classList.remove('on');
    M.scanResult(mode, customImage);
  }, 400 + steps.length * 520 + 240));
};

M.scanResult = (mode, customImage = null) => {
  if (!M.scan.open) return;
  M.scan.customImage = customImage;
  const ar = M.s.lang === 'ar';
  const aiExt = M.scan.aiExtracted;
  const samp = M.BILL_SAMPLES[M.scan.billIdx || 0];
  const isRealPhoto = Boolean(customImage);
  const aiWorked = Boolean(M.scan.aiUsed && aiExt);

  const defaultMerchant = isRealPhoto && !aiWorked
    ? (ar ? 'وصل مشتريات ممسوح' : 'Scanned Receipt')
    : (ar ? 'أونو هايبر' : 'Uno Hypermarket');
  const defaultAmount = isRealPhoto && !aiWorked ? '' : 3450;

  const rMerchant = aiExt?.merchant ? M.L(aiExt.merchant) : defaultMerchant;
  const rAmount = aiExt?.amount ? Number(aiExt.amount) : defaultAmount;
  const rCat = (aiExt?.cat && M.CATS[aiExt.cat]) ? aiExt.cat : 'groceries';
  const curMemberId = aiExt?.member && M.MEMBERS.some(m => m.id === aiExt.member)
    ? aiExt.member
    : (M.s.currentMemberId || M.MEMBERS[0]?.id || 'abu');

  const defaultBiller = isRealPhoto && !aiWorked
    ? (ar ? 'فاتورة ممسوحة' : 'Scanned Bill')
    : M.L(samp.biller);
  const bBiller = aiExt?.biller ? M.L(aiExt.biller) : defaultBiller;
  const bKind = aiExt?.kind || samp.kind;
  const bAmount = aiExt?.amount ? Number(aiExt.amount) : (isRealPhoto && !aiWorked ? '' : samp.amount);
  const bDueDay = aiExt?.dueDay || samp.dueDay || 18;
  const bDueText = aiExt?.dueText ? M.L(aiExt.dueText) : M.L(samp.dueText);
  const bIsCurrent = aiExt?.isCurrentMonth !== undefined ? Boolean(aiExt.isCurrentMonth) : samp.isCurrentMonth;

  const dup = !isRealPhoto && (mode === 'receipt' ? M.s.scanCount > 0 && !aiExt : (!bIsCurrent && M.s.scheduled.some(b => b.id === 'ins2')));

  const fields = mode === 'receipt'
    ? [
        [M.t('merchant'), rMerchant],
        [M.t('amount'), (rAmount || 0) ? (M.fmt(rAmount) + ' ' + M.t('cur')) : (ar ? 'أدخل المبلغ' : 'Enter amount')],
        [M.t('category'), M.L(M.CATS[rCat].n)],
        [M.t('member'), M.L(M.member(curMemberId).n)],
        [M.t('autoDest'), M.t('segFeed')]
      ]
    : [
        [M.t('biller'), bBiller],
        [M.t('billType'), M.t(bKind === 'var' ? 'billVar' : 'billFixed')],
        [M.t('amount'), (bAmount || 0) ? (M.fmt(bAmount) + ' ' + M.t('cur')) : (ar ? 'أدخل المبلغ' : 'Enter amount')],
        [M.t('dueDate'), bDueText],
        [M.t('autoDest'), bIsCurrent ? M.t('destMonth') : M.t('destSched')]
      ];

  let alerts = '';
  if (isRealPhoto && !aiWorked) {
    const hasKey = Boolean(M.api?.getIntegrations()?.aiApiKey);
    alerts = `<div class="alert-box" style="--bc:var(--warn)">
      <span class="ab-i">${M.ico('spark', 20)}</span>
      <div style="flex:1">
        <b>${ar ? (hasKey ? 'تحقق من بيانات الورقة الممسوحة' : 'أدخل مفتاح Gemini AI لقراءة الورقة تلقائياً') : 'Verify scanned paper details'}</b><br>
        <span>${ar
          ? (hasKey ? 'يمكنك تعديل اسم المتجر أو المبلغ أدناه قبل الحفظ.' : 'لم يتم ربط مفتاح Gemini المجاني بعد. يمكنك كتابة بيانات الورقة أدناه أو لصق مفتاح Gemini ليقرأ الفواتير تلقائياً لكل العائلة.')
          : 'You can edit the extracted details below before saving.'}</span>
        ${!hasKey ? `<div style="margin-top:8px;display:flex;gap:6px">
          <input id="quickAiKeyIn" type="text" placeholder="AIzaSy..." style="flex:1;padding:7px 10px;border-radius:9px;border:1px solid var(--border);background:var(--card-solid);color:var(--ink);font-size:16px !important;direction:ltr">
          <button type="button" class="chip on" data-act="save-quick-ai-key">${ar ? 'حفظ وإعادة قراءة' : 'Save & Re-scan'}</button>
        </div>` : ''}
      </div>
    </div>`;
  } else if (dup) {
    alerts = `<div class="alert-box" style="--bc:var(--crit)"><span class="ab-i">${M.ico('copy', 20)}</span><div>${M.t('dupWarn')}</div></div>`;
  } else if (mode === 'receipt' && !isRealPhoto) {
    alerts = `<div class="alert-box" style="--bc:var(--warn)"><span class="ab-i">${M.ico('trend', 20)}</span><div>${M.t('hikeWarn')(ar ? 'سميد 10 كغ' : 'Semolina 10kg', 12)}</div></div>`;
  } else if (mode === 'bill' && bIsCurrent && !isRealPhoto) {
    const existing = M.s.bills.find(b => b.id === (aiExt?.targetId || samp.targetId));
    const oldP = existing ? existing.amount : samp.oldAmount;
    alerts = `<div class="alert-box" style="--bc:var(--primary)"><span class="ab-i">${M.ico('bolt', 20)}</span><div>${M.t('varBillNote')(M.fmt(oldP), M.fmt(bAmount))}</div></div>`;
  }

  const editableHtml = mode === 'receipt' ? `
    <div class="manual-form" id="scanEditBox" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
      <div style="font-size:11.5px;font-weight:700;color:var(--muted)">${ar ? 'تعديل أو تأكيد البيانات المستخرجة من الورقة:' : 'Verify or edit extracted paper details:'}</div>
      <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:8px">
        <label>${M.t('merchant')}<input id="scEditMerchant" value="${rMerchant}" autocomplete="off"></label>
        <label>${M.t('amount')} (${M.t('cur')})<input id="scEditAmount" type="text" inputmode="decimal" value="${rAmount}" placeholder="0"></label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label>${M.t('category')}
          <select id="scEditCat">
            ${Object.entries(M.CATS).map(([k, v]) => `<option value="${k}" ${k === rCat ? 'selected' : ''}>${M.L(v.n)}</option>`).join('')}
          </select>
        </label>
        <label>${M.t('member')}
          <select id="scEditMember">
            ${M.MEMBERS.map(m => `<option value="${m.id}" ${m.id === curMemberId ? 'selected' : ''}>${M.L(m.n)}</option>`).join('')}
          </select>
        </label>
      </div>
    </div>` : `
    <div class="manual-form" id="scanEditBox" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
      <div style="font-size:11.5px;font-weight:700;color:var(--muted)">${ar ? 'تعديل أو تأكيد بيانات الفاتورة المستخرجة:' : 'Verify or edit extracted bill details:'}</div>
      <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:8px">
        <label>${M.t('biller')}<input id="scEditBiller" value="${bBiller}" autocomplete="off"></label>
        <label>${M.t('amount')} (${M.t('cur')})<input id="scEditAmount" type="text" inputmode="decimal" value="${bAmount}" placeholder="0"></label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label>${M.t('billType')}
          <select id="scEditKind">
            <option value="var" ${bKind === 'var' ? 'selected' : ''}>${M.t('billVar')}</option>
            <option value="fixed" ${bKind === 'fixed' ? 'selected' : ''}>${M.t('billFixed')}</option>
          </select>
        </label>
        <label>${ar ? 'يوم الاستحقاق بالشهر' : 'Due Day (1-30)'}
          <input id="scEditDueDay" type="text" inputmode="numeric" value="${bDueDay}">
        </label>
      </div>
    </div>`;

  M.liftSheet(true);
  M.sheet.open(`<span style="color:var(--safe);display:inline-grid">${M.ico('checkc', 20)}</span> <span>${M.t(mode === 'receipt' ? 'resultR' : 'resultB')}</span>`, `
    <div class="group" id="rf">${fields.map(([k]) => `<div class="result-field"><span class="muted">${k}</span><span class="rf-v"></span></div>`).join('')}</div>
    ${alerts}
    ${editableHtml}
    <button type="button" class="btn" style="margin-top:10px" data-act="scan-confirm" data-dup="${dup ? 1 : 0}">${dup ? M.t('addAnyway') : M.t(mode === 'receipt' ? 'confirmR' : 'confirmB')}</button>`, {
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
        }, 14);
        M.addScanTimer(tick);
      }, 120 + i * 160)));
    }
  });
};

M.acts['save-quick-ai-key'] = async () => {
  const inp = document.getElementById('quickAiKeyIn');
  const key = (inp?.value || '').trim();
  if (!key) return;
  M.CONFIG = M.CONFIG || {};
  M.CONFIG.AI_API_KEY = key;
  M.s.aiApiKey = key;
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.saveSharedAiKey?.(key);
  }
  const savedImg = M.scan.customImage;
  M.sheet.close();
  M.liftSheet(false);
  M.scan.busy = false;
  if (savedImg) {
    M.runScan(savedImg);
  }
};

M.acts['scan-confirm'] = el => {
  const mode = M.scan.mode, ar = M.s.lang === 'ar';
  const samp = M.BILL_SAMPLES[M.scan.billIdx || 0];
  const aiExt = M.scan.aiExtracted;
  const customImg = M.scan.customImage;
  const isRealPhoto = Boolean(customImg);

  const editedMerchant = document.getElementById('scEditMerchant')?.value?.trim();
  const editedBiller = document.getElementById('scEditBiller')?.value?.trim();
  const editedAmountRaw = document.getElementById('scEditAmount')?.value || '';
  const editedAmount = Number(M.toWesternDigits(String(editedAmountRaw)).replace(/[^\d.]/g, ''));
  const editedCat = document.getElementById('scEditCat')?.value;
  const editedMember = document.getElementById('scEditMember')?.value;
  const editedKind = document.getElementById('scEditKind')?.value;
  const editedDueDay = Number(M.toWesternDigits(String(document.getElementById('scEditDueDay')?.value || ''))) || 18;

  if (isRealPhoto && !(editedAmount > 0)) {
    const amtInput = document.getElementById('scEditAmount');
    if (amtInput) {
      amtInput.focus();
      amtInput.style.borderColor = 'var(--crit)';
    }
    M.toast(ar ? 'يرجى إدخال مبلغ الورقة أولاً' : 'Please enter the amount first');
    return;
  }

  M.scan.customImage = null;
  M.scan.aiExtracted = null;
  el.closest('.sh-body').innerHTML = `<div class="empty">${M.successCheck()}<h4>${M.t(mode === 'receipt' ? 'addedR' : 'addedB')}</h4></div>`;

  const rAmount = editedAmount > 0 ? editedAmount : (aiExt?.amount ? Number(aiExt.amount) : 3450);
  const rMerchant = editedMerchant
    ? { ar: editedMerchant, en: editedMerchant }
    : (aiExt?.merchant || { ar: 'أونو هايبر', en: 'Uno Hypermarket' });
  const rCat = editedCat || ((aiExt?.cat && M.CATS[aiExt.cat]) ? aiExt.cat : 'groceries');
  const rMember = editedMember || aiExt?.member || M.s.currentMemberId || 'umm';

  if (mode === 'receipt') {
    const id = Date.now();
    const defaultItems = isRealPhoto
      ? [{ n: rMerchant, q: 1, p: rAmount }]
      : [['حليب 1 لتر', 'Milk 1L', 4, 90], ['بيض 30', 'Eggs 30', 1, 560], ['سميد 10 كغ', 'Semolina 10kg', 1, 1400], ['دجاج 1 كغ', 'Chicken 1kg', 1, 480], ['خضر', 'Vegetables', 1, 340], ['باقيت', 'Baguette', 6, 15], ['جبن', 'Cheese', 1, 220]].map(([a, e, q, p]) => ({ n: { ar: a, en: e }, q, p }));
    const newP = {
      id,
      member: rMember,
      merchant: rMerchant,
      cat: rCat,
      amount: rAmount,
      day: M.s.day,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      scanned: true,
      items: (Array.isArray(aiExt?.items) && aiExt.items.length) ? aiExt.items : defaultItems
    };
    M.s.purchases.unshift(newP);
    M.s.scanCount++;
    M.freshId = id;
    M.tickerNew = true;
    if (M.api) {
      M.api.saveLocal(M.s);
      if (isRealPhoto) {
        M.api.addPurchase(newP).catch(() => {});
      } else {
        M.api.scan({ id, mode: 'receipt' }).then(res => {
          if (res?.persisted?.record?.id) {
            newP.id = res.persisted.record.id;
            M.freshId = res.persisted.record.id;
            M.api.saveLocal(M.s);
          }
        }).catch(() => {});
      }
    }
  } else {
    const sampIdx = M.scan.billIdx || 0;
    const isCur = aiExt?.isCurrentMonth !== undefined ? Boolean(aiExt.isCurrentMonth) : (isRealPhoto ? true : samp.isCurrentMonth);
    const targetId = aiExt?.targetId || (isRealPhoto ? ('b_' + Date.now()) : samp.targetId);
    const bAmount = editedAmount > 0 ? editedAmount : (aiExt?.amount ? Number(aiExt.amount) : samp.amount);
    const bBiller = editedBiller
      ? { ar: editedBiller, en: editedBiller }
      : (aiExt?.biller || samp.biller);
    const bKind = editedKind || aiExt?.kind || samp.kind;

    if (isCur) {
      const existing = M.s.bills.find(b => b.id === targetId);
      if (existing) {
        existing.prevAmount = existing.amount;
        existing.amount = bAmount;
        existing.n = bBiller;
        existing.kind = bKind;
        existing.paid = false;
        existing.scanned = true;
        M.freshBillId = existing.id;
        if (M.api && isRealPhoto) M.api.updateBill(existing.id, existing).catch(() => {});
      } else {
        const nid = targetId || ('b' + Date.now());
        const nb = { id: nid, n: bBiller, cat: aiExt?.cat || samp.cat || 'utilities', amount: bAmount, due: editedDueDay || aiExt?.dueDay || samp.dueDay || 18, paid: false, kind: bKind, scanned: true };
        M.s.bills.unshift(nb);
        M.freshBillId = nid;
        if (M.api && isRealPhoto) M.api.saveBill(nb).catch(() => {});
      }
    } else {
      const sched = {
        id: 'ins2', n: bBiller || { ar: 'تأمين أكسنت · SAA', en: 'Accent insurance · SAA' }, cat: 'car', amount: bAmount || 19800, kind: 'fixed',
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
      if (!isRealPhoto) {
        M.api.scan({ mode: 'bill', sampleIdx: sampIdx }).then(res => {
          if (res?.state) {
            const keep = { os: M.s.os, theme: M.s.theme, lang: M.s.lang, tab: M.s.tab, billSeg: M.s.billSeg, famSeg: M.s.famSeg, privacy: M.s.privacy };
            Object.assign(M.s, res.state, keep);
            if (res.persisted?.targetId) M.freshBillId = res.persisted.targetId;
            M.api.saveLocal(M.s);
          }
        }).catch(() => {});
      }
    }

    if (!isRealPhoto) {
      M.scan.billIdx = ((M.scan.billIdx || 0) + 1) % M.BILL_SAMPLES.length;
    }
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
      const billTitle = editedBiller ? { ar: editedBiller, en: editedBiller } : (aiExt?.biller || samp.biller);
      M.toast(`${M.ico('checkc', 16)} ${M.t('addedB')} · ${M.L(billTitle)}`);
      M.checkThreshold();
    }
    M.freshId = null;
    setTimeout(() => { M.freshBillId = null; }, 1600);
  }, 1150));
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
M.acts['scan-flash'] = async el => {
  M.replayAnim(document.getElementById('flashfx'), 'on', 460);
  M.replayAnim(el, 'bump', 400);
  M.scan.torch = !M.scan.torch;
  if (M.scan.stream) {
    const track = M.scan.stream.getVideoTracks?.()[0];
    if (track && typeof track.applyConstraints === 'function') {
      try {
        await track.applyConstraints({ advanced: [{ torch: M.scan.torch }] });
      } catch {}
    }
  }
};
M.acts['scan-mode'] = el => { if (!M.scan.busy) M.openScanner(el.dataset.id); };
M.acts['scan-manual'] = () => {
  M.clearScanTimers();
  if (M.$('#scanner').classList.contains('on')) M.liftSheet(true);
  const ar = M.s.lang === 'ar';
  const todayStr = new Date().toISOString().slice(0, 10);
  M.sheet.open(M.t('manualT'), `<form class="manual-form" data-form="manual">
    <label>${M.t('name')}<input name="n" required placeholder="${ar ? 'مثال: فاتورة الكهرباء / رسوم المدرسة' : 'e.g. Electricity bill / School fees'}" value="" autocomplete="off"></label>
    <label>${M.t('billType')}
      <div class="kind-pick">
        <button type="button" class="kp-btn on" data-act="pick-kind" data-v="fixed">${M.ico('shield', 14, 2)} ${M.t('billFixed')}</button>
        <button type="button" class="kp-btn" data-act="pick-kind" data-v="var">${M.ico('bolt', 14, 2)} ${M.t('billVar')}</button>
      </div>
      <input type="hidden" name="kind" value="fixed">
    </label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <label>${M.t('amount')} (${M.t('cur')})<input name="a" type="text" inputmode="decimal" required placeholder="1500" value=""></label>
      <label>${M.t('dueDate')}<input name="d" type="date" required value="${todayStr}"></label>
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
  const now = new Date();
  if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
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
