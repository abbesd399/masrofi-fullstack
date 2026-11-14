const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const http = require('node:http');
const { URL } = require('node:url');

// Load .env if present
function loadDotEnv() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {}
}
loadDotEnv();

function decodeKey(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('b64:')) {
    try { return Buffer.from(trimmed.slice(4), 'base64').toString('utf8').trim(); } catch { return ''; }
  }
  return trimmed;
}

function jsonRequest(urlStr, { method = 'GET', headers = {}, body = null, timeout = 25000 } = {}) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(urlStr);
    } catch (e) {
      return reject(e);
    }
    const lib = parsed.protocol === 'https:' ? https : http;
    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      ...headers
    };

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method,
        headers: reqHeaders,
        timeout
      },
      res => {
        let raw = '';
        res.on('data', chunk => (raw += chunk));
        res.on('end', () => {
          let data = null;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch {
            data = raw;
          }
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data });
        });
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function getIntegrations(db) {
  const stored = db ? db.getConfig('integrations', {}) : {};
  const supabaseUrl = (stored.supabaseUrl || process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const supabaseAnonKey = (stored.supabaseAnonKey || process.env.SUPABASE_ANON_KEY || '').trim();
  const aiProvider = (stored.aiProvider || process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
  const rawAiKey = (stored.aiApiKey || process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || '').trim();
  const aiApiKey = decodeKey(rawAiKey);
  const aiModel = (stored.aiModel || process.env.AI_MODEL || '').trim();

  return {
    supabaseUrl,
    supabaseAnonKey,
    aiProvider,
    aiApiKey,
    aiModel,
    supabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
    aiConfigured: Boolean(aiApiKey)
  };
}

function saveIntegrations(db, input = {}) {
  const current = db.getConfig('integrations', {});
  const next = {
    supabaseUrl: input.supabaseUrl !== undefined ? String(input.supabaseUrl).trim().replace(/\/+$/, '') : (current.supabaseUrl || ''),
    supabaseAnonKey: input.supabaseAnonKey !== undefined ? String(input.supabaseAnonKey).trim() : (current.supabaseAnonKey || ''),
    aiProvider: input.aiProvider !== undefined ? String(input.aiProvider).trim().toLowerCase() : (current.aiProvider || 'gemini'),
    aiApiKey: input.aiApiKey !== undefined ? String(input.aiApiKey).trim() : (current.aiApiKey || ''),
    aiModel: input.aiModel !== undefined ? String(input.aiModel).trim() : (current.aiModel || '')
  };
  db.setConfig('integrations', next);
  return getIntegrations(db);
}

/**
 * Push current local state to Supabase PostgREST tables (non-blocking)
 */
async function syncStateToSupabase(db) {
  const cfg = getIntegrations(db);
  if (!cfg.supabaseConfigured) return { synced: false, reason: 'not_configured' };

  const headers = {
    apikey: cfg.supabaseAnonKey,
    Authorization: `Bearer ${cfg.supabaseAnonKey}`,
    Prefer: 'resolution=merge-duplicates,return=minimal'
  };

  try {
    const st = db.getState();

    // 1. Upsert config keys
    const configRows = [
      { key: 'onboarded', val: Boolean(st.onboarded) },
      { key: 'familyCode', val: st.familyCode || 'MSR-2026' },
      { key: 'familyName', val: st.familyName || { ar: 'محفظة العائلة', en: 'Family Wallet' } },
      { key: 'members', val: st.members || [] },
      { key: 'payday', val: Number(st.payday || 1) },
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
    if (cfg.aiApiKey) {
      configRows.push({ key: 'ai_config', val: { aiApiKey: cfg.aiApiKey, aiProvider: cfg.aiProvider || 'gemini' } });
    }
    await jsonRequest(`${cfg.supabaseUrl}/rest/v1/config?on_conflict=key`, {
      method: 'POST',
      headers,
      body: configRows
    });

    // 2. Upsert purchases
    if (st.purchases.length) {
      const purchRows = st.purchases.map((p, idx) => ({
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
      await jsonRequest(`${cfg.supabaseUrl}/rest/v1/purchases?on_conflict=id`, {
        method: 'POST',
        headers,
        body: purchRows
      });
    }

    // 3. Upsert bills + scheduled
    const allBills = [
      ...st.bills.map(b => ({ ...b, isScheduled: false })),
      ...st.scheduled.map(b => ({ ...b, isScheduled: true }))
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
      await jsonRequest(`${cfg.supabaseUrl}/rest/v1/bills?on_conflict=id`, {
        method: 'POST',
        headers,
        body: billRows
      });
    }

    // 4. Upsert cart
    if (st.cart.length) {
      const cartRows = st.cart.map((c, idx) => ({
        id: Number(c.id),
        name_ar: c.n?.ar || c.n || 'غرض',
        name_en: c.n?.en || c.n?.ar || 'Item',
        q: Number(c.q || 1),
        p: Number(c.p || 0),
        got: Boolean(c.got),
        created_at: 1000000000 + (st.cart.length - idx) * 1000
      }));
      await jsonRequest(`${cfg.supabaseUrl}/rest/v1/cart?on_conflict=id`, {
        method: 'POST',
        headers,
        body: cartRows
      });
    }

    // 5. Upsert car_items
    if (st.carItems && st.carItems.length) {
      const carRows = st.carItems.map((c, idx) => ({
        id: String(c.id),
        ico: c.ico || 'car',
        c: c.c || '#3B82F6',
        name_ar: c.n?.ar || c.n || 'بند',
        name_en: c.n?.en || c.n?.ar || 'Item',
        s_ar: c.s?.ar || null,
        s_en: c.s?.en || null,
        days: Number(c.days || 30),
        ai: Boolean(c.ai),
        sort_order: idx
      }));
      await jsonRequest(`${cfg.supabaseUrl}/rest/v1/car_items?on_conflict=id`, {
        method: 'POST',
        headers,
        body: carRows
      });
    }

    return { synced: true };
  } catch (err) {
    return { synced: false, error: err.message };
  }
}

module.exports = {
  jsonRequest,
  getIntegrations,
  saveIntegrations,
  syncStateToSupabase
};
