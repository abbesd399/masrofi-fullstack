/* Masrofi — Offline-First API Client + Internal System Supabase Realtime + Shared Family AI */
window.M = window.M || {};

M.api = {
  storageKey: 'masrofi_cached_state_v2',
  queueKey: 'masrofi_sync_queue_v2',
  _memStore: {},
  _sse: null,
  _supaWs: null,
  _supaHb: null,
  _bc: null,
  _clientId: 'c_' + Math.random().toString(36).slice(2, 10),
  realtimeConnected: false,

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

  getIntegrations() {
    const sys = window.M?.CONFIG || {};
    return {
      supabaseUrl: (sys.SUPABASE_URL || window.MASROFI_SUPABASE_URL || '').trim().replace(/\/+$/, ''),
      supabaseAnonKey: (sys.SUPABASE_ANON_KEY || window.MASROFI_SUPABASE_ANON_KEY || '').trim(),
      aiProvider: (sys.AI_PROVIDER || window.MASROFI_AI_PROVIDER || 'gemini').trim().toLowerCase(),
      aiApiKey: (sys.AI_API_KEY || window.MASROFI_AI_KEY || '').trim(),
      aiModel: (sys.AI_MODEL || 'gemini-2.5-flash').trim()
    };
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

  /* ── Direct Client-to-Supabase REST & Realtime Sync (Works across all family devices) ── */
  async pullStateFromSupabaseDirect() {
    const { supabaseUrl, supabaseAnonKey } = this.getIntegrations();
    if (!supabaseUrl || !supabaseAnonKey) return null;
    const headers = {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Accept: 'application/json'
    };
    try {
      const [cfgRes, purchRes, billsRes, cartRes, carRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/config?select=*`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/purchases?select=*&order=created_at.desc,id.desc`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/bills?select=*`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/cart?select=*&order=created_at.desc,id.desc`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/car_items?select=*&order=sort_order.asc,days.asc`, { headers })
      ]);
      if (!cfgRes.ok) return null;
      const cfgRows = await cfgRes.json();
      if (!Array.isArray(cfgRows) || !cfgRows.length) {
        if (M.s) await this.pushStateToSupabaseDirect(M.s);
        return null;
      }
      const cfgMap = {};
      for (const r of cfgRows) cfgMap[r.key] = r.val;
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
        salary: Number(cfgMap.salary ?? 150000),
        day: Number(cfgMap.day ?? 10),
        monthDays: Number(cfgMap.monthDays ?? 30),
        scanCount: Number(cfgMap.scanCount ?? 0),
        bannerHidden: Boolean(cfgMap.bannerHidden),
        car: cfgMap.car || M.s?.car,
        goal: cfgMap.goal || M.s?.goal,
        hikes: cfgMap.hikes || M.s?.hikes,
        dups: cfgMap.dups || M.s?.dups,
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
    const { supabaseUrl, supabaseAnonKey } = this.getIntegrations();
    if (!supabaseUrl || !supabaseAnonKey || !st) return;
    const headers = {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Prefer: 'resolution=merge-duplicates,return=minimal'
    };
    try {
      const configRows = [
        { key: 'salary', val: st.salary },
        { key: 'day', val: st.day },
        { key: 'monthDays', val: st.monthDays },
        { key: 'scanCount', val: st.scanCount },
        { key: 'bannerHidden', val: st.bannerHidden },
        { key: 'car', val: st.car },
        { key: 'goal', val: st.goal },
        { key: 'hikes', val: st.hikes },
        { key: 'dups', val: st.dups }
      ];
      await fetch(`${supabaseUrl}/rest/v1/config?on_conflict=key`, {
        method: 'POST', headers, body: JSON.stringify(configRows)
      });
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

    // 1. Cross-tab / same-device instant BroadcastChannel sync
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

    // 2. Server-Sent Events (/api/events) when connected to Node backend
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

    // 3. Direct Supabase Realtime WebSocket when configured in M.CONFIG
    this.connectSupabaseRealtime();
  },

  applyIncomingRealtimeState(newState) {
    if (!newState || !window.M || !M.s) return;
    if (this._lastMutationTs && (Date.now() - this._lastMutationTs < 1500)) {
      return;
    }
    const keep = {
      os: M.s.os, theme: M.s.theme, lang: M.s.lang,
      tab: M.s.tab, billSeg: M.s.billSeg, famSeg: M.s.famSeg, privacy: M.s.privacy
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
      const res = await fetch(url, opts);
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
      if (supabaseUrl && supabaseAnonKey) {
        this.pushStateToSupabaseDirect(state).catch(() => {});
      }
    } catch {}
  },

  loadLocal() {
    try {
      const data = this._getItem(this.storageKey);
      if (!data) return null;
      const sanitized = typeof M.toWesternDigits === 'function' ? M.toWesternDigits(data) : data;
      return JSON.parse(sanitized);
    } catch {
      return null;
    }
  },

  /* ── Direct Client-Side Free AI Vision Call (when standalone mobile APK/IPA) ── */
  async analyzeImageDirectAI(mode, imageDataUrl) {
    const cfg = this.getIntegrations();
    if (!cfg.aiApiKey || !imageDataUrl) return null;
    const sysPrompt = `You are Masrofi AI, an Algerian family finance receipt and bill parser.
Extract details from this ${mode === 'bill' ? 'utility/car bill' : 'purchase receipt'} and return ONLY a valid JSON object:
If mode is "receipt":
{"mode":"receipt","merchant":{"ar":"اسم المتجر","en":"Store name"},"cat":"groceries","amount":3450,"day":10,"items":[{"n":{"ar":"صنف","en":"Item"},"q":1,"p":3450}]}
If mode is "bill":
{"mode":"bill","targetId":"elec","kind":"var","cat":"utilities","biller":{"ar":"اسم الجهة","en":"Biller"},"amount":7200,"dueDay":18,"isCurrentMonth":true,"dueText":{"ar":"18 نوفمبر 2026","en":"Nov 18, 2026"}}`;

    try {
      if (cfg.aiProvider === 'gemini') {
        const model = cfg.aiModel || 'gemini-2.5-flash';
        const commaIdx = imageDataUrl.indexOf(',');
        const mimeType = imageDataUrl.slice(5, commaIdx).split(';')[0] || 'image/jpeg';
        const base64Data = imageDataUrl.slice(commaIdx + 1);
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cfg.aiApiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: sysPrompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
          })
        });
        if (res.ok) {
          const data = await res.json();
          const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (txt) return JSON.parse(txt.replace(/```json|```/gi, '').trim());
        }
      } else {
        const isGroq = cfg.aiProvider === 'groq';
        const endpoint = isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
        const model = cfg.aiModel || (isGroq ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'google/gemini-2.0-flash-exp:free');
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.aiApiKey}` },
          body: JSON.stringify({
            model,
            temperature: 0.1,
            messages: [{ role: 'user', content: [{ type: 'text', text: sysPrompt }, { type: 'image_url', image_url: { url: imageDataUrl } }] }]
          })
        });
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
    return await this.request('GET', '/api/state');
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
    return await this.request('DELETE', `/api/purchases/${id}`);
  },

  async saveBill(bill) {
    return await this.request('POST', '/api/bills', bill);
  },

  async updateBill(id, fields) {
    return await this.request('PATCH', `/api/bills/${id}`, fields);
  },

  async deleteBill(id) {
    return await this.request('DELETE', `/api/bills/${id}`);
  },

  async addCartItem(item) {
    return await this.request('POST', '/api/cart', item);
  },

  async updateCartItem(id, fields) {
    return await this.request('PATCH', `/api/cart/${id}`, fields);
  },

  async deleteCartItem(id) {
    return await this.request('DELETE', `/api/cart/${id}`);
  },

  async clearGotCart() {
    return await this.request('DELETE', '/api/cart/got');
  },

  async updateGoal(goal) {
    return await this.request('PATCH', '/api/goal', goal);
  },

  async updateCar(carData) {
    return await this.request('PATCH', '/api/car', carData);
  },

  async analyzeScan(payload) {
    try {
      return await this.request('POST', '/api/scan/analyze', payload, { skipQueue: true });
    } catch {
      const direct = await this.analyzeImageDirectAI(payload.mode, payload.image);
      return direct ? { success: true, aiUsed: true, mode: payload.mode, extracted: direct } : null;
    }
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
