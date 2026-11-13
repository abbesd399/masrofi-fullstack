const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_PATH = path.join(DATA_DIR, 'masrofi.sqlite');

const SEED_DATA = {
  salary: 150000,
  day: 10,
  monthDays: 30,
  scanCount: 0,
  bannerHidden: false,
  car: {
    n: { ar: 'رونو سامبول 2021', en: 'Renault Symbol 2021' },
    plate: '01234 121 16',
    odo: 92400,
    nextOil: 95000,
    kmDay: 110,
    fuelBudget: 6000,
    fuelUsed: 3500
  },
  goal: { target: 300000, saved: 180000, monthly: 20000 },
  hikes: [
    { n: { ar: 'سميد 10 كغ', en: 'Semolina 10kg' }, was: 1250, now: 1400 },
    { n: { ar: 'بيض 30 حبة', en: 'Eggs ×30' }, was: 480, now: 560 },
    { n: { ar: 'زيت 5 لتر', en: 'Cooking oil 5L' }, was: 650, now: 720 }
  ],
  dups: [{ m: { ar: 'أرديس · 4,500 د.ج', en: 'Ardis · 4,500 DZD' }, d: 7 }],
  purchases: [
    {
      id: 1, member: 'umm',
      merchant: { ar: 'أونو هايبر', en: 'Uno Hypermarket' },
      cat: 'groceries', amount: 4910, day: 10, time: '6:40 PM',
      items: [
        { n: { ar: 'حليب 1 لتر', en: 'Milk 1L' }, q: 4, p: 90 },
        { n: { ar: 'سميد 10 كغ', en: 'Semolina 10kg' }, q: 1, p: 1400 },
        { n: { ar: 'دجاج', en: 'Chicken' }, q: 2, p: 480 },
        { n: { ar: 'خضر وفواكه', en: 'Fruit & veg' }, q: 1, p: 650 },
        { n: { ar: 'منظفات', en: 'Detergents' }, q: 2, p: 320 },
        { n: { ar: 'تمر دقلة نور', en: 'Deglet Nour dates' }, q: 1, p: 900 }
      ],
      scanned: true
    },
    {
      id: 2, member: 'khalid',
      merchant: { ar: 'نفطال', en: 'Naftal' },
      cat: 'car', amount: 1500, day: 10, time: '2:15 PM',
      items: [{ n: { ar: 'بنزين', en: 'Petrol' }, q: 1, p: 1500 }],
      scanned: true
    },
    {
      id: 3, member: 'abu',
      merchant: { ar: 'صيدلية الشفاء', en: 'El Chifa Pharmacy' },
      cat: 'health', amount: 1250, day: 9, time: '9:05 PM',
      items: [
        { n: { ar: 'فيتامينات', en: 'Vitamins' }, q: 1, p: 850 },
        { n: { ar: 'مسكن', en: 'Pain relief' }, q: 2, p: 200 }
      ],
      scanned: true
    },
    {
      id: 4, member: 'sara',
      merchant: { ar: 'مكتبة العالم الثالث', en: 'Tiers Monde Bookstore' },
      cat: 'family', amount: 2300, day: 9, time: '5:30 PM',
      items: [
        { n: { ar: 'أدوات مدرسية', en: 'School supplies' }, q: 1, p: 1600 },
        { n: { ar: 'رواية', en: 'Novel' }, q: 1, p: 700 }
      ],
      scanned: true
    },
    {
      id: 5, member: 'umm',
      merchant: { ar: 'أرديس', en: 'Ardis' },
      cat: 'groceries', amount: 4500, day: 7, time: '7:10 PM',
      items: [{ n: { ar: 'مقاضي الأسبوع', en: 'Weekly groceries' }, q: 1, p: 4500 }],
      scanned: true
    },
    {
      id: 6, member: 'abu',
      merchant: { ar: 'كوندور', en: 'Condor Store' },
      cat: 'home', amount: 6900, day: 6, time: '8:00 PM',
      items: [{ n: { ar: 'مكنسة كهربائية', en: 'Vacuum cleaner' }, q: 1, p: 6900 }],
      scanned: true
    },
    {
      id: 7, member: 'khalid',
      merchant: { ar: 'بيتزيريا البهجة', en: 'El Bahdja Pizzeria' },
      cat: 'dining', amount: 1600, day: 5, time: '10:20 PM',
      items: [{ n: { ar: 'وجبات عائلية', en: 'Family meals' }, q: 2, p: 800 }],
      scanned: false
    },
    {
      id: 8, member: 'umm',
      merchant: { ar: 'سوق الخضر', en: 'Local market' },
      cat: 'groceries', amount: 3800, day: 3, time: '6:00 PM',
      items: [{ n: { ar: 'خضر ولحم', en: 'Veg & meat' }, q: 1, p: 3800 }],
      scanned: true
    },
    {
      id: 9, member: 'abu',
      merchant: { ar: 'نفطال', en: 'Naftal' },
      cat: 'car', amount: 2000, day: 2, time: '7:45 AM',
      items: [{ n: { ar: 'بنزين', en: 'Petrol' }, q: 1, p: 2000 }],
      scanned: false
    },
    {
      id: 10, member: 'sara',
      merchant: { ar: 'مركز باب الزوار', en: 'Bab Ezzouar Mall' },
      cat: 'family', amount: 3600, day: 2, time: '4:30 PM',
      items: [{ n: { ar: 'ملابس', en: 'Clothes' }, q: 3, p: 1200 }],
      scanned: true
    },
    {
      id: 11, member: 'abu',
      merchant: { ar: 'إيريس', en: 'IRIS Store' },
      cat: 'home', amount: 4200, day: 1, time: '9:00 PM',
      items: [{ n: { ar: 'آلة قهوة', en: 'Coffee maker' }, q: 1, p: 4200 }],
      scanned: true
    }
  ],
  bills: [
    { id: 'ins', n: { ar: 'تأمين السيارة · SAA', en: 'Car insurance · SAA' }, cat: 'car', amount: 18500, due: 15, paid: false, kind: 'fixed', scanned: false },
    { id: 'elec', n: { ar: 'الكهرباء والغاز · سونلغاز', en: 'Power & gas · Sonelgaz' }, cat: 'utilities', amount: 6500, prevAmount: 5900, due: 18, paid: false, kind: 'var', scanned: false },
    { id: 'water', n: { ar: 'الماء · سيال', en: 'Water · SEAAL' }, cat: 'utilities', amount: 2800, prevAmount: 2650, due: 22, paid: false, kind: 'var', scanned: false },
    { id: 'inst', n: { ar: 'قسط السيارة', en: 'Car installment' }, cat: 'car', amount: 18000, due: 1, paid: true, paidDay: 1, kind: 'fixed', scanned: false },
    { id: 'net', n: { ar: 'إنترنت المنزل · Idoom', en: 'Home internet · Idoom' }, cat: 'net', amount: 2600, due: 5, paid: true, paidDay: 4, kind: 'fixed', scanned: false },
    { id: 'subs', n: { ar: 'رصيد موبيليس', en: 'Mobilis credit' }, cat: 'net', amount: 1000, prevAmount: 1000, due: 3, paid: true, paidDay: 3, kind: 'var', scanned: false }
  ],
  scheduled: [],
  carItems: [
    { id: 'ins', ico: 'shield', c: '#3B82F6', n: { ar: 'تجديد التأمين', en: 'Insurance renewal' }, s: { ar: '15 نوفمبر · 18,500 د.ج', en: 'Nov 15 · 18,500 DZD' }, days: 5, ai: false },
    { id: 'oil', ico: 'drop', c: '#F59E0B', n: { ar: 'تغيير الزيت والصيانة', en: 'Oil change & service' }, s: { ar: 'عند 95,000 كم · ~4,500 د.ج', en: 'At 95,000 km · ~4,500 DZD' }, days: 24, ai: true },
    { id: 'inst', ico: 'card', c: '#8B5CF6', n: { ar: 'قسط السيارة', en: 'Car installment' }, s: { ar: 'القسط 25 من 60 · 18,000 د.ج', en: 'Payment 25 of 60 · 18,000 DZD' }, days: 21, ai: false },
    { id: 'fahs', ico: 'checkc', c: '#10B981', n: { ar: 'المراقبة التقنية', en: 'Technical inspection' }, s: { ar: '3 فبراير 2027', en: 'Feb 3, 2027' }, days: 85, ai: false }
  ],
  cart: [
    { id: 1, n: { ar: 'حليب 1 لتر', en: 'Milk 1L' }, q: 3, p: 90, got: false },
    { id: 2, n: { ar: 'بيض 30 حبة', en: 'Eggs ×30' }, q: 1, p: 560, got: false },
    { id: 3, n: { ar: 'دجاج 1 كغ', en: 'Chicken 1kg' }, q: 2, p: 480, got: false },
    { id: 4, n: { ar: 'طماطم 1 كغ', en: 'Tomatoes 1kg' }, q: 2, p: 120, got: true },
    { id: 5, n: { ar: 'خبز (باقيت)', en: 'Baguette' }, q: 6, p: 15, got: false },
    { id: 6, n: { ar: 'منظف غسيل', en: 'Laundry detergent' }, q: 1, p: 450, got: false }
  ]
};

class MasrofiDB {
  constructor(dbPath = DB_PATH) {
    this.db = new DatabaseSync(dbPath);
    this.initTables();
    this.seedIfEmpty();
  }

  initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        val TEXT
      );

      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY,
        member TEXT NOT NULL,
        merchant_ar TEXT,
        merchant_en TEXT,
        cat TEXT NOT NULL,
        amount REAL NOT NULL,
        day INTEGER NOT NULL,
        time TEXT NOT NULL,
        scanned INTEGER DEFAULT 1,
        items TEXT,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        name_ar TEXT,
        name_en TEXT,
        cat TEXT NOT NULL,
        amount REAL NOT NULL,
        prev_amount REAL,
        due INTEGER,
        paid INTEGER DEFAULT 0,
        paid_day INTEGER,
        kind TEXT DEFAULT 'fixed',
        scanned INTEGER DEFAULT 0,
        is_scheduled INTEGER DEFAULT 0,
        due_str_ar TEXT,
        due_str_en TEXT,
        rem_str_ar TEXT,
        rem_str_en TEXT
      );

      CREATE TABLE IF NOT EXISTS cart (
        id INTEGER PRIMARY KEY,
        name_ar TEXT,
        name_en TEXT,
        q REAL NOT NULL DEFAULT 1,
        p REAL NOT NULL,
        got INTEGER DEFAULT 0,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS car_items (
        id TEXT PRIMARY KEY,
        ico TEXT,
        c TEXT,
        name_ar TEXT,
        name_en TEXT,
        s_ar TEXT,
        s_en TEXT,
        days INTEGER,
        ai INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0
      );
    `);

    try {
      this.db.exec('ALTER TABLE purchases ADD COLUMN created_at INTEGER;');
    } catch {}
    try {
      this.db.exec('ALTER TABLE cart ADD COLUMN created_at INTEGER;');
    } catch {}
  }

  seedIfEmpty() {
    const row = this.db.prepare('SELECT val FROM config WHERE key = ?').get('salary');
    if (!row) {
      this.resetToSeed();
    }
  }

  resetToSeed() {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      this.db.exec('DELETE FROM config;');
      this.db.exec('DELETE FROM purchases;');
      this.db.exec('DELETE FROM bills;');
      this.db.exec('DELETE FROM cart;');
      this.db.exec('DELETE FROM car_items;');

      const setCfg = this.db.prepare('INSERT INTO config (key, val) VALUES (?, ?)');
      setCfg.run('salary', JSON.stringify(SEED_DATA.salary));
      setCfg.run('day', JSON.stringify(SEED_DATA.day));
      setCfg.run('monthDays', JSON.stringify(SEED_DATA.monthDays));
      setCfg.run('scanCount', JSON.stringify(SEED_DATA.scanCount));
      setCfg.run('bannerHidden', JSON.stringify(SEED_DATA.bannerHidden));
      setCfg.run('car', JSON.stringify(SEED_DATA.car));
      setCfg.run('goal', JSON.stringify(SEED_DATA.goal));
      setCfg.run('hikes', JSON.stringify(SEED_DATA.hikes));
      setCfg.run('dups', JSON.stringify(SEED_DATA.dups));

      const insPurch = this.db.prepare(`
        INSERT INTO purchases (id, member, merchant_ar, merchant_en, cat, amount, day, time, scanned, items, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const totalPurch = SEED_DATA.purchases.length;
      SEED_DATA.purchases.forEach((p, idx) => {
        insPurch.run(
          p.id, p.member, p.merchant.ar, p.merchant.en,
          p.cat, p.amount, p.day, p.time, p.scanned ? 1 : 0,
          JSON.stringify(p.items || []),
          1000000000 + (totalPurch - idx) * 1000
        );
      });

      const insBill = this.db.prepare(`
        INSERT INTO bills (id, name_ar, name_en, cat, amount, prev_amount, due, paid, paid_day, kind, scanned, is_scheduled, due_str_ar, due_str_en, rem_str_ar, rem_str_en)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const b of SEED_DATA.bills) {
        insBill.run(
          b.id, b.n.ar, b.n.en, b.cat, b.amount, b.prevAmount || null,
          b.due || null, b.paid ? 1 : 0, b.paidDay || null, b.kind || 'fixed',
          b.scanned ? 1 : 0, 0, null, null, null, null
        );
      }

      const insCart = this.db.prepare(`
        INSERT INTO cart (id, name_ar, name_en, q, p, got, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const totalCart = SEED_DATA.cart.length;
      SEED_DATA.cart.forEach((it, idx) => {
        insCart.run(
          it.id, it.n.ar, it.n.en, it.q, it.p, it.got ? 1 : 0,
          1000000000 + (totalCart - idx) * 1000
        );
      });

      const insCarItem = this.db.prepare(`
        INSERT INTO car_items (id, ico, c, name_ar, name_en, s_ar, s_en, days, ai, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      SEED_DATA.carItems.forEach((ci, idx) => {
        insCarItem.run(
          ci.id, ci.ico, ci.c, ci.n.ar, ci.n.en, ci.s.ar, ci.s.en,
          ci.days, ci.ai ? 1 : 0, idx
        );
      });

      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  getConfig(key, defaultVal = null) {
    const row = this.db.prepare('SELECT val FROM config WHERE key = ?').get(key);
    return row ? JSON.parse(row.val) : defaultVal;
  }

  setConfig(key, val) {
    this.db.prepare(`
      INSERT INTO config (key, val) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET val = excluded.val
    `).run(key, JSON.stringify(val));
  }

  getState() {
    const salary = this.getConfig('salary', 150000);
    const day = this.getConfig('day', 10);
    const monthDays = this.getConfig('monthDays', 30);
    const scanCount = this.getConfig('scanCount', 0);
    const bannerHidden = this.getConfig('bannerHidden', false);
    const car = this.getConfig('car', SEED_DATA.car);
    const goal = this.getConfig('goal', SEED_DATA.goal);
    const hikes = this.getConfig('hikes', SEED_DATA.hikes);
    const dups = this.getConfig('dups', SEED_DATA.dups);

    const purchaseRows = this.db.prepare('SELECT * FROM purchases ORDER BY created_at DESC, id DESC').all();
    const purchases = purchaseRows.map(r => ({
      id: r.id,
      member: r.member,
      merchant: { ar: r.merchant_ar, en: r.merchant_en || r.merchant_ar },
      cat: r.cat,
      amount: r.amount,
      day: r.day,
      time: r.time,
      scanned: Boolean(r.scanned),
      items: r.items ? JSON.parse(r.items) : []
    }));

    const billRows = this.db.prepare('SELECT * FROM bills').all();
    const bills = [];
    const scheduled = [];
    for (const r of billRows) {
      const b = {
        id: r.id,
        n: { ar: r.name_ar, en: r.name_en || r.name_ar },
        cat: r.cat,
        amount: r.amount,
        prevAmount: r.prev_amount,
        due: r.due,
        paid: Boolean(r.paid),
        paidDay: r.paid_day,
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

    const cartRows = this.db.prepare('SELECT * FROM cart ORDER BY created_at DESC, id DESC').all();
    const cart = cartRows.map(r => ({
      id: r.id,
      n: { ar: r.name_ar, en: r.name_en || r.name_ar },
      q: r.q,
      p: r.p,
      got: Boolean(r.got)
    }));

    const carItemRows = this.db.prepare('SELECT * FROM car_items ORDER BY sort_order ASC, days ASC').all();
    const carItems = carItemRows.map(r => ({
      id: r.id,
      ico: r.ico,
      c: r.c,
      n: { ar: r.name_ar, en: r.name_en || r.name_ar },
      s: { ar: r.s_ar, en: r.s_en || r.s_ar },
      days: r.days,
      ai: Boolean(r.ai)
    }));

    return {
      salary,
      day,
      monthDays,
      scanCount,
      bannerHidden,
      car,
      goal,
      hikes,
      dups,
      purchases,
      bills,
      scheduled,
      cart,
      carItems
    };
  }

  /* Salary */
  updateSalary(salary) {
    this.setConfig('salary', Number(salary));
    return { salary: Number(salary) };
  }

  /* Purchases */
  getPurchases() {
    return this.getState().purchases;
  }

  addPurchase(p) {
    const id = p.id || Date.now();
    const member = p.member || 'abu';
    const merchant_ar = (p.merchant && (p.merchant.ar || p.merchant)) || 'متجر';
    const merchant_en = (p.merchant && (p.merchant.en || p.merchant)) || merchant_ar;
    const cat = p.cat || 'groceries';
    const amount = Number(p.amount);
    const day = p.day !== undefined ? p.day : 10;
    const time = p.time || '7:00 PM';
    const scanned = p.scanned ? 1 : 0;
    const items = JSON.stringify(p.items || [{ n: { ar: merchant_ar, en: merchant_en }, q: 1, p: amount }]);
    const created_at = p.created_at || (Date.now() > 2000000000 ? Date.now() : 2000000000 + Date.now());

    this.db.prepare(`
      INSERT INTO purchases (id, member, merchant_ar, merchant_en, cat, amount, day, time, scanned, items, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        member = excluded.member,
        merchant_ar = excluded.merchant_ar,
        merchant_en = excluded.merchant_en,
        cat = excluded.cat,
        amount = excluded.amount,
        day = excluded.day,
        time = excluded.time,
        scanned = excluded.scanned,
        items = excluded.items,
        created_at = excluded.created_at
    `).run(id, member, merchant_ar, merchant_en, cat, amount, day, time, scanned, items, created_at);

    return {
      id, member, merchant: { ar: merchant_ar, en: merchant_en }, cat, amount, day, time,
      scanned: Boolean(scanned), items: JSON.parse(items)
    };
  }

  deletePurchase(id) {
    const res = this.db.prepare('DELETE FROM purchases WHERE id = ?').run(id);
    return { success: res.changes > 0, id };
  }

  /* Bills */
  getBills() {
    const st = this.getState();
    return { bills: st.bills, scheduled: st.scheduled };
  }

  saveBill(b) {
    const id = b.id || ('b_' + Date.now());
    const name_ar = (b.n && (b.n.ar || b.n)) || 'فاتورة';
    const name_en = (b.n && (b.n.en || b.n)) || name_ar;
    const cat = b.cat || 'utilities';
    const amount = Number(b.amount);
    const prev_amount = (b.prevAmount !== undefined && b.prevAmount !== null) ? Number(b.prevAmount) : null;
    const due = (b.due !== undefined && b.due !== null) ? Number(b.due) : null;
    const paid = b.paid ? 1 : 0;
    const paid_day = (b.paidDay !== undefined && b.paidDay !== null) ? Number(b.paidDay) : null;
    const kind = b.kind || 'fixed';
    const scanned = b.scanned ? 1 : 0;
    const is_scheduled = (b.isScheduled || Boolean(b.dueStr)) ? 1 : 0;
    const due_str_ar = b.dueStr?.ar || null;
    const due_str_en = b.dueStr?.en || null;
    const rem_str_ar = b.remStr?.ar || null;
    const rem_str_en = b.remStr?.en || null;

    this.db.prepare(`
      INSERT INTO bills (id, name_ar, name_en, cat, amount, prev_amount, due, paid, paid_day, kind, scanned, is_scheduled, due_str_ar, due_str_en, rem_str_ar, rem_str_en)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name_ar = excluded.name_ar,
        name_en = excluded.name_en,
        cat = excluded.cat,
        amount = excluded.amount,
        prev_amount = COALESCE(excluded.prev_amount, bills.prev_amount),
        due = COALESCE(excluded.due, bills.due),
        paid = excluded.paid,
        paid_day = excluded.paid_day,
        kind = excluded.kind,
        scanned = excluded.scanned,
        is_scheduled = excluded.is_scheduled,
        due_str_ar = excluded.due_str_ar,
        due_str_en = excluded.due_str_en,
        rem_str_ar = excluded.rem_str_ar,
        rem_str_en = excluded.rem_str_en
    `).run(
      id, name_ar, name_en, cat, amount, prev_amount, due, paid, paid_day, kind,
      scanned, is_scheduled, due_str_ar, due_str_en, rem_str_ar, rem_str_en
    );

    return {
      id, n: { ar: name_ar, en: name_en }, cat, amount, prevAmount: prev_amount,
      due, paid: Boolean(paid), paidDay: paid_day, kind, scanned: Boolean(scanned),
      isScheduled: Boolean(is_scheduled),
      dueStr: due_str_ar ? { ar: due_str_ar, en: due_str_en } : undefined,
      remStr: rem_str_ar ? { ar: rem_str_ar, en: rem_str_en } : undefined
    };
  }

  updateBill(id, fields) {
    const existing = this.db.prepare('SELECT * FROM bills WHERE id = ?').get(id);
    if (!existing) return null;

    const amount = fields.amount !== undefined ? Number(fields.amount) : existing.amount;
    const prev_amount = fields.prevAmount !== undefined ? (fields.prevAmount === null ? null : Number(fields.prevAmount)) : existing.prev_amount;
    const due = fields.due !== undefined ? (fields.due === null ? null : Number(fields.due)) : existing.due;
    const paid = fields.paid !== undefined ? (fields.paid ? 1 : 0) : existing.paid;
    const paid_day = fields.paidDay !== undefined ? (fields.paidDay === null ? null : Number(fields.paidDay)) : existing.paid_day;
    const kind = fields.kind !== undefined ? fields.kind : existing.kind;
    const scanned = fields.scanned !== undefined ? (fields.scanned ? 1 : 0) : existing.scanned;
    const cat = fields.cat || existing.cat;
    const is_scheduled = fields.isScheduled !== undefined ? (fields.isScheduled ? 1 : 0) : existing.is_scheduled;
    const due_str_ar = fields.dueStr?.ar !== undefined ? fields.dueStr.ar : existing.due_str_ar;
    const due_str_en = fields.dueStr?.en !== undefined ? fields.dueStr.en : existing.due_str_en;
    const rem_str_ar = fields.remStr?.ar !== undefined ? fields.remStr.ar : existing.rem_str_ar;
    const rem_str_en = fields.remStr?.en !== undefined ? fields.remStr.en : existing.rem_str_en;

    let name_ar = existing.name_ar;
    let name_en = existing.name_en;
    if (fields.n) {
      name_ar = fields.n.ar || fields.n;
      name_en = fields.n.en || name_ar;
    }

    this.db.prepare(`
      UPDATE bills SET
        name_ar = ?, name_en = ?, cat = ?, amount = ?, prev_amount = ?, due = ?,
        paid = ?, paid_day = ?, kind = ?, scanned = ?, is_scheduled = ?,
        due_str_ar = ?, due_str_en = ?, rem_str_ar = ?, rem_str_en = ?
      WHERE id = ?
    `).run(
      name_ar, name_en, cat, amount, prev_amount, due, paid, paid_day, kind, scanned,
      is_scheduled, due_str_ar, due_str_en, rem_str_ar, rem_str_en, id
    );

    return {
      id, n: { ar: name_ar, en: name_en }, cat, amount,
      prevAmount: prev_amount, due, paid: Boolean(paid), paidDay: paid_day,
      kind, scanned: Boolean(scanned), isScheduled: Boolean(is_scheduled),
      dueStr: due_str_ar ? { ar: due_str_ar, en: due_str_en } : undefined,
      remStr: rem_str_ar ? { ar: rem_str_ar, en: rem_str_en } : undefined
    };
  }

  deleteBill(id) {
    const res = this.db.prepare('DELETE FROM bills WHERE id = ?').run(id);
    try {
      this.db.prepare('DELETE FROM car_items WHERE id = ?').run(id);
    } catch {}
    return { success: res.changes > 0, id };
  }

  /* Cart */
  getCart() {
    return this.getState().cart;
  }

  addCartItem(it) {
    const id = it.id || Date.now();
    const name_ar = (it.n && (it.n.ar || it.n)) || (typeof it.name === 'string' ? it.name : 'غرض');
    const name_en = (it.n && (it.n.en || it.n)) || name_ar;
    const q = Number(it.q || 1);
    const p = Number(it.p !== undefined ? it.p : it.price);
    const got = it.got ? 1 : 0;
    const created_at = it.created_at || (Date.now() > 2000000000 ? Date.now() : 2000000000 + Date.now());

    this.db.prepare(`
      INSERT INTO cart (id, name_ar, name_en, q, p, got, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name_ar = excluded.name_ar,
        name_en = excluded.name_en,
        q = excluded.q,
        p = excluded.p,
        got = excluded.got,
        created_at = excluded.created_at
    `).run(id, name_ar, name_en, q, p, got, created_at);

    return { id, n: { ar: name_ar, en: name_en }, q, p, got: Boolean(got) };
  }

  updateCartItem(id, fields) {
    const existing = this.db.prepare('SELECT * FROM cart WHERE id = ?').get(id);
    if (!existing) return null;

    let name_ar = existing.name_ar;
    let name_en = existing.name_en;
    if (fields.n) {
      name_ar = fields.n.ar || fields.n;
      name_en = fields.n.en || name_ar;
    } else if (fields.name) {
      name_ar = name_en = fields.name;
    }
    const q = fields.q !== undefined ? Number(fields.q) : existing.q;
    const p = fields.p !== undefined ? Number(fields.p) : (fields.price !== undefined ? Number(fields.price) : existing.p);
    const got = fields.got !== undefined ? (fields.got ? 1 : 0) : existing.got;

    this.db.prepare(`
      UPDATE cart SET name_ar = ?, name_en = ?, q = ?, p = ?, got = ?
      WHERE id = ?
    `).run(name_ar, name_en, q, p, got, id);

    return { id, n: { ar: name_ar, en: name_en }, q, p, got: Boolean(got) };
  }

  deleteCartItem(id) {
    const res = this.db.prepare('DELETE FROM cart WHERE id = ?').run(id);
    return { success: res.changes > 0, id };
  }

  clearGotCart() {
    const res = this.db.prepare('DELETE FROM cart WHERE got = 1').run();
    return { success: true, count: res.changes };
  }

  /* Goal */
  updateGoal(goal) {
    const current = this.getConfig('goal', SEED_DATA.goal);
    const updated = Object.assign({}, current, goal);
    this.setConfig('goal', updated);
    return updated;
  }

  /* Car & Car Items */
  updateCar(carData) {
    const carObj = carData.car || (carData.odo !== undefined || carData.plate !== undefined || carData.fuelUsed !== undefined || carData.fuelBudget !== undefined || carData.nextOil !== undefined ? carData : null);
    if (carObj) {
      const cur = this.getConfig('car', SEED_DATA.car);
      this.setConfig('car', Object.assign({}, cur, carObj));
    }
    if (carData.carItem && carData.carItem.id) {
      const ci = carData.carItem;
      const existing = this.db.prepare('SELECT * FROM car_items WHERE id = ?').get(ci.id);
      if (existing) {
        this.db.prepare(`
          UPDATE car_items SET
            ico = COALESCE(?, ico),
            c = COALESCE(?, c),
            name_ar = COALESCE(?, name_ar),
            name_en = COALESCE(?, name_en),
            s_ar = COALESCE(?, s_ar),
            s_en = COALESCE(?, s_en),
            days = COALESCE(?, days),
            ai = COALESCE(?, ai)
          WHERE id = ?
        `).run(
          ci.ico || null, ci.c || null,
          ci.n?.ar || (typeof ci.n === 'string' ? ci.n : null),
          ci.n?.en || (typeof ci.n === 'string' ? ci.n : null),
          ci.s?.ar || (typeof ci.s === 'string' ? ci.s : null),
          ci.s?.en || (typeof ci.s === 'string' ? ci.s : null),
          ci.days !== undefined ? ci.days : null,
          ci.ai !== undefined ? (ci.ai ? 1 : 0) : null,
          ci.id
        );
      }
    }
    if (Array.isArray(carData.carItems)) {
      this.db.exec('DELETE FROM car_items;');
      const ins = this.db.prepare(`
        INSERT INTO car_items (id, ico, c, name_ar, name_en, s_ar, s_en, days, ai, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      carData.carItems.forEach((ci, idx) => {
        ins.run(
          ci.id, ci.ico, ci.c, ci.n?.ar || ci.n, ci.n?.en || ci.n?.ar || ci.n,
          ci.s?.ar || ci.s, ci.s?.en || ci.s?.ar || ci.s, ci.days, ci.ai ? 1 : 0, idx
        );
      });
    }
    return { car: this.getConfig('car'), carItems: this.getState().carItems };
  }
}

module.exports = {
  MasrofiDB,
  SEED_DATA,
  dbInstance: new MasrofiDB()
};
