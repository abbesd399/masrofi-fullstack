/* Masrofi — Offline-First API Client & Background Sync */
window.M = window.M || {};

M.api = {
  baseUrl: (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) ? '' : 'http://localhost:3000',
  storageKey: 'masrofi_cached_state_v2',
  queueKey: 'masrofi_sync_queue_v2',

  isOnline() {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },

  async request(method, path, body = null, options = {}) {
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
      console.warn(`[Masrofi API] Request failed (${method} ${path}):`, err.message);
      // Queue offline mutation if not a GET and not skipping queue
      if (method !== 'GET' && !options.skipQueue) {
        this.enqueue(method, path, body);
      }
      throw err;
    }
  },

  enqueue(method, path, body) {
    try {
      const queue = JSON.parse(localStorage.getItem(this.queueKey) || '[]');
      queue.push({ method, path, body, ts: Date.now() });
      localStorage.setItem(this.queueKey, JSON.stringify(queue));
    } catch (e) {
      console.error('[Masrofi Sync] Failed to enqueue mutation:', e);
    }
  },

  async flushQueue() {
    if (!this.isOnline()) return;
    try {
      const raw = localStorage.getItem(this.queueKey);
      if (!raw) return;
      const queue = JSON.parse(raw);
      if (!queue.length) return;

      console.log(`[Masrofi Sync] Flushing ${queue.length} offline mutations...`);
      const remaining = [];
      for (const item of queue) {
        try {
          await this.request(item.method, item.path, item.body, { skipQueue: true });
        } catch {
          remaining.push(item);
        }
      }
      localStorage.setItem(this.queueKey, JSON.stringify(remaining));
      if (!remaining.length) {
        console.log('[Masrofi Sync] All offline mutations synchronized successfully.');
      }
    } catch (e) {
      console.error('[Masrofi Sync] Queue flush error:', e);
    }
  },

  saveLocal(state) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn('[Masrofi Cache] Failed to save state to localStorage:', e);
    }
  },

  loadLocal() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return null;
      const sanitized = typeof M.toWesternDigits === 'function' ? M.toWesternDigits(data) : data;
      return JSON.parse(sanitized);
    } catch (e) {
      console.warn('[Masrofi Cache] Failed to load cached state:', e);
      return null;
    }
  },

  /* ── High-level API calls ── */
  async fetchState() {
    return await this.request('GET', '/api/state');
  },

  async reset() {
    return await this.request('POST', '/api/reset');
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

  async scan(payload) {
    return await this.request('POST', '/api/scan', payload);
  }
};

// Listen to online events to flush any queued offline operations
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Masrofi Sync] Back online! Flushing queue...');
    M.api.flushQueue();
  });
}
