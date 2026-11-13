const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { dbInstance } = require('./db');
const { parseScanRequest, parseMultipartBuffer, routeAndPersist } = require('./scanner-ai');

const app = express();
const PORT = process.env.PORT || 3000;

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
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

/* ── 1. State & Reset ── */
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
    res.json({ success: true, message: 'Reset to seed data successfully', state });
  } catch (err) {
    console.error('Failed to reset:', err);
    res.status(500).json({ error: 'Failed to reset state', details: err.message });
  }
});

/* ── 2. Salary ── */
const handleSalaryUpdate = (req, res) => {
  try {
    const salary = req.body.salary !== undefined ? req.body.salary : (req.body.sal !== undefined ? req.body.sal : req.body.amount);
    if (salary === undefined || isNaN(salary) || Number(salary) <= 0) {
      return res.status(400).json({ error: 'Valid positive salary amount is required' });
    }
    const result = dbInstance.updateSalary(salary);
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
      return res.json(result);
    }
    const result = dbInstance.deleteCartItem(id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete cart item', details: err.message });
  }
});

app.delete('/api/cart', (req, res) => {
  try {
    if (req.query.got === '1' || req.query.got === 'true') {
      const result = dbInstance.clearGotCart();
      return res.json(result);
    }
    const id = req.query.id || req.body.id;
    if (id) {
      const result = dbInstance.deleteCartItem(id);
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
    res.json({ success: true, ...updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update car data', details: err.message });
  }
};
app.patch('/api/car', handleCarUpdate);
app.put('/api/car', handleCarUpdate);

/* ── 7. AI Scanner & Auto-Routing ── */
app.post('/api/scan', (req, res) => {
  try {
    const parsed = parseScanRequest(req.body);
    const persisted = routeAndPersist(dbInstance, parsed);
    const state = dbInstance.getState();
    res.json({
      success: true,
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
