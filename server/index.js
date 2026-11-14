const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const { URL } = require('node:url');

let express = null;
let cors = null;
try {
  express = require('express');
  cors = require('cors');
} catch {
  express = null;
  cors = null;
}

/**
 * Built-in lightweight Express-compatible HTTP router used automatically when
 * `node_modules/express` has not been installed yet. Ensures `node server/index.js`
 * and `node test/api.test.js` work out-of-the-box with zero external dependencies.
 */
function createFallbackExpress() {
  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  const fn = () => {
    const stack = [];

    function compilePattern(routePath) {
      const keys = [];
      const regexStr = '^' + routePath.replace(/:([A-Za-z0-9_]+)/g, (_, k) => {
        keys.push(k);
        return '([^/]+)';
      }) + '$';
      return { regex: new RegExp(regexStr), keys };
    }

    function addRoute(method, routePath, handler) {
      const { regex, keys } = compilePattern(routePath);
      stack.push({ type: 'route', method, regex, keys, handler });
    }

    const app = {
      use(arg1, arg2) {
        if (typeof arg1 === 'string') {
          stack.push({ type: 'mw', prefix: arg1, handler: arg2 });
        } else {
          stack.push({ type: 'mw', prefix: '', handler: arg1 });
        }
      },
      get: (p, h) => addRoute('GET', p, h),
      post: (p, h) => addRoute('POST', p, h),
      patch: (p, h) => addRoute('PATCH', p, h),
      put: (p, h) => addRoute('PUT', p, h),
      delete: (p, h) => addRoute('DELETE', p, h),
      listen(port, cb) {
        const server = http.createServer((req, res) => {
          const parsedUrl = new URL(req.url || '/', 'http://127.0.0.1');
          req.path = parsedUrl.pathname;
          req.query = Object.fromEntries(parsedUrl.searchParams.entries());
          req.params = {};
          req.body = req.body || {};

          res.statusCode = 200;
          res.status = code => {
            res.statusCode = code;
            return res;
          };
          res.json = obj => {
            if (res.writableEnded) return res;
            const payload = JSON.stringify(obj);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(payload);
            return res;
          };
          res.sendFile = filePath => {
            if (res.writableEnded) return;
            try {
              const ext = path.extname(filePath).toLowerCase();
              res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
              res.end(fs.readFileSync(filePath));
            } catch {
              res.statusCode = 404;
              res.end('Not found');
            }
          };

          let idx = 0;
          const next = () => {
            if (res.writableEnded || idx >= stack.length) {
              if (!res.writableEnded) {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Not found' }));
              }
              return;
            }
            const layer = stack[idx++];
            if (layer.type === 'mw') {
              if (!layer.prefix || req.path.startsWith(layer.prefix)) {
                return layer.handler(req, res, next);
              }
              return next();
            }
            if (layer.type === 'route') {
              if (req.method !== layer.method && !(req.method === 'HEAD' && layer.method === 'GET')) {
                return next();
              }
              const m = req.path.match(layer.regex);
              if (!m) return next();
              req.params = {};
              layer.keys.forEach((k, i) => {
                req.params[k] = decodeURIComponent(m[i + 1]);
              });
              return layer.handler(req, res, next);
            }
            next();
          };
          next();
        });
        return server.listen(port, cb);
      }
    };
    return app;
  };

  fn.json = () => (req, res, next) => {
    const ctype = req.headers['content-type'] || '';
    if (ctype.includes('multipart/form-data')) return next();
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      if (chunks.length > 0) {
        const raw = Buffer.concat(chunks).toString('utf8');
        try {
          req.body = Object.assign({}, req.body, JSON.parse(raw));
        } catch {
          // leave req.body as-is
        }
      }
      next();
    });
  };

  fn.urlencoded = () => (req, res, next) => next();

  fn.static = rootDir => (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return next();
    const relPath = req.path === '/' ? '/index.html' : req.path;
    const safePath = path.normalize(path.join(rootDir, relPath));
    if (!safePath.startsWith(path.normalize(rootDir))) return next();
    if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
      return res.sendFile(safePath);
    }
    next();
  };

  return fn;
}

if (!express) {
  express = createFallbackExpress();
  cors = () => (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      return res.end();
    }
    next();
  };
}

const { dbInstance } = require('./db');
const { parseScanRequest, parseMultipartBuffer, analyzeWithFreeAI, routeAndPersist } = require('./scanner-ai');
const { getIntegrations, saveIntegrations, syncStateToSupabase } = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;

/* ── Real-Time Family Broadcast Hub (SSE + Supabase Sync) ── */
const sseClients = new Set();

function notifyFamilyRealtime(event = 'state_updated', meta = {}) {
  const state = dbInstance.getState();
  const payload = JSON.stringify({ event, meta, state, ts: Date.now() });
  for (const res of sseClients) {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(res);
    }
  }
  // Also mirror state asynchronously to Supabase if configured
  syncStateToSupabase(dbInstance).catch(() => {});
}

app.use(cors());

// Multipart/form-data middleware specifically for /api/scan uploads
app.use('/api/scan', (req, res, next) => {
  const ctype = req.headers['content-type'] || '';
  if (ctype.includes('multipart/form-data')) {
    const boundaryMatch = ctype.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) return next();
    const boundary = (boundaryMatch[1] || boundaryMatch[2]).trim();
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const parsed = parseMultipartBuffer(buffer, boundary);
        req.body = Object.assign({}, req.body, parsed);
        next();
      } catch (err) {
        console.error('Multipart parse error:', err);
        next();
      }
    });
  } else {
    next();
  }
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Request logging
app.use((req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/events') {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

/* ── 0. Real-Time SSE Stream & Cloud/AI Integrations ── */
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.write(`data: ${JSON.stringify({ event: 'connected', ts: Date.now() })}\n\n`);
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

app.get('/api/integrations', (req, res) => {
  const cfg = getIntegrations(dbInstance);
  res.json({
    supabaseUrl: cfg.supabaseUrl,
    supabaseAnonKey: cfg.supabaseAnonKey,
    aiProvider: cfg.aiProvider,
    aiModel: cfg.aiModel,
    hasAiKey: cfg.aiConfigured,
    supabaseConfigured: cfg.supabaseConfigured,
    aiConfigured: cfg.aiConfigured
  });
});

app.post('/api/integrations', async (req, res) => {
  try {
    const saved = saveIntegrations(dbInstance, req.body || {});
    let supabaseSync = { synced: false };
    if (saved.supabaseConfigured) {
      supabaseSync = await syncStateToSupabase(dbInstance);
    }
    res.json({
      success: true,
      supabaseUrl: saved.supabaseUrl,
      supabaseAnonKey: saved.supabaseAnonKey,
      aiProvider: saved.aiProvider,
      aiModel: saved.aiModel,
      supabaseConfigured: saved.supabaseConfigured,
      aiConfigured: saved.aiConfigured,
      supabaseSync
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save integrations', details: err.message });
  }
});

/* ── 1. State, Config & Reset ── */
app.get('/api/state', (req, res) => {
  try {
    const state = dbInstance.getState();
    res.json(state);
  } catch (err) {
    console.error('Failed to get state:', err);
    res.status(500).json({ error: 'Failed to retrieve state', details: err.message });
  }
});

app.post('/api/reset', (req, res) => {
  try {
    dbInstance.resetToSeed();
    const state = dbInstance.getState();
    notifyFamilyRealtime('reset');
    res.json({ success: true, message: 'Reset to seed data successfully', state });
  } catch (err) {
    console.error('Failed to reset:', err);
    res.status(500).json({ error: 'Failed to reset state', details: err.message });
  }
});

const handleConfigUpdate = (req, res) => {
  try {
    const updated = dbInstance.updateConfig(req.body || {});
    notifyFamilyRealtime('config_updated');
    res.json({ success: true, ...updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update config', details: err.message });
  }
};
app.patch('/api/config', handleConfigUpdate);
app.put('/api/config', handleConfigUpdate);

/* ── 2. Salary ── */
const handleSalaryUpdate = (req, res) => {
  try {
    const salary = req.body.salary !== undefined ? req.body.salary : (req.body.sal !== undefined ? req.body.sal : req.body.amount);
    if (salary === undefined || isNaN(salary) || Number(salary) <= 0) {
      return res.status(400).json({ error: 'Valid positive salary amount is required' });
    }
    const result = dbInstance.updateSalary(salary);
    notifyFamilyRealtime('salary_updated', { salary: result.salary });
    res.json({ success: true, salary: result.salary });
  } catch (err) {
    console.error('Failed to update salary:', err);
    res.status(500).json({ error: 'Failed to update salary', details: err.message });
  }
};
app.patch('/api/salary', handleSalaryUpdate);
app.put('/api/salary', handleSalaryUpdate);

/* ── 3. Purchases ── */
app.get('/api/purchases', (req, res) => {
  try {
    const purchases = dbInstance.getPurchases();
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get purchases', details: err.message });
  }
});

app.get('/api/purchases/:id', (req, res) => {
  try {
    const id = req.params.id;
    const purchases = dbInstance.getPurchases();
    const item = purchases.find(p => String(p.id) === String(id));
    if (!item) return res.status(404).json({ error: 'Purchase not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get purchase', details: err.message });
  }
});

app.post('/api/purchases', (req, res) => {
  try {
    const p = req.body;
    if (!p.amount || isNaN(p.amount) || Number(p.amount) <= 0) {
      return res.status(400).json({ error: 'Valid positive amount is required for purchase' });
    }
    const created = dbInstance.addPurchase(p);
    notifyFamilyRealtime('purchase_added', { record: created });
    res.status(201).json(created);
  } catch (err) {
    console.error('Failed to add purchase:', err);
    res.status(500).json({ error: 'Failed to add purchase', details: err.message });
  }
});

app.delete('/api/purchases/:id', (req, res) => {
  try {
    const id = req.params.id;
    const result = dbInstance.deletePurchase(id);
    notifyFamilyRealtime('purchase_deleted', { id });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete purchase', details: err.message });
  }
});

app.delete('/api/purchases', (req, res) => {
  try {
    const id = req.query.id || req.body.id;
    if (!id) return res.status(400).json({ error: 'Purchase ID required' });
    const result = dbInstance.deletePurchase(id);
    notifyFamilyRealtime('purchase_deleted', { id });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete purchase', details: err.message });
  }
});

/* ── 4. Bills & Scheduled ── */
app.get('/api/bills', (req, res) => {
  try {
    const data = dbInstance.getBills();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get bills', details: err.message });
  }
});

app.get('/api/bills/:id', (req, res) => {
  try {
    const id = req.params.id;
    const data = dbInstance.getBills();
    const bill = data.bills.find(b => String(b.id) === String(id)) || data.scheduled.find(b => String(b.id) === String(id));
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get bill', details: err.message });
  }
});

app.post('/api/bills', (req, res) => {
  try {
    const b = req.body;
    if (!b.amount || isNaN(b.amount) || Number(b.amount) <= 0) {
      return res.status(400).json({ error: 'Valid positive bill amount is required' });
    }
    const created = dbInstance.saveBill(b);
    notifyFamilyRealtime('bill_added', { record: created });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create bill', details: err.message });
  }
});

const handleBillUpdate = (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    if (!id) return res.status(400).json({ error: 'Bill ID required' });
    const updated = dbInstance.updateBill(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Bill not found' });
    notifyFamilyRealtime('bill_updated', { record: updated });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bill', details: err.message });
  }
};
app.patch('/api/bills/:id', handleBillUpdate);
app.put('/api/bills/:id', handleBillUpdate);
app.patch('/api/bills', handleBillUpdate);
app.put('/api/bills', handleBillUpdate);

app.delete('/api/bills/:id', (req, res) => {
  try {
    const id = req.params.id;
    const result = dbInstance.deleteBill(id);
    notifyFamilyRealtime('bill_deleted', { id });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bill', details: err.message });
  }
});

app.delete('/api/bills', (req, res) => {
  try {
    const id = req.query.id || req.body.id;
    if (!id) return res.status(400).json({ error: 'Bill ID required' });
    const result = dbInstance.deleteBill(id);
    notifyFamilyRealtime('bill_deleted', { id });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bill', details: err.message });
  }
});

/* ── 5. Grocery Cart ── */
app.get('/api/cart', (req, res) => {
  try {
    const cart = dbInstance.getCart();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get cart', details: err.message });
  }
});

app.get('/api/cart/:id', (req, res) => {
  try {
    const id = req.params.id;
    const cart = dbInstance.getCart();
    const item = cart.find(c => String(c.id) === String(id));
    if (!item) return res.status(404).json({ error: 'Cart item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get cart item', details: err.message });
  }
});

app.post('/api/cart', (req, res) => {
  try {
    const it = req.body;
    const p = Number(it.p !== undefined ? it.p : it.price);
    if (isNaN(p) || p <= 0) {
      return res.status(400).json({ error: 'Unit price (p) must be a positive number' });
    }
    const created = dbInstance.addCartItem(it);
    notifyFamilyRealtime('cart_added', { record: created });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add cart item', details: err.message });
  }
});

const handleCartUpdate = (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    if (!id) return res.status(400).json({ error: 'Cart item ID is required' });
    const updated = dbInstance.updateCartItem(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Cart item not found' });
    notifyFamilyRealtime('cart_updated', { record: updated });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update cart item', details: err.message });
  }
};
app.patch('/api/cart/:id', handleCartUpdate);
app.put('/api/cart/:id', handleCartUpdate);
app.patch('/api/cart', handleCartUpdate);
app.put('/api/cart', handleCartUpdate);

// Delete checked items specifically
app.delete('/api/cart/got', (req, res) => {
  try {
    const result = dbInstance.clearGotCart();
    notifyFamilyRealtime('cart_cleared_got');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear checked cart items', details: err.message });
  }
});

app.delete('/api/cart/:id', (req, res) => {
  try {
    const id = req.params.id;
    if (id === 'got') {
      const result = dbInstance.clearGotCart();
      notifyFamilyRealtime('cart_cleared_got');
      return res.json(result);
    }
    const result = dbInstance.deleteCartItem(id);
    notifyFamilyRealtime('cart_deleted', { id });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete cart item', details: err.message });
  }
});

app.delete('/api/cart', (req, res) => {
  try {
    if (req.query.got === '1' || req.query.got === 'true') {
      const result = dbInstance.clearGotCart();
      notifyFamilyRealtime('cart_cleared_got');
      return res.json(result);
    }
    const id = req.query.id || req.body.id;
    if (id) {
      const result = dbInstance.deleteCartItem(id);
      notifyFamilyRealtime('cart_deleted', { id });
      return res.json(result);
    }
    return res.status(400).json({ error: 'Cart item ID or got=1 required' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete from cart', details: err.message });
  }
});

/* ── 6. Savings Goal & Car ── */
const handleGoalUpdate = (req, res) => {
  try {
    const updated = dbInstance.updateGoal(req.body);
    notifyFamilyRealtime('goal_updated', { goal: updated });
    res.json({ success: true, goal: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update goal', details: err.message });
  }
};
app.patch('/api/goal', handleGoalUpdate);
app.put('/api/goal', handleGoalUpdate);

const handleCarUpdate = (req, res) => {
  try {
    const updated = dbInstance.updateCar(req.body);
    notifyFamilyRealtime('car_updated', updated);
    res.json({ success: true, ...updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update car data', details: err.message });
  }
};
app.patch('/api/car', handleCarUpdate);
app.put('/api/car', handleCarUpdate);

/* ── 7. AI Scanner Preview & Auto-Routing ── */
app.post('/api/scan/analyze', async (req, res) => {
  try {
    const aiCfg = getIntegrations(dbInstance);
    const aiResult = await analyzeWithFreeAI(req.body || {}, aiCfg);
    const mergedBody = aiResult ? Object.assign({}, req.body, aiResult) : (req.body || {});
    const parsed = parseScanRequest(mergedBody);
    res.json({
      success: true,
      aiUsed: Boolean(aiResult),
      mode: parsed.mode,
      extracted: parsed.extracted
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyze scan', details: err.message });
  }
});

app.post('/api/scan', async (req, res) => {
  try {
    const aiCfg = getIntegrations(dbInstance);
    const aiResult = await analyzeWithFreeAI(req.body || {}, aiCfg);
    const mergedBody = aiResult ? Object.assign({}, req.body, aiResult) : (req.body || {});
    const parsed = parseScanRequest(mergedBody);
    const persisted = routeAndPersist(dbInstance, parsed);
    const state = dbInstance.getState();
    notifyFamilyRealtime('scan_completed', { mode: parsed.mode, persisted });
    res.json({
      success: true,
      aiUsed: Boolean(aiResult),
      mode: parsed.mode,
      extracted: parsed.extracted,
      persisted,
      state
    });
  } catch (err) {
    console.error('Scan processing failed:', err);
    res.status(500).json({ error: 'Failed to process scan', details: err.message });
  }
});

// Serve frontend static assets from project root
const PUBLIC_DIR = path.join(__dirname, '..');
app.use(express.static(PUBLIC_DIR, {
  index: 'index.html',
  maxAge: '1h'
}));

// Fallback to index.html for SPA navigation
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Start server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Masrofi Server] Running on http://localhost:${PORT}`);
  });
}

module.exports = app;
