/* Masrofi — Offline-First API Client + Internal System Supabase Realtime + Shared Family AI */
window.M = window.M || {};

M.api = {
  storageKey: 'masrofi_cached_state_v3',
  queueKey: 'masrofi_sync_queue_v3',
  _memStore: {},
  _sse: null,
  _supaWs: null,
  _supaHb: null,
  _bc: null,
  _clientId: 'c_' + Math.random().toString(36).slice(2, 10),
  realtimeConnected: false,

  _fetchTimeout(url, opts = {}, ms = 4500) {
    if (typeof AbortController === 'undefined') return fetch(url, opts);
    const ctl = new AbortController();
    const tid = setTimeout(() => ctl.abort(), ms);
    return fetch(url, { ...opts, signal: ctl.signal }).finally(() => clearTimeout(tid));
  },

  _getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return this._memStore[key] || null;
    }
  },

  _setItem(key, val) {
    this._memStore[key] = val;
    try {
      localStorage.setItem(key, val);
    } catch {}
  },

  _decodeKey(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (trimmed.startsWith('b64:')) {
      try { return atob(trimmed.slice(4)).trim(); } catch { return ''; }
    }
    return trimmed;
  },

  getIntegrations() {
    const sys = window.M?.CONFIG || {};
    const storedAiKey = this._getItem('masrofi_shared_ai_key') || M.s?.aiApiKey || '';
    const rawAiKey = sys.AI_API_KEY || window.MASROFI_AI_KEY || storedAiKey || '';
    return {
      supabaseUrl: (sys.SUPABASE_URL || window.MASROFI_SUPABASE_URL || '').trim().replace(/\/+$/, ''),
      supabaseAnonKey: (sys.SUPABASE_ANON_KEY || window.MASROFI_SUPABASE_ANON_KEY || '').trim(),
      aiProvider: (sys.AI_PROVIDER || window.MASROFI_AI_PROVIDER || 'gemini').trim().toLowerCase(),
      aiApiKey: this._decodeKey(rawAiKey),
      aiModel: (sys.AI_MODEL || 'gemini-2.5-flash').trim()
    };
  },

  async saveSharedAiKey(aiApiKey, aiProvider = 'gemini') {
    const clean = (aiApiKey || '').trim();
    if (!clean) return;
    this._setItem('masrofi_shared_ai_key', clean);
    if (window.M) {
      M.CONFIG = M.CONFIG || {};
      M.CONFIG.AI_API_KEY = clean;
      if (M.s) M.s.aiApiKey = clean;
    }
    const { supabaseUrl, supabaseAnonKey } = this.getIntegrations();
    if (supabaseUrl && supabaseAnonKey) {
      try {
        await this._fetchTimeout(`${supabaseUrl}/rest/v1/config?on_conflict=key`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            Prefer: 'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify([{ key: 'ai_config', val: { aiApiKey: clean, aiProvider } }])
        });
      } catch {}
    }
    if (!this.isNativeStandalone()) {
      this.request('POST', '/api/integrations', { aiApiKey: clean, aiProvider }, { skipQueue: true }).catch(() => {});
    }
  },

  async syncSystemConfigFromServer() {
    if (this.isNativeStandalone()) return;
    try {
      const serverCfg = await this.request('GET', '/api/integrations', null, { skipQueue: true });
      if (serverCfg && window.M) {
        M.CONFIG = M.CONFIG || {};
        if (serverCfg.supabaseUrl && !M.CONFIG.SUPABASE_URL) M.CONFIG.SUPABASE_URL = serverCfg.supabaseUrl;
        if (serverCfg.supabaseAnonKey && !M.CONFIG.SUPABASE_ANON_KEY) M.CONFIG.SUPABASE_ANON_KEY = serverCfg.supabaseAnonKey;
        if (serverCfg.aiProvider) M.CONFIG.AI_PROVIDER = serverCfg.aiProvider;
        if (serverCfg.aiModel) M.CONFIG.AI_MODEL = serverCfg.aiModel;
        if (serverCfg.aiApiKey && !M.CONFIG.AI_API_KEY) {
          M.CONFIG.AI_API_KEY = serverCfg.aiApiKey;
          this._setItem('masrofi_shared_ai_key', serverCfg.aiApiKey);
        }
      }
    } catch {}
  },

  get baseUrl() {
    if (typeof window === 'undefined') return 'http://localhost:3000';
    const custom = window.MASROFI_API_URL || this._getItem('masrofi_api_url');
    if (custom) return custom.replace(/\/+$/, '');

    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      return '';
    }
    return 'http://localhost:3000';
  },

  isNativeStandalone() {
    if (typeof window === 'undefined') return false;
    const custom = window.MASROFI_API_URL || this._getItem('masrofi_api_url');
    if (custom) return false;
    const isCapNative = Boolean(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
    const isNonHttp = !window.location.protocol.startsWith('http');
    return isCapNative || isNonHttp;
  },

  isOnline() {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },

  /* ── Clear Demo Rows in Supabase & Initialize Real Family Wallet ── */
  async resetSupabaseToCleanFamily(st) {
    const { supabaseUrl, supabaseAnonKey } = this.getIntegrations();
    if (!supabaseUrl || !supabaseAnonKey || !st) return false;
    const headers = {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Prefer: 'return=minimal'
    };
    try {
      await Promise.all([
        this._fetchTimeout(`${supabaseUrl}/rest/v1/purchases?id=gt.0`, { method: 'DELETE', headers }),
        this._fetchTimeout(`${supabaseUrl}/rest/v1/bills?id=neq.__none__`, { method: 'DELETE', headers }),
        this._fetchTimeout(`${supabaseUrl}/rest/v1/cart?id=gt.0`, { method: 'DELETE', headers }),
        this._fetchTimeout(`${supabaseUrl}/rest/v1/car_items?id=neq.__none__`, { method: 'DELETE', headers })
      ]);
      await this.pushStateToSupabaseDirect(st);
      return true;
    } catch {
      return false;
    }
  },

  /* ── Direct Client-to-Supabase REST & Realtime Sync (Works across all family devices) ── */
  async pullStateFromSupabaseDirect(forcePull = false) {
    const { supabaseUrl, supabaseAnonKey } = this.getIntegrations();
    if (!supabaseUrl || !supabaseAnonKey) return null;
    const headers = {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Accept: 'application/json'
    };
    try {
      const [cfgRes, purchRes, billsRes, cartRes, carRes] = await Promise.all([
        this._fetchTimeout(`${supabaseUrl}/rest/v1/config?select=*`, { headers }),
        this._fetchTimeout(`${supabaseUrl}/rest/v1/purchases?select=*&order=created_at.desc,id.desc`, { headers }),
        this._fetchTimeout(`${supabaseUrl}/rest/v1/bills?select=*`, { headers }),
        this._fetchTimeout(`${supabaseUrl}/rest/v1/cart?select=*&order=created_at.desc,id.desc`, { headers }),
        this._fetchTimeout(`${supabaseUrl}/rest/v1/car_items?select=*&order=sort_order.asc,days.asc`, { headers })
      ]);
      if (!cfgRes.ok) return null;
      const cfgRows = await cfgRes.json();
      if (!Array.isArray(cfgRows) || !cfgRows.length) {
        return null;
      }
      const cfgMap = {};
      for (const r of cfgRows) cfgMap[r.key] = r.val;

      if (cfgMap.ai_config && cfgMap.ai_config.aiApiKey) {
        const sharedKey = this._decodeKey(cfgMap.ai_config.aiApiKey);
        if (sharedKey) {
          this._setItem('masrofi_shared_ai_key', sharedKey);
          if (window.M) {
            M.CONFIG = M.CONFIG || {};
            if (!M.CONFIG.AI_API_KEY) M.CONFIG.AI_API_KEY = sharedKey;
          }
        }
      }

      const isTestEnv = typeof window !== 'undefined' && (window.__MASROFI_TEST_MODE__ || window.location.port === '3088' || window.location.port === '3099');
      if (!cfgMap.onboarded && !forcePull && !isTestEnv) {
        return null;
      }

      const purchRows = purchRes.ok ? await purchRes.json() : [];
      const billRows = billsRes.ok ? await billsRes.json() : [];
      const cartRows = cartRes.ok ? await cartRes.json() : [];
      const carItemRows = carRes.ok ? await carRes.json() : [];

      const bills = [];
      const scheduled = [];
      for (const r of billRows) {
        const b = {
          id: r.id,
          n: { ar: r.name_ar, en: r.name_en || r.name_ar },
          cat: r.cat,
          amount: Number(r.amount),
          prevAmount: r.prev_amount !== null ? Number(r.prev_amount) : null,
          due: r.due !== null ? Number(r.due) : null,
          paid: Boolean(r.paid),
          paidDay: r.paid_day !== null ? Number(r.paid_day) : null,
          kind: r.kind || 'fixed',
          scanned: Boolean(r.scanned)
        };
        if (r.is_scheduled) {
          b.dueStr = { ar: r.due_str_ar, en: r.due_str_en };
          b.remStr = { ar: r.rem_str_ar, en: r.rem_str_en };
          scheduled.push(b);
        } else {
          bills.push(b);
        }
      }

      return {
        onboarded: Boolean(cfgMap.onboarded),
        familyCode: cfgMap.familyCode || M.s?.familyCode || 'MSR-2026',
        familyName: cfgMap.familyName || M.s?.familyName || { ar: 'محفظة العائلة', en: 'Family Wallet' },
        members: Array.isArray(cfgMap.members) && cfgMap.members.length ? cfgMap.members : (M.s?.members || M.DEFAULT_MEMBERS),
        payday: Number(cfgMap.payday ?? M.s?.payday ?? 1),
        salary: Number(cfgMap.salary ?? 0),
        day: Number(cfgMap.day ?? new Date().getDate() ?? 10),
        monthDays: Number(cfgMap.monthDays ?? 30),
        scanCount: Number(cfgMap.scanCount ?? 0),
        bannerHidden: Boolean(cfgMap.bannerHidden),
        car: (() => {
          const c = Object.assign({ n: { ar: 'سيارة العائلة', en: 'Family Car' }, plate: '', odo: 0, oilInterval: 7000, nextOil: 7000, kmDay: 45, fuelUsed: 0 }, cfgMap.car || M.s?.car || {});
          c.oilInterval = 7000;
          const odo = Math.max(0, Number(c.odo) || 0);
          if (odo < 7000 || Number(c.nextOil) === 10000 || (Number(c.nextOil) - odo) > 7000) {
            c.nextOil = odo < 7000 ? 7000 : (Math.floor(odo / 7000) * 7000 + 7000);
          }
          return c;
        })(),
        goal: cfgMap.goal || M.s?.goal,
        hikes: Array.isArray(cfgMap.hikes) ? cfgMap.hikes : (M.s?.hikes || []),
        dups: Array.isArray(cfgMap.dups) ? cfgMap.dups : (M.s?.dups || []),
        purchases: purchRows.map(r => ({
          id: Number(r.id),
          member: r.member,
          merchant: { ar: r.merchant_ar, en: r.merchant_en || r.merchant_ar },
          cat: r.cat,
          amount: Number(r.amount),
          day: Number(r.day),
          time: r.time,
          scanned: Boolean(r.scanned),
          items: Array.isArray(r.items) ? r.items : []
        })),
        bills,
        scheduled,
        cart: cartRows.map(r => ({
          id: Number(r.id),
          n: { ar: r.name_ar, en: r.name_en || r.name_ar },
          q: Number(r.q),
          p: Number(r.p),
          got: Boolean(r.got)
        })),
        carItems: carItemRows.map(r => ({
          id: r.id,
          ico: r.ico,
          c: r.c,
          n: { ar: r.name_ar, en: r.name_en || r.name_ar },
          s: { ar: r.s_ar, en: r.s_en || r.s_ar },
          days: Number(r.days),
          ai: Boolean(r.ai)
        }))
      };
    } catch {
      return null;
    }
  },

  async pushStateToSupabaseDirect(st) {
    const { supabaseUrl, supabaseAnonKey, aiApiKey, aiProvider } = this.getIntegrations();
    if (!supabaseUrl || !supabaseAnonKey || !st) return;
    const headers = {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Prefer: 'resolution=merge-duplicates,return=minimal'
    };
    try {
      const configRows = [
        { key: 'onboarded', val: Boolean(st.onboarded) },
        { key: 'familyCode', val: st.familyCode || '' },
        { key: 'familyName', val: st.familyName || { ar: 'محفظة العائلة', en: 'Family Wallet' } },
        { key: 'members', val: st.members || M.DEFAULT_MEMBERS },
        { key: 'payday', val: Number(st.payday || 1) },
        { key: 'salary', val: Number(st.salary || 0) },
        { key: 'day', val: Number(st.day || 10) },
        { key: 'monthDays', val: Number(st.monthDays || 30) },
        { key: 'scanCount', val: Number(st.scanCount || 0) },
        { key: 'bannerHidden', val: Boolean(st.bannerHidden) },
        { key: 'car', val: st.car },
        { key: 'goal', val: st.goal },
        { key: 'hikes', val: st.hikes || [] },
        { key: 'dups', val: st.dups || [] }
      ];
      if (aiApiKey) {
        configRows.push({ key: 'ai_config', val: { aiApiKey, aiProvider: aiProvider || 'gemini' } });
      }
      await this._fetchTimeout(`${supabaseUrl}/rest/v1/config?on_conflict=key`, {
        method: 'POST', headers, body: JSON.stringify(configRows)
      });

      if (Array.isArray(st.purchases) && st.purchases.length) {
        const purchRows = st.purchases.slice(0, 50).map((p, idx) => ({
          id: Number(p.id),
          member: p.member || 'abu',
          merchant_ar: p.merchant?.ar || p.merchant || 'متجر',
          merchant_en: p.merchant?.en || p.merchant?.ar || 'Store',
          cat: p.cat || 'groceries',
          amount: Number(p.amount),
          day: Number(p.day || 10),
          time: p.time || '7:00 PM',
          scanned: Boolean(p.scanned),
          items: p.items || [],
          created_at: 1000000000 + (st.purchases.length - idx) * 1000
        }));
        await this._fetchTimeout(`${supabaseUrl}/rest/v1/purchases?on_conflict=id`, {
          method: 'POST', headers, body: JSON.stringify(purchRows)
        });
      }

      const allBills = [
        ...(st.bills || []).map(b => ({ ...b, isScheduled: false })),
        ...(st.scheduled || []).map(b => ({ ...b, isScheduled: true }))
      ];
      if (allBills.length) {
        const billRows = allBills.map(b => ({
          id: String(b.id),
          name_ar: b.n?.ar || b.n || 'فاتورة',
          name_en: b.n?.en || b.n?.ar || 'Bill',
          cat: b.cat || 'utilities',
          amount: Number(b.amount),
          prev_amount: b.prevAmount ?? null,
          due: b.due ?? null,
          paid: Boolean(b.paid),
          paid_day: b.paidDay ?? null,
          kind: b.kind || 'fixed',
          scanned: Boolean(b.scanned),
          is_scheduled: Boolean(b.isScheduled),
          due_str_ar: b.dueStr?.ar || null,
          due_str_en: b.dueStr?.en || null,
          rem_str_ar: b.remStr?.ar || null,
          rem_str_en: b.remStr?.en || null
        }));
        await this._fetchTimeout(`${supabaseUrl}/rest/v1/bills?on_conflict=id`, {
          method: 'POST', headers, body: JSON.stringify(billRows)
        });
      }

      if (Array.isArray(st.cart) && st.cart.length) {
        const cartRows = st.cart.map((c, idx) => ({
          id: Number(c.id),
          name_ar: c.n?.ar || c.n || 'غرض',
          name_en: c.n?.en || c.n?.ar || 'Item',
          q: Number(c.q || 1),
          p: Number(c.p || 0),
          got: Boolean(c.got),
          created_at: 1000000000 + (st.cart.length - idx) * 1000
        }));
        await this._fetchTimeout(`${supabaseUrl}/rest/v1/cart?on_conflict=id`, {
          method: 'POST', headers, body: JSON.stringify(cartRows)
        });
      }
    } catch {}
  },

  connectSupabaseRealtime() {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;
    if (this._supaWs) {
      try { this._supaWs.close(); } catch {}
      this._supaWs = null;
    }
    if (this._supaHb) {
      clearInterval(this._supaHb);
      this._supaHb = null;
    }

    const { supabaseUrl, supabaseAnonKey } = this.getIntegrations();
    if (!supabaseUrl || !supabaseAnonKey) return;

    try {
      const wsBase = supabaseUrl.replace(/^http/i, 'ws');
      const wsUrl = `${wsBase}/realtime/v1/websocket?apikey=${encodeURIComponent(supabaseAnonKey)}&vsn=1.0.0`;
      const ws = new WebSocket(wsUrl);
      this._supaWs = ws;

      ws.onopen = () => {
        this.realtimeConnected = true;
        ws.send(JSON.stringify({
          topic: 'realtime:public',
          event: 'phx_join',
          payload: {
            config: {
              broadcast: { self: false },
              presence: { key: '' },
              postgres_changes: [{ event: '*', schema: 'public' }]
            }
          },
          ref: '1'
        }));
        this._supaHb = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(Date.now()) }));
          }
        }, 25000);
      };

      ws.onmessage = async ev => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.event === 'postgres_changes' || msg.event === 'broadcast') {
            const remote = await this.pullStateFromSupabaseDirect();
            if (remote && window.M) {
              this.applyIncomingRealtimeState(remote);
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        this.realtimeConnected = false;
      };
    } catch {}
  },

  initRealtimeSync() {
    if (typeof window === 'undefined') return;

    if (typeof BroadcastChannel !== 'undefined' && !this._bc) {
      try {
        this._bc = new BroadcastChannel('masrofi_family_realtime');
        this._bc.onmessage = ev => {
          if (ev.data && ev.data.sender !== this._clientId && ev.data.state) {
            this.applyIncomingRealtimeState(ev.data.state);
          }
        };
      } catch {}
    }

    if (!this.isNativeStandalone() && typeof EventSource !== 'undefined' && !this._sse) {
      try {
        const es = new EventSource(`${this.baseUrl}/api/events`);
        this._sse = es;
        es.onmessage = ev => {
          try {
            const data = JSON.parse(ev.data);
            if (data.event === 'connected') {
              this.realtimeConnected = true;
            } else if (data.state && Date.now() - (this._lastMutationTs || 0) > 600) {
              this.applyIncomingRealtimeState(data.state);
            }
          } catch {}
        };
      } catch {}
    }

    this.connectSupabaseRealtime();
  },

  applyIncomingRealtimeState(newState) {
    if (!newState || !window.M || !M.s) return;
    if (this._lastMutationTs && (Date.now() - this._lastMutationTs < 1500)) {
      return;
    }
    const keep = {
      os: M.s.os, theme: M.s.theme, lang: M.s.lang,
      tab: M.s.tab, billSeg: M.s.billSeg, famSeg: M.s.famSeg,
      privacy: M.s.privacy, currentMemberId: M.s.currentMemberId
    };
    Object.assign(M.s, newState, keep);
    this._setItem(this.storageKey, JSON.stringify(M.s));
    if (typeof M.render === 'function' && !M.sheet?.isOpen && !M.scan?.open) {
      M.render();
    }
  },

  async request(method, path, body = null, options = {}) {
    if (method !== 'GET') {
      this._lastMutationTs = Date.now();
    }

    if (this.isNativeStandalone()) {
      if (method !== 'GET' && !options.skipQueue) {
        this.enqueue(method, path, body);
      }
      throw new Error('Standalone local-first mode');
    }

    const url = `${this.baseUrl}${path}`;
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await this._fetchTimeout(url, opts, 6000);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} on ${method} ${path}`);
      }
      return await res.json();
    } catch (err) {
      if (method !== 'GET' && !options.skipQueue) {
        this.enqueue(method, path, body);
      }
      throw err;
    }
  },

  enqueue(method, path, body) {
    try {
      const queue = JSON.parse(this._getItem(this.queueKey) || '[]');
      queue.push({ method, path, body, ts: Date.now() });
      this._setItem(this.queueKey, JSON.stringify(queue));
    } catch {}
  },

  async flushQueue() {
    if (!this.isOnline() || this.isNativeStandalone()) return;
    try {
      const raw = this._getItem(this.queueKey);
      if (!raw) return;
      const queue = JSON.parse(raw);
      if (!queue.length) return;

      const remaining = [];
      for (const item of queue) {
        try {
          await this.request(item.method, item.path, item.body, { skipQueue: true });
        } catch {
          remaining.push(item);
        }
      }
      this._setItem(this.queueKey, JSON.stringify(remaining));
    } catch {}
  },

  saveLocal(state) {
    try {
      this._setItem(this.storageKey, JSON.stringify(state));
      if (this._bc) {
        this._bc.postMessage({ sender: this._clientId, state });
      }
      const { supabaseUrl, supabaseAnonKey } = this.getIntegrations();
      if (supabaseUrl && supabaseAnonKey && state?.onboarded) {
        this.pushStateToSupabaseDirect(state).catch(() => {});
      }
    } catch {}
  },

  loadLocal() {
    try {
      const data = this._getItem(this.storageKey);
      if (!data) return null;
      const sanitized = typeof M.toWesternDigits === 'function' ? M.toWesternDigits(data) : data;
      const parsed = JSON.parse(sanitized);
      if (parsed && parsed.car) {
        parsed.car.oilInterval = 7000;
        const odo = Math.max(0, Number(parsed.car.odo) || 0);
        if (odo < 7000 || Number(parsed.car.nextOil) === 10000) {
          parsed.car.nextOil = 7000;
        }
      }
      return parsed;
    } catch {
      return null;
    }
  },

  /* ── Direct Client-Side Free AI Vision Call + AI Price-Hike Comparison Over Time ── */
  async analyzeImageDirectAI(mode, imageDataUrl, priceHistory = []) {
    const cfg = this.getIntegrations();
    if (!cfg.aiApiKey || !imageDataUrl) return null;
    const historyCtx = Array.isArray(priceHistory) && priceHistory.length
      ? `\nPreviously recorded family item/bill prices for price-hike comparison over time: ${JSON.stringify(priceHistory)}.\nCompare the extracted item prices (or bill amount) against these historical prices. If any item/bill on the paper is more expensive than its historical lastPrice, include it in "detectedHikes": [{"n":{"ar":"اسم الصنف","en":"Item name"},"was":120,"now":150}].`
      : '';
    const sysPrompt = `You are Masrofi AI, a high-accuracy Arabic/French/English receipt and bill OCR parser and price-hike detector.
Read the exact text, numbers, store/biller name, total amount, date, and line items written on this photographed paper (${mode === 'bill' ? 'utility/service bill' : 'purchase receipt/invoice'}).${historyCtx}
Do NOT invent fake stores. Read what is actually written on the paper and return ONLY a valid JSON object:
If mode is "receipt":
{"mode":"receipt","merchant":{"ar":"اسم المتجر أو الجهة المكتوبة في الورقة","en":"Store/Issuer name from paper"},"cat":"groceries"|"car"|"utilities"|"home"|"family"|"dining"|"health"|"net","amount":1250,"day":14,"items":[{"n":{"ar":"اسم الصنف من الورقة","en":"Item name"},"q":1,"p":1250}],"detectedHikes":[{"n":{"ar":"اسم الصنف","en":"Item name"},"was":1000,"now":1250}]}
If mode is "bill":
{"mode":"bill","targetId":"custom","kind":"var"|"fixed","cat":"utilities"|"car"|"net"|"family","biller":{"ar":"اسم الجهة في الفاتورة","en":"Biller name from paper"},"amount":3200,"dueDay":18,"isCurrentMonth":true,"dueText":{"ar":"تاريخ الاستحقاق من الورقة","en":"Due date from paper"},"detectedHikes":[]}`;

    try {
      if (cfg.aiProvider === 'gemini') {
        const commaIdx = imageDataUrl.indexOf(',');
        const mimeType = imageDataUrl.slice(5, commaIdx).split(';')[0] || 'image/jpeg';
        const base64Data = imageDataUrl.slice(commaIdx + 1);
        const models = [cfg.aiModel || 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
        const seen = new Set();
        for (const model of models) {
          if (!model || seen.has(model)) continue;
          seen.add(model);
          try {
            const res = await this._fetchTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cfg.aiApiKey)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: sysPrompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }],
                generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
              })
            }, 10000);
            if (res.ok) {
              const data = await res.json();
              const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (txt) {
                const parsed = JSON.parse(txt.replace(/```json|```/gi, '').trim());
                if (parsed && (parsed.amount !== undefined || parsed.merchant || parsed.biller)) {
                  return parsed;
                }
              }
            }
          } catch {}
        }
      } else {
        const isGroq = cfg.aiProvider === 'groq';
        const endpoint = isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
        const model = cfg.aiModel || (isGroq ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'google/gemini-2.0-flash-exp:free');
        const res = await this._fetchTimeout(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.aiApiKey}` },
          body: JSON.stringify({
            model,
            temperature: 0.1,
            messages: [{ role: 'user', content: [{ type: 'text', text: sysPrompt }, { type: 'image_url', image_url: { url: imageDataUrl } }] }]
          })
        }, 10000);
        if (res.ok) {
          const data = await res.json();
          const txt = data?.choices?.[0]?.message?.content;
          if (txt) return JSON.parse(txt.replace(/```json|```/gi, '').trim());
        }
      }
    } catch {}
    return null;
  },

  /* ── High-level API calls ── */
  async fetchState() {
    const supaState = await this.pullStateFromSupabaseDirect();
    if (supaState) return supaState;
    const isTestEnv = typeof window !== 'undefined' && (window.__MASROFI_TEST_MODE__ || window.location.port === '3088' || window.location.port === '3099');
    if (!this.isNativeStandalone()) {
      const srvState = await this.request('GET', '/api/state');
      if (srvState && (srvState.onboarded || isTestEnv)) {
        return srvState;
      }
    }
    return null;
  },

  async reset() {
    return await this.request('POST', '/api/reset');
  },

  async updateConfig(fields) {
    return await this.request('PATCH', '/api/config', fields);
  },

  async updateSalary(salary) {
    return await this.request('PATCH', '/api/salary', { salary });
  },

  async addPurchase(p) {
    return await this.request('POST', '/api/purchases', p);
  },

  async deletePurchase(id) {
    const { supabaseUrl, supabaseAnonKey } = this.getIntegrations();
    if (supabaseUrl && supabaseAnonKey) {
      this._fetchTimeout(`${supabaseUrl}/rest/v1/purchases?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
      }).catch(() => {});
    }
    return await this.request('DELETE', `/api/purchases/${id}`);
  },

  async saveBill(bill) {
    return await this.request('POST', '/api/bills', bill);
  },

  async updateBill(id, fields) {
    return await this.request('PATCH', `/api/bills/${id}`, fields);
  },

  async deleteBill(id) {
    const { supabaseUrl, supabaseAnonKey } = this.getIntegrations();
    if (supabaseUrl && supabaseAnonKey) {
      this._fetchTimeout(`${supabaseUrl}/rest/v1/bills?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
      }).catch(() => {});
    }
    return await this.request('DELETE', `/api/bills/${id}`);
  },

  async addCartItem(item) {
    return await this.request('POST', '/api/cart', item);
  },

  async updateCartItem(id, fields) {
    return await this.request('PATCH', `/api/cart/${id}`, fields);
  },

  async deleteCartItem(id) {
    const { supabaseUrl, supabaseAnonKey } = this.getIntegrations();
    if (supabaseUrl && supabaseAnonKey) {
      this._fetchTimeout(`${supabaseUrl}/rest/v1/cart?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
      }).catch(() => {});
    }
    return await this.request('DELETE', `/api/cart/${id}`);
  },

  async clearGotCart() {
    const { supabaseUrl, supabaseAnonKey } = this.getIntegrations();
    if (supabaseUrl && supabaseAnonKey) {
      this._fetchTimeout(`${supabaseUrl}/rest/v1/cart?got=eq.true`, {
        method: 'DELETE',
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
      }).catch(() => {});
    }
    return await this.request('DELETE', '/api/cart/got');
  },

  async updateGoal(goal) {
    return await this.request('PATCH', '/api/goal', goal);
  },

  async updateCar(carData) {
    return await this.request('PATCH', '/api/car', carData);
  },

  async analyzeScan(payload) {
    if (payload && payload.image) {
      const directFirst = await this.analyzeImageDirectAI(payload.mode, payload.image, payload.priceHistory);
      if (directFirst) {
        return { success: true, aiUsed: true, mode: payload.mode, extracted: directFirst };
      }
    }
    try {
      const srv = await this.request('POST', '/api/scan/analyze', payload, { skipQueue: true });
      if (srv && (srv.aiUsed || !payload.image)) return srv;
    } catch {}
    return null;
  },

  async scan(payload) {
    return await this.request('POST', '/api/scan', payload);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    M.api.flushQueue();
  });
}
