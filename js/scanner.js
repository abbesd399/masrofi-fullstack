/* AI Camera Scanner — Clean Native Viewfinder + Hardware Multi-Camera Lens Switcher & Zoom Dial (0.5 · 1x · 2.5) + Auto Receipt/Bill AI */
M.scan = {
  mode: 'receipt',
  billIdx: 0,
  busy: false,
  _switchingLens: false,
  timers: [],
  aiExtracted: null,
  aiUsed: false,
  stream: null,
  facing: 'environment',
  zoom: 1,
  zoomSteps: [0.5, 1, 2.5],
  lensMap: { ultra: null, wide: null, tele: null, front: null, fusion: null },
  activeDeviceId: null,
  torch: false,
  customImage: null
};

/* Kept only for headless API unit tests */
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
    paper: ''
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
    paper: ''
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
    paper: ''
  }
];

M.clearScanTimers = () => {
  (M.scan.timers || []).forEach(id => { clearTimeout(id); clearInterval(id); });
  M.scan.timers = [];
  M.scan.busy = false;
  M.scan._switchingLens = false;
};
M.addScanTimer = id => { M.scan.timers.push(id); return id; };

/* ── Discover Hardware Camera Lenses (Ultra-Wide 0.5x, Wide 1x, Telephoto 2x/2.5x/3x) & Device Zoom Steps ── */
M.isFrontCameraDevice = (d, lbl = '') => {
  const l = (lbl || d?.label || '').toLowerCase();
  if (/front|user|facetime|truedepth|true depth|selfie|avant|أمام|امام/i.test(l)) {
    return true;
  }
  if (d && typeof d.getCapabilities === 'function') {
    try {
      const caps = d.getCapabilities();
      if (Array.isArray(caps?.facingMode)) {
        if (caps.facingMode.includes('user') && !caps.facingMode.includes('environment')) {
          return true;
        }
      }
    } catch {}
  }
  return false;
};

M.isBackCameraDevice = (d, lbl = '') => {
  if (M.isFrontCameraDevice(d, lbl)) return false;
  const l = (lbl || d?.label || '').toLowerCase();
  if (/back|rear|environment|arrière|arriere|خلف/i.test(l)) {
    return true;
  }
  if (d && typeof d.getCapabilities === 'function') {
    try {
      const caps = d.getCapabilities();
      if (Array.isArray(caps?.facingMode)) {
        if (caps.facingMode.includes('environment')) return true;
        if (caps.facingMode.includes('user')) return false;
      }
    } catch {}
  }
  return true;
};

M.detectPhoneZoomSteps = async () => {
  if (M.scan.facing === 'user') {
    M.scan.zoomSteps = [1];
    M.scan.zoom = 1;
    M.renderZoomDial();
    return;
  }

  const prevMap = M.scan.lensMap || {};
  const lensMap = {
    ultra: prevMap.ultra || null,
    wide: prevMap.wide || null,
    tele: prevMap.tele || null,
    front: prevMap.front || null,
    fusion: prevMap.fusion || null
  };
  let hasUltra = Boolean(lensMap.ultra);
  let hasTele = Boolean(lensMap.tele);
  let teleZoom = 2;

  // Detect iPhone model optical tele factor from screen geometry (e.g. iPhone 12 Pro Max = 2.5x, 13/14/15/16 Pro = 3x)
  const sw = Math.min(window.screen?.width || 390, window.screen?.height || 844);
  const sh = Math.max(window.screen?.width || 390, window.screen?.height || 844);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || '') || (M.s?.os === 'ios');
  if (isIOS) {
    if (sw === 428 && sh === 926) {
      teleZoom = 2.5; // iPhone 12 Pro Max
    } else if (sh === 852 || sh === 932 || sh === 874 || sh === 956) {
      teleZoom = 3; // iPhone 14/15/16 Pro & Pro Max
    } else {
      teleZoom = 2.5;
    }
  }

  try {
    const track = M.scan.stream?.getVideoTracks?.()[0];
    const caps = (track && typeof track.getCapabilities === 'function') ? track.getCapabilities() : null;
    const settings = (track && typeof track.getSettings === 'function') ? track.getSettings() : null;

    // If current stream is an environment (back) camera at 1x, lock its deviceId as default wide if not yet set
    if (settings?.deviceId && settings?.facingMode !== 'user' && M.scan.facing === 'environment' && M.scan.zoom === 1) {
      if (!lensMap.wide) {
        lensMap.wide = settings.deviceId;
      }
    }

    if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput' && d.deviceId);
      const backSingleLenses = [];

      for (let idx = 0; idx < videoInputs.length; idx++) {
        const d = videoInputs[idx];
        const lbl = (d.label || '').toLowerCase();

        // 1. Identify and skip Front / FaceTime cameras (NEVER put a front camera into rear lens slots!)
        if (M.isFrontCameraDevice(d, lbl) || (idx === 0 && videoInputs.length > 1 && !lbl)) {
          if (!lensMap.front) lensMap.front = d.deviceId;
          continue;
        }
        // 2. Skip depth / LiDAR sensors
        if (/depth|lidar|عمق/i.test(lbl)) {
          continue;
        }
        // 3. Identify virtual composite multi-camera entries on iOS ("Back Triple Camera", "Back Dual Wide Camera", "Back Dual Camera", "الثلاثية", "المزدوجة")
        if (/triple|dual|double|ثلاثية|مزدوجة/i.test(lbl)) {
          if (/triple|ثلاثية/i.test(lbl)) {
            lensMap.fusion = d.deviceId;
            hasUltra = true;
            hasTele = true;
          } else if (/dual|double|مزدوجة/i.test(lbl)) {
            if (!lensMap.fusion) lensMap.fusion = d.deviceId;
            if (/wide|واسعة|grand-angle/i.test(lbl)) hasUltra = true;
          }
          continue;
        }

        if (!M.isBackCameraDevice(d, lbl)) {
          continue;
        }

        backSingleLenses.push(d);

        // Match Ultra-Wide (0.5x) in English ("Ultra Wide"), Arabic ("الواسعة جدًا" / "فائقة الاتساع" / "واسعة للغاية"), French ("ultra grand-angle")
        if (/ultra|0\.5|فائقة|واسعة جد|واسعة للغاية|الواسعة جد|الواسعة للغاية|ultra grand-angle/i.test(lbl)) {
          lensMap.ultra = d.deviceId;
          hasUltra = true;
        } else if (/tele|مقرب|المقربة|تقريب|téléobjectif/i.test(lbl)) {
          lensMap.tele = d.deviceId;
          hasTele = true;
          if (/3x/i.test(lbl)) teleZoom = 3;
          else if (/2\.5x/i.test(lbl)) teleZoom = 2.5;
          else if (/2x/i.test(lbl)) teleZoom = 2;
        } else if (/^back camera$|^الكاميرا الخلفية$|^كاميرا خلفية$|^caméra arrière$|^appareil photo arrière$/i.test(lbl)) {
          lensMap.wide = d.deviceId;
        }
      }

      // Fill any remaining single rear lens slots from verified backSingleLenses (never includes front or virtual cameras)
      const unassignedBack = backSingleLenses.filter(d => d.deviceId !== lensMap.front);
      if (!lensMap.wide && unassignedBack.length >= 1) {
        const firstWide = unassignedBack.find(d => d.deviceId !== lensMap.ultra && d.deviceId !== lensMap.tele);
        if (firstWide) lensMap.wide = firstWide.deviceId;
      }
      if (!lensMap.ultra && unassignedBack.length >= 2) {
        const candUltra = unassignedBack.find(d => d.deviceId !== lensMap.wide && d.deviceId !== lensMap.tele);
        if (candUltra) {
          lensMap.ultra = candUltra.deviceId;
          hasUltra = true;
        }
      }
      if (!lensMap.tele && unassignedBack.length >= 3) {
        const candTele = unassignedBack.find(d => d.deviceId !== lensMap.wide && d.deviceId !== lensMap.ultra);
        if (candTele) {
          lensMap.tele = candTele.deviceId;
          hasTele = true;
        }
      }
    }

    if (caps?.zoom) {
      if (caps.zoom.min < 1) hasUltra = true;
      if (caps.zoom.max >= 2 && !hasTele) {
        hasTele = true;
        if (!isIOS) teleZoom = 2;
      }
    }
  } catch {}

  // Final safety guard: ensure front camera deviceId is NEVER assigned to wide, ultra, or tele
  if (lensMap.front) {
    if (lensMap.wide === lensMap.front) lensMap.wide = null;
    if (lensMap.ultra === lensMap.front) lensMap.ultra = null;
    if (lensMap.tele === lensMap.front) lensMap.tele = null;
  }

  M.scan.lensMap = lensMap;

  if (hasUltra && hasTele) {
    M.scan.zoomSteps = [0.5, 1, teleZoom];
  } else if (hasUltra && !hasTele) {
    M.scan.zoomSteps = [0.5, 1, 2];
  } else if (!hasUltra && hasTele) {
    M.scan.zoomSteps = [1, teleZoom];
  } else {
    M.scan.zoomSteps = isIOS ? [0.5, 1, 2.5] : [0.5, 1, 2];
  }

  if (!M.scan.zoomSteps.includes(M.scan.zoom)) {
    M.scan.zoom = 1;
  }
  M.renderZoomDial();
};

/* Render Native Camera Zoom Dial at Bottom of Viewfinder (0.5 · 1x · 2.5) */
M.renderZoomDial = () => {
  const dial = document.getElementById('camZoomDial');
  if (!dial) return;
  if (M.scan.facing === 'user') {
    dial.style.display = 'none';
    return;
  }
  const steps = M.scan.zoomSteps?.length ? M.scan.zoomSteps : [0.5, 1, 2.5];
  if (steps.length <= 1) {
    dial.style.display = 'none';
    return;
  }
  dial.style.display = 'inline-flex';
  dial.style.opacity = '1';
  dial.innerHTML = steps.map(z => {
    const active = Number(M.scan.zoom) === Number(z);
    const label = active ? `${z}x` : `${z}`;
    return `<button type="button" class="cam-z-btn ${active ? 'on' : ''}" data-act="scan-zoom" data-z="${z}" aria-label="Zoom ${z}x">${label}</button>`;
  }).join('');
};

/* Ensure <video id="camVideo"> always fills 100% of .viewfinder with zero letterboxing */
M.ensureFullBleedVideo = vid => {
  if (!vid) return;
  vid.setAttribute('playsinline', '');
  vid.setAttribute('webkit-playsinline', '');
  vid.setAttribute('autoplay', '');
  vid.muted = true;
  vid.style.position = 'absolute';
  vid.style.inset = '0';
  vid.style.width = '100%';
  vid.style.height = '100%';
  vid.style.minWidth = '100%';
  vid.style.minHeight = '100%';
  vid.style.objectFit = 'cover';
  vid.style.objectPosition = 'center center';
};

/* Switch Physical Camera Lens & Hardware Zoom When User Taps 0.5 / 1x / 2.5 */
M.applyCameraZoom = async targetZ => {
  if (M.scan._switchingLens || M.scan.busy || !M.scan.open || M.scan.facing === 'user') return;
  const z = Number(targetZ) || 1;
  const vid = document.getElementById('camVideo');
  if (!vid) return;

  // CRITICAL: If already on this exact zoom level and the stream is active, DO NOTHING!
  // Never re-open or toggle the camera when the user taps 1x (or 0.5x / 2.5x) a second time!
  if (Number(M.scan.zoom) === z && M.scan.stream && vid.classList.contains('on')) {
    return;
  }

  M.scan.zoom = z;
  M.renderZoomDial();

  M.scan._switchingLens = true;
  try {
    const lm = M.scan.lensMap || {};
    let desiredDeviceId = null;
    if (z < 1 && lm.ultra) {
      desiredDeviceId = lm.ultra;
    } else if (z > 1 && lm.tele) {
      desiredDeviceId = lm.tele;
    } else if (lm.wide) {
      desiredDeviceId = lm.wide;
    }

    // Never allow a zoom button to target the front camera
    if (desiredDeviceId && desiredDeviceId === lm.front) {
      desiredDeviceId = null;
    }

    let switchedPhysicalLens = false;

    // 1. If a distinct physical rear lens exists for this zoom level (0.5x Ultra-Wide, 1x Wide, or 2.5x Telephoto)
    //    and isn't currently active, switch to that physical rear lens!
    if (desiredDeviceId && desiredDeviceId !== M.scan.activeDeviceId && navigator.mediaDevices?.getUserMedia && !M.scan._canvasTimer) {
      const opened = await M.startCameraStream(desiredDeviceId, { skipDetect: true });
      if (opened && M.scan.activeDeviceId === desiredDeviceId) {
        switchedPhysicalLens = true;
      }
    }

    // 2. Try native WebRTC hardware zoom on the active video track
    let hwZoomWorked = false;
    const track = M.scan.stream?.getVideoTracks?.()[0];
    if (track && typeof track.getCapabilities === 'function' && typeof track.applyConstraints === 'function') {
      try {
        const caps = track.getCapabilities();
        if (caps && caps.zoom) {
          const minZ = caps.zoom.min ?? 1;
          const maxZ = caps.zoom.max ?? 1;
          const targetHwZ = switchedPhysicalLens ? Math.max(minZ, Math.min(maxZ, 1)) : Math.max(minZ, Math.min(maxZ, z));
          await track.applyConstraints({ advanced: [{ zoom: targetHwZ }] });
          if (!switchedPhysicalLens && z >= minZ && z <= maxZ && (maxZ > 1 || minZ < 1)) {
            hwZoomWorked = true;
          }
        }
      } catch {}
    }

    // 3. Never shrink #camVideo below scale(1)! If z > 1 and we didn't switch to a dedicated tele lens or hw zoom, apply smooth center zoom
    M.ensureFullBleedVideo(vid);
    if (switchedPhysicalLens || hwZoomWorked || z <= 1) {
      vid.style.transform = 'scale(1)';
    } else {
      vid.style.transform = `scale(${z})`;
    }
  } finally {
    M.scan._switchingLens = false;
  }
};

/* ── In-App Live Camera Stream (opens camera inside .viewfinder without leaving the app!) ── */
M.stopCameraStream = () => {
  if (M.scan._canvasTimer) {
    clearInterval(M.scan._canvasTimer);
    M.scan._canvasTimer = null;
  }
  if (M.scan.stream) {
    try {
      M.scan.stream.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
    } catch {}
    M.scan.stream = null;
  }
  M.scan.activeDeviceId = null;
  const vid = document.getElementById('camVideo');
  if (vid) {
    try { vid.pause(); } catch {}
    try { vid.srcObject = null; } catch {}
    vid.style.transform = 'scale(1)';
    vid.classList.remove('on');
  }
};

M.startCameraStream = async (preferredDeviceId = null, opts = {}) => {
  const hadActiveStream = Boolean(M.scan.stream);
  M.stopCameraStream();
  const vid = document.getElementById('camVideo');
  if (!vid || !M.scan.open) return false;

  // Give iOS AVCaptureSession 110ms to release the previous camera hardware lock before opening another lens
  if (hadActiveStream) {
    await new Promise(r => setTimeout(r, 110));
    if (!M.scan.open) return false;
  }

  // 1. Primary: Real hardware camera stream inside the app via getUserMedia
  if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
    const facing = M.scan.facing || 'environment';
    const lm = M.scan.lensMap || {};
    const constraintsList = [];

    if (facing === 'user') {
      // Front camera mode (only when user explicitly tapped the top Flip Camera button)
      if (lm.front) {
        constraintsList.push({ video: { deviceId: { exact: lm.front } }, audio: false });
      }
      constraintsList.push(
        { video: { facingMode: { exact: 'user' } }, audio: false },
        { video: { facingMode: 'user' }, audio: false }
      );
    } else {
      // Rear camera mode ('environment') — STRICTLY forbid opening the front camera!
      if (preferredDeviceId && preferredDeviceId !== lm.front) {
        constraintsList.push({
          video: { deviceId: { exact: preferredDeviceId } },
          audio: false
        });
      }
      if (lm.wide && lm.wide !== preferredDeviceId && lm.wide !== lm.front) {
        constraintsList.push({
          video: { deviceId: { exact: lm.wide } },
          audio: false
        });
      }
      constraintsList.push(
        { video: { facingMode: { exact: 'environment' } }, audio: false },
        { video: { facingMode: { ideal: 'environment' } }, audio: false }
      );
    }

    for (const constraints of constraintsList) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!M.scan.open) {
          stream.getTracks().forEach(t => { try { t.stop(); } catch {} });
          return false;
        }
        const activeTrack = stream.getVideoTracks?.()[0];
        const settings = activeTrack?.getSettings?.() || {};
        const trackLabel = (activeTrack?.label || '').toLowerCase();

        // Guard: If we requested the BACK camera ('environment'), reject any stream that iOS opened on the FRONT camera!
        if (facing === 'environment' && (settings.facingMode === 'user' || M.isFrontCameraDevice(activeTrack, trackLabel))) {
          if (settings.deviceId && !M.scan.lensMap.front) {
            M.scan.lensMap.front = settings.deviceId;
          }
          stream.getTracks().forEach(t => { try { t.stop(); } catch {} });
          await new Promise(r => setTimeout(r, 80));
          continue;
        }

        // Guard: If we requested the FRONT camera ('user'), reject any stream that opened on the BACK camera!
        if (facing === 'user' && settings.facingMode === 'environment') {
          stream.getTracks().forEach(t => { try { t.stop(); } catch {} });
          await new Promise(r => setTimeout(r, 80));
          continue;
        }

        M.scan.stream = stream;
        M.scan.activeDeviceId = settings.deviceId || preferredDeviceId || null;
        if (facing === 'user' && settings.deviceId) {
          M.scan.lensMap.front = settings.deviceId;
        }
        M.ensureFullBleedVideo(vid);
        vid.srcObject = stream;
        vid.style.transform = 'scale(1)';
        vid.onloadedmetadata = () => M.ensureFullBleedVideo(vid);
        await vid.play().catch(() => {});
        vid.classList.add('on');
        if (!opts.skipDetect) {
          await M.detectPhoneZoomSteps();
        } else {
          M.renderZoomDial();
        }
        return true;
      } catch {
        // try next constraint in list
      }
    }
  }

  // 2. Fallback: In-app live viewfinder stream when testing on desktop without a physical webcam
  if (!opts.skipDetect) {
    await M.detectPhoneZoomSteps();
  } else {
    M.renderZoomDial();
  }
  try {
    const c = document.createElement('canvas');
    c.width = 720;
    c.height = 960;
    const ctx = c.getContext('2d');
    const drawFrame = () => {
      ctx.fillStyle = M.scan.facing === 'user' ? '#131C31' : '#0D1726';
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
      M.ensureFullBleedVideo(vid);
      vid.srcObject = stream;
      vid.style.transform = 'scale(1)';
      await vid.play().catch(() => {});
      vid.classList.add('on');
      return true;
    }
  } catch {}
  return false;
};

/* Capture current video frame from #camVideo as optimized JPEG DataURL */
M.captureFrameFromVideo = () => {
  const vid = document.getElementById('camVideo');
  if (!vid || !vid.classList.contains('on') || !(vid.videoWidth > 0 && vid.videoHeight > 0)) {
    return null;
  }
  try {
    const maxDim = 1280;
    const vw = vid.videoWidth;
    const vh = vid.videoHeight;
    const isCssScaled = vid.style.transform && vid.style.transform.includes('scale(') && !vid.style.transform.includes('scale(1)');
    const z = (isCssScaled && Number(M.scan.zoom) > 1) ? Number(M.scan.zoom) : 1;

    const sx = z > 1 ? Math.round((vw - vw / z) / 2) : 0;
    const sy = z > 1 ? Math.round((vh - vh / z) / 2) : 0;
    const sw = z > 1 ? Math.round(vw / z) : vw;
    const sh = z > 1 ? Math.round(vh / z) : vh;

    let w = sw;
    let h = sh;
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
    ctx.drawImage(vid, sx, sy, sw, sh, 0, 0, w, h);
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
    // Wait briefly if a lens switch (0.5x / 1x / 2.5x) is currently completing
    for (let i = 0; i < 12 && M.scan._switchingLens; i++) {
      await new Promise(r => setTimeout(r, 50));
    }
    // Wait up to 450ms for video frame dimensions if stream is active
    if (M.scan.stream) {
      for (let i = 0; i < 9; i++) {
        const frame = M.captureFrameFromVideo();
        if (frame) return frame;
        await new Promise(r => setTimeout(r, 50));
      }
    }
    // Otherwise start the camera stream and grab the frame
    const started = await M.startCameraStream();
    if (started) {
      for (let i = 0; i < 10; i++) {
        const frameAfterStart = M.captureFrameFromVideo();
        if (frameAfterStart) return frameAfterStart;
        await new Promise(r => setTimeout(r, 50));
      }
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

/* Clean, Clutter-Free Native Camera Scanner UI — Zero Top Text Lists, Zero Bottom Text Overlap, Pure Zoom Dial (0.5 · 1x · 2.5) */
M.openScanner = (mode = 'receipt', auto = false) => {
  M.clearScanTimers();
  M.scan.mode = mode;
  M.scan.open = true;
  M.scan.aiExtracted = null;
  M.scan.aiUsed = false;
  M.scan.zoom = 1;
  const sc = M.$('#scanner');
  const ar = M.s.lang === 'ar';

  sc.innerHTML = `
    <input type="file" id="scanCameraIn" accept="image/*" style="display:none">
    <input type="file" id="scanGalleryIn" accept="image/*" style="display:none">
    <div class="sc-top">
      <button type="button" class="sc-x" data-act="scan-close" aria-label="close">${M.ico('close', 18, 2.4)}</button>
      <h3>${M.ico('spark', 15, 2)} ${M.t('scan')}</h3>
      <div style="display:flex;gap:6px;align-items:center">
        <button type="button" class="sc-x" data-act="scan-flip" aria-label="flip camera" title="${ar ? 'قلب الكاميرا' : 'Flip camera'}">${M.ico('flip', 17)}</button>
        <button type="button" class="sc-x" data-act="scan-flash" aria-label="flash">${M.ico('flash', 18)}</button>
      </div>
    </div>
    <div class="viewfinder">
      <div class="vf-grid"></div><div class="vf-noise"></div>
      <video id="camVideo" autoplay playsinline muted webkit-playsinline></video>
      <div class="vf-captured" id="vfCaptured"></div>
      <div class="vf-frame" id="vfFrame"><i></i><i></i><i></i><i></i></div>
      <div class="laser" id="laser"></div>
      <div class="cam-zoom-dial" id="camZoomDial" dir="ltr"></div>
      <div class="ai-steps" id="aiSteps"></div>
      <div class="flashfx" id="flashfx"></div>
    </div>
    <div class="sc-bottom">
      <button type="button" class="sc-side" data-act="scan-gallery" aria-label="gallery" title="${ar ? 'اختيار صورة من المعرض' : 'Pick from gallery'}">${M.ico('image', 20)}</button>
      <button type="button" class="shutter" data-act="scan-capture" aria-label="shutter"><span></span></button>
      <button type="button" class="sc-side" data-act="scan-manual" aria-label="manual" title="${ar ? 'إدخال يدوي' : 'Manual entry'}">${M.ico('pen', 20)}</button>
      <button type="button" class="sc-sim" data-act="scan-run" style="display:none" aria-hidden="true"></button>
    </div>`;
  M.renderZoomDial();
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

/* Tap 0.5 / 1x / 2.5 in the bottom zoom dial */
M.acts['scan-zoom'] = el => {
  if (M.scan.busy || M.scan._switchingLens) return;
  const z = Number(el.dataset.z) || 1;
  M.applyCameraZoom(z);
};

/* Flip between back and front camera */
M.acts['scan-flip'] = async el => {
  if (M.scan.busy || M.scan._switchingLens) return;
  M.scan._switchingLens = true;
  try {
    M.replayAnim(el, 'bump', 350);
    M.scan.facing = M.scan.facing === 'environment' ? 'user' : 'environment';
    M.scan.zoom = 1;
    await M.startCameraStream();
  } finally {
    M.scan._switchingLens = false;
  }
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

/* Build compact price history array to send to AI Vision so AI detects price hikes over time */
M.buildPriceHistoryContext = () => {
  const map = M.getHistoricalPriceMap();
  const list = [];
  for (const [, val] of map.entries()) {
    const name = val.label?.ar || val.label?.en || val.label;
    if (name && val.price > 0 && !list.some(x => x.name === name)) {
      list.push({ name, lastPrice: val.price });
    }
    if (list.length >= 30) break;
  }
  return list;
};

M.runScan = async (customImage = null) => {
  if (M.scan.busy || !M.scan.open) return;
  M.scan.busy = true;
  M.scan.aiExtracted = null;
  M.scan.aiUsed = false;
  const $ = id => document.getElementById(id), mode = M.scan.mode;
  M.replayAnim(document.querySelector('.shutter'), 'snap', 350);
  M.replayAnim($('flashfx'), 'on', 460);
  if ($('camZoomDial')) $('camZoomDial').style.opacity = 0;

  let aiPromise = null;
  if (customImage) {
    M.stopCameraStream();
    const capBox = $('vfCaptured');
    if (capBox) {
      capBox.innerHTML = `<img src="${customImage}" alt="Captured paper">`;
      capBox.classList.add('on');
    }
    if (M.api && typeof M.api.analyzeScan === 'function') {
      const priceHistory = M.buildPriceHistoryContext();
      aiPromise = M.api.analyzeScan({ mode, image: customImage, priceHistory, sampleIdx: M.scan.billIdx || 0 }).then(res => {
        if (res && res.extracted) {
          M.scan.aiExtracted = res.extracted;
          M.scan.aiUsed = Boolean(res.aiUsed);
        }
        return res;
      }).catch(() => null);
    }
  } else {
    M.stopCameraStream();
  }

  $('vfFrame')?.classList.add('locked');
  M.addScanTimer(setTimeout(() => { $('laser')?.classList.add('on'); }, 260));

  const steps = ['s1', 's2', 's3', 's4'], box = $('aiSteps');
  steps.forEach((k, i) => M.addScanTimer(setTimeout(() => {
    if (!M.scan.open || !box) return;
    box.querySelector('.ai-step:last-child .sp')?.replaceWith(Object.assign(document.createElement('span'), { className: 'ok', textContent: '✓' }));
    box.insertAdjacentHTML('beforeend', `<div class="ai-step"><span class="sp"></span>${M.t(k)}</div>`);
  }, 380 + i * 480)));

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
  }, 380 + steps.length * 480 + 220));
};

M.scanResult = (mode, customImage = null) => {
  if (!M.scan.open) return;
  M.scan.customImage = customImage;
  const ar = M.s.lang === 'ar';
  const aiExt = M.scan.aiExtracted;
  if (aiExt) {
    const combinedTitle = ((aiExt.biller?.ar || aiExt.biller || '') + ' ' + (aiExt.merchant?.ar || aiExt.merchant || '')).toLowerCase();
    const looksLikeBill = aiExt.mode === 'bill' || Boolean(aiExt.biller && !aiExt.merchant) || /(sonelgaz|سونلغاز|كهرباء|غاز|seaal|سيال|ماء|تأمين|saa|alliance|ciar|idoom|إيدوم|اتصالات|كراء|قسط|فاتورة|facture)/.test(combinedTitle);
    mode = looksLikeBill ? 'bill' : (aiExt.mode === 'receipt' ? 'receipt' : mode);
    M.scan.mode = mode;
  }
  const samp = M.BILL_SAMPLES[M.scan.billIdx || 0];

  const rMerchant = aiExt?.merchant ? M.L(aiExt.merchant) : (ar ? 'سوبرماركت · Supermarché' : 'Supermarché');
  const rAmount = (aiExt?.amount && Number(aiExt.amount) > 0) ? Number(aiExt.amount) : 3450;
  const rCat = (aiExt?.cat && M.CATS[aiExt.cat]) ? aiExt.cat : 'groceries';
  const curMemberId = aiExt?.member && M.MEMBERS.some(m => m.id === aiExt.member)
    ? aiExt.member
    : (M.s.currentMemberId || M.MEMBERS[0]?.id || 'abu');

  const bBiller = aiExt?.biller ? M.L(aiExt.biller) : M.L(samp.biller);
  const bKind = aiExt?.kind || samp.kind || 'var';
  const bAmount = (aiExt?.amount && Number(aiExt.amount) > 0) ? Number(aiExt.amount) : samp.amount;
  const bDueDay = aiExt?.dueDay || samp.dueDay || 18;
  const bDueText = aiExt?.dueText ? M.L(aiExt.dueText) : M.L(samp.dueText);
  const bIsCurrent = aiExt?.isCurrentMonth !== undefined ? Boolean(aiExt.isCurrentMonth) : samp.isCurrentMonth;
  const bCycleDays = Number(aiExt?.cycleDays) || (M.inferBillCycleDays ? M.inferBillCycleDays({ n: { ar: bBiller, en: bBiller } }) : 30);
  const bCountdown = M.getBillCountdown
    ? M.getBillCountdown({ n: { ar: bBiller, en: bBiller }, due: bDueDay, cycleDays: bCycleDays, paid: false })
    : { daysLeft: 10, cycleDays: bCycleDays, cycleLabel: '', nextBillDate: { ar: 'الشهر القادم', en: 'Next month' }, nextCycleDaysFromToday: 40 };

  const dup = mode === 'receipt'
    ? (rAmount > 0 && (M.s.purchases || []).some(p => M.normItemKey(p.merchant) === M.normItemKey(rMerchant) && Number(p.amount) === Number(rAmount) && p.day === M.s.day))
    : false;

  const detectedHikes = M.findPriceHikesForEntry({
    merchant: rMerchant,
    biller: bBiller,
    amount: mode === 'receipt' ? rAmount : bAmount,
    items: aiExt?.items || [],
    detectedHikes: aiExt?.detectedHikes || []
  });

  const fields = mode === 'receipt'
    ? [
        [M.t('merchant'), rMerchant],
        [M.t('amount'), M.fmt(rAmount) + ' ' + M.t('cur')],
        [M.t('category'), M.L(M.CATS[rCat].n)],
        [M.t('member'), M.L(M.member(curMemberId).n)],
        [M.t('autoDest'), M.t('segFeed')]
      ]
    : [
        [M.t('biller'), bBiller],
        [M.t('billType'), M.t(bKind === 'var' ? 'billVar' : 'billFixed')],
        [M.t('amount'), M.fmt(bAmount) + ' ' + M.t('cur')],
        [M.t('dueDate'), `${bDueText} (⏳ ${ar ? `باقي ${bCountdown.daysLeft} يوم` : `${bCountdown.daysLeft}d left`})`],
        [ar ? 'الفاتورة القادمة المتوقعة بعدها' : 'Next Bill After This', `${bCountdown.nextBillDate[ar ? 'ar' : 'en']} (${bCountdown.cycleLabel})`]
      ];

  let alerts = '';
  if (mode === 'bill') {
    alerts += `<div class="ai-pill" style="margin-bottom:8px">
      <span class="spark">${M.ico('spark', 16, 2)}</span>
      <div style="flex:1;min-width:0">
        <b>${ar ? 'توقع الذكاء الاصطناعي للفاتورة القادمة وتنبيه الراتب' : 'AI Next-Bill & Payday Predictor'}</b>
        <div class="muted small" style="margin-top:2px">
          ${ar
            ? `تتكرر هذه الفاتورة <b>${bCountdown.cycleLabel}</b> · ستأتي الفاتورة التي بعد هذه يوم <b style="color:var(--primary)">${bCountdown.nextBillDate.ar}</b> (بعد ${bCountdown.nextCycleDaysFromToday} يوم)، وسينبهك التطبيق تلقائياً عند نزول راتبك لحجز مبلغها.`
            : `Repeats <b>${bCountdown.cycleLabel}</b> · The next bill after this arrives on <b style="color:var(--primary)">${bCountdown.nextBillDate.en}</b> (in ${bCountdown.nextCycleDaysFromToday}d) with automatic payday alerts.`}
        </div>
      </div>
    </div>`;
  }
  if (detectedHikes.length > 0) {
    const h = detectedHikes[0];
    alerts += `<div class="alert-box" style="--bc:var(--crit);margin-bottom:8px">
      <span class="ab-i">${M.ico('trend', 20)}</span>
      <div><b>${ar ? 'تنبيه الذكاء الاصطناعي · ارتفاع في السعر!' : 'AI Price-Hike Alert!'}</b><br>
      ${ar
        ? `ارتفع سعر <b>${M.L(h.n)}</b> من ${M.fmt(h.was)} إلى ${M.fmt(h.now)} ${M.t('cur')} (+${h.pct}%) مقارنة بآخر مرة.`
        : `<b>${M.L(h.n)}</b> increased from ${M.fmt(h.was)} to ${M.fmt(h.now)} ${M.t('cur')} (+${h.pct}%).`}</div>
    </div>`;
  }
  if (dup) {
    alerts += `<div class="alert-box" style="--bc:var(--crit);margin-bottom:8px"><span class="ab-i">${M.ico('copy', 20)}</span><div>${M.t('dupWarn')}</div></div>`;
  }

  const typeToggleHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px">
      <div class="kind-pick" style="flex:1;margin:0">
        <button type="button" class="kp-btn ${mode === 'receipt' ? 'on' : ''}" data-act="scan-switch-detected" data-m="receipt">${M.ico('cart', 13, 2)} <span>${ar ? 'إيصال مشتريات' : 'Purchase Receipt'}</span></button>
        <button type="button" class="kp-btn ${mode === 'bill' ? 'on' : ''}" data-act="scan-switch-detected" data-m="bill">${M.ico('receipt', 13, 2)} <span>${ar ? 'فاتورة / التزام' : 'Bill / Obligation'}</span></button>
      </div>
      <button type="button" class="paid-btn" data-act="scan-toggle-edit" style="height:36px;padding:0 11px;font-size:11.5px;flex:none">
        ${M.ico('pen', 13)} <span style="margin-inline-start:4px">${ar ? 'تعديل' : 'Edit'}</span>
      </button>
    </div>`;

  const editableHtml = mode === 'receipt' ? `
    <div id="scanEditBox" style="margin-top:4px">
      ${typeToggleHtml}
      <div class="manual-form" id="scanEditFields" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid var(--line)">
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
      </div>
    </div>` : `
    <div id="scanEditBox" style="margin-top:4px">
      ${typeToggleHtml}
      <div class="manual-form" id="scanEditFields" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid var(--line)">
        <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:8px">
          <label>${M.t('biller')}<input id="scEditBiller" value="${bBiller}" autocomplete="off"></label>
          <label>${M.t('amount')} (${M.t('cur')})<input id="scEditAmount" type="text" inputmode="decimal" value="${bAmount}" placeholder="0"></label>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          <label>${M.t('billType')}
            <select id="scEditKind">
              <option value="var" ${bKind === 'var' ? 'selected' : ''}>${M.t('billVar')}</option>
              <option value="fixed" ${bKind === 'fixed' ? 'selected' : ''}>${M.t('billFixed')}</option>
            </select>
          </label>
          <label>${ar ? 'يوم الاستحقاق' : 'Due Day'}
            <input id="scEditDueDay" type="text" inputmode="numeric" value="${bDueDay}">
          </label>
          <label>${ar ? 'دورة التكرار' : 'Cycle'}
            <select id="scEditCycle">
              <option value="30" ${bCycleDays === 30 ? 'selected' : ''}>${ar ? 'كل شهر (30ي)' : 'Monthly'}</option>
              <option value="60" ${bCycleDays === 60 ? 'selected' : ''}>${ar ? 'كل شهرين (60ي)' : 'Bi-Monthly'}</option>
              <option value="90" ${bCycleDays === 90 ? 'selected' : ''}>${ar ? 'كل 3 أشهر' : 'Quarterly'}</option>
              <option value="365" ${bCycleDays === 365 ? 'selected' : ''}>${ar ? 'سنوي (365ي)' : 'Annual'}</option>
            </select>
          </label>
        </div>
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

M.acts['scan-toggle-edit'] = () => {
  const box = document.getElementById('scanEditFields');
  if (!box) return;
  box.style.display = box.style.display === 'none' ? 'flex' : 'none';
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
  const editedCycle = Number(document.getElementById('scEditCycle')?.value) || Number(aiExt?.cycleDays) || 30;

  M.scan.customImage = null;
  M.scan.aiExtracted = null;
  el.closest('.sh-body').innerHTML = `<div class="empty">${M.successCheck()}<h4>${M.t(mode === 'receipt' ? 'addedR' : 'addedB')}</h4></div>`;

  const rAmount = editedAmount > 0 ? editedAmount : (aiExt?.amount ? Number(aiExt.amount) : 3450);
  const rMerchant = editedMerchant
    ? { ar: editedMerchant, en: editedMerchant }
    : (aiExt?.merchant || { ar: 'سوبرماركت · Supermarché', en: 'Supermarché' });
  const rCat = editedCat || ((aiExt?.cat && M.CATS[aiExt.cat]) ? aiExt.cat : 'groceries');
  const rMember = editedMember || aiExt?.member || M.s.currentMemberId || 'abu';

  if (mode === 'receipt') {
    const id = Date.now();
    const defaultItems = isRealPhoto
      ? [{ n: rMerchant, q: 1, p: rAmount }]
      : [['حليب 1 لتر', 'Milk 1L', 4, 90], ['بيض 30', 'Eggs 30', 1, 560], ['سميد 10 كغ', 'Semolina 10kg', 1, 1400], ['دجاج 1 كغ', 'Chicken 1kg', 1, 480], ['خضر', 'Vegetables', 1, 340], ['باقيت', 'Baguette', 6, 15], ['جبن', 'Cheese', 1, 220]].map(([a, e, q, p]) => ({ n: { ar: a, en: e }, q, p }));
    const itemsList = (Array.isArray(aiExt?.items) && aiExt.items.length) ? aiExt.items : defaultItems;

    const hikesFound = M.findPriceHikesForEntry({
      merchant: rMerchant,
      amount: rAmount,
      items: itemsList,
      detectedHikes: aiExt?.detectedHikes || []
    });
    M.recordDetectedHikes(hikesFound);

    const newP = {
      id,
      member: rMember,
      merchant: rMerchant,
      cat: rCat,
      amount: rAmount,
      day: M.s.day,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      scanned: true,
      items: itemsList
    };
    M.s.purchases.unshift(newP);
    if (rCat === 'car' && M.s.car) {
      M.s.car.fuelUsed = (Number(M.s.car.fuelUsed) || 0) + rAmount;
    }
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
    const targetId = isRealPhoto ? ('b_' + Date.now()) : (aiExt?.targetId || samp.targetId);
    const bAmount = editedAmount > 0 ? editedAmount : (aiExt?.amount ? Number(aiExt.amount) : samp.amount);
    const bBiller = editedBiller
      ? { ar: editedBiller, en: editedBiller }
      : (aiExt?.biller || samp.biller);
    const bKind = editedKind || aiExt?.kind || samp.kind;

    const hikesFound = M.findPriceHikesForEntry({
      biller: bBiller,
      amount: bAmount,
      detectedHikes: aiExt?.detectedHikes || []
    });
    M.recordDetectedHikes(hikesFound);

    if (isCur) {
      const existing = M.s.bills.find(b => b.id === targetId || M.normItemKey(b.n) === M.normItemKey(bBiller));
      if (existing) {
        if (bAmount > existing.amount && existing.amount > 0) {
          M.recordDetectedHikes([{ n: bBiller, was: existing.amount, now: bAmount }]);
        }
        existing.prevAmount = existing.amount;
        existing.amount = bAmount;
        existing.n = bBiller;
        existing.kind = bKind;
        existing.cycleDays = editedCycle;
        existing.paid = false;
        existing.scanned = true;
        M.freshBillId = existing.id;
        if (M.api && isRealPhoto) M.api.updateBill(existing.id, existing).catch(() => {});
      } else {
        const nid = targetId || ('b_' + Date.now());
        const nb = { id: nid, n: bBiller, cat: aiExt?.cat || samp.cat || 'utilities', amount: bAmount, due: editedDueDay || aiExt?.dueDay || samp.dueDay || 18, paid: false, kind: bKind, cycleDays: editedCycle, scanned: true };
        M.s.bills.unshift(nb);
        M.freshBillId = nid;
        if (M.api && isRealPhoto) M.api.saveBill(nb).catch(() => {});
      }
    } else {
      const schedId = isRealPhoto ? ('b_sched_' + Date.now()) : 'ins2';
      const sched = {
        id: schedId, n: bBiller || { ar: 'تأمين أكسنت · SAA', en: 'Accent insurance · SAA' }, cat: 'car', amount: bAmount || 19800, kind: 'fixed', cycleDays: editedCycle || 365,
        dueStr: { ar: 'يستحق 8 ديسمبر', en: 'Due Dec 8' }, remStr: { ar: 'تذكير 1 ديسمبر', en: 'Reminder Dec 1' }, isScheduled: true
      };
      const existingIdx = M.s.scheduled.findIndex(b => b.id === schedId);
      if (existingIdx >= 0) M.s.scheduled[existingIdx] = sched;
      else M.s.scheduled.push(sched);
      M.freshBillId = schedId;
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
  if (M.scan.busy) return;
  const photo = await M.capturePhoto('camera');
  if (photo) M.runScan(photo);
};
M.acts['scan-gallery'] = async () => {
  if (M.scan.busy) return;
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
    <label>${M.t('name')}<input name="n" required placeholder="${ar ? 'مثال: فاتورة الكهرباء / تأمين السيارة / الإنترنت' : 'e.g. Electricity bill / Car insurance / Internet'}" value="" autocomplete="off"></label>
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
    <label>${ar ? 'دورة تكرار الفاتورة (لتشغيل العداد وتوقع الفاتورة القادمة)' : 'Billing Cycle (For Countdown & Next-Bill Prediction)'}
      <select name="cycleDays">
        <option value="30">${ar ? 'كل شهر (30 يوم)' : 'Monthly (30 days)'}</option>
        <option value="60">${ar ? 'كل شهرين · سونلغاز/سيال (60 يوم)' : 'Bi-Monthly · Sonelgaz/SEAAL (60 days)'}</option>
        <option value="90">${ar ? 'كل 3 أشهر (90 يوم)' : 'Quarterly (90 days)'}</option>
        <option value="180">${ar ? 'كل 6 أشهر (180 يوم)' : 'Semi-Annual (180 days)'}</option>
        <option value="365">${ar ? 'سنوي · تأمين/مراقبة (365 يوم)' : 'Annual · Insurance/Inspection (365 days)'}</option>
      </select>
    </label>
    <button class="btn" type="submit">${M.ico('check', 18, 2.5)} ${M.t('save')}</button></form>`);
};
M.saveManual = f => {
  const n = f.n.value.trim();
  const rawA = typeof f.a.value === 'string' ? M.toWesternDigits(f.a.value) : f.a.value;
  const a = +rawA, kind = f.kind?.value || 'fixed', d = new Date(f.d.value + 'T00:00');
  const cycleDays = parseInt(f.cycleDays?.value || '30', 10) || (M.inferBillCycleDays ? M.inferBillCycleDays({ n: { ar: n, en: n } }) : 30);
  if (!n || !(a > 0)) return;
  const nid = 'm' + Date.now();
  let billPayload;
  const now = new Date();
  if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
    billPayload = { id: nid, n: { ar: n, en: n }, cat: 'utilities', amount: a, due: d.getDate(), paid: false, kind, cycleDays, isScheduled: false };
    M.s.bills.push(billPayload);
  } else {
    const dsAr = d.toLocaleDateString('ar-SA-u-nu-latn-ca-gregory', { month: 'short', day: 'numeric' });
    const dsEn = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    billPayload = { id: nid, n: { ar: n, en: n }, cat: 'utilities', amount: a, kind, cycleDays, dueStr: { ar: 'يستحق ' + dsAr, en: 'Due ' + dsEn }, remStr: { ar: 'تذكير بداية الشهر', en: 'Start-of-month reminder' }, isScheduled: true };
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

M.acts['scan-switch-detected'] = el => {
  const nextM = el.dataset.m || 'receipt';
  M.scan.mode = nextM;
  if (M.scan.aiExtracted) M.scan.aiExtracted.mode = nextM;
  M.scanResult(nextM, M.scan.customImage);
};
