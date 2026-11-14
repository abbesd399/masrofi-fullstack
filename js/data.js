/* Masrofi — Dynamic Family Data Model + 7,000 km AI Oil Tracker + Smart Price-Hike Detector Over Time */
M.CATS = {
  groceries: { c: '#10B981', ico: 'cart',    n: { ar: 'مقاضي البيت', en: 'Groceries' } },
  car:       { c: '#3B82F6', ico: 'car',     n: { ar: 'السيارة والوقود', en: 'Car & Fuel' } },
  utilities: { c: '#F59E0B', ico: 'bolt',    n: { ar: 'كهرباء، غاز وماء', en: 'Power, gas & water' } },
  home:      { c: '#8B5CF6', ico: 'home',    n: { ar: 'المنزل', en: 'Home' } },
  family:    { c: '#EC4899', ico: 'heart',   n: { ar: 'العائلة', en: 'Family' } },
  dining:    { c: '#EF4444', ico: 'cup',     n: { ar: 'مطاعم', en: 'Dining' } },
  health:    { c: '#06B6D4', ico: 'pill',    n: { ar: 'صحة', en: 'Health' } },
  net:       { c: '#6366F1', ico: 'wifi',    n: { ar: 'إنترنت وهاتف', en: 'Internet & phone' } },
};

M.AVATAR_COLORS = {
  abu: '#0D9488',
  umm: '#3B82F6',
  khalid: '#8B5CF6',
  sara: '#F59E0B'
};

M.DEFAULT_MEMBERS = [
  { id: 'abu',    avatar: 'abu',    n: { ar: 'أبو خالد', en: 'Abu Khalid' }, i: { ar: 'أ', en: 'A' }, c: '#0D9488', role: { ar: 'العائلة', en: 'Family' } },
  { id: 'umm',    avatar: 'umm',    n: { ar: 'أم خالد', en: 'Umm Khalid' }, i: { ar: 'م', en: 'U' }, c: '#3B82F6', role: { ar: 'العائلة', en: 'Family' } },
  { id: 'khalid', avatar: 'khalid', n: { ar: 'خالد', en: 'Khalid' },       i: { ar: 'خ', en: 'K' }, c: '#8B5CF6', role: { ar: 'العائلة', en: 'Family' } },
  { id: 'sara',   avatar: 'sara',   n: { ar: 'سارة', en: 'Sara' },         i: { ar: 'س', en: 'S' }, c: '#F59E0B', role: { ar: 'العائلة', en: 'Family' } },
];

Object.defineProperty(M, 'MEMBERS', {
  get() {
    if (M.s && Array.isArray(M.s.members) && M.s.members.length > 0) {
      return M.s.members;
    }
    return M.DEFAULT_MEMBERS;
  }
});

M.genFamilyCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MSR-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

/* Clean state for real users (oil change every 7,000 km, no fixed fuel budget, optional savings goal starts at 0) */
M.cleanState = () => {
  const today = new Date().getDate() || 14;
  return {
    onboarded: false,
    familyCode: '',
    familyName: { ar: 'محفظة العائلة', en: 'Family Wallet' },
    currentMemberId: 'abu',
    members: [
      { id: 'abu', avatar: 'abu', n: { ar: 'حسابي', en: 'My Profile' }, i: { ar: 'ح', en: 'M' }, c: '#0D9488', role: { ar: 'العائلة', en: 'Family' } }
    ],
    salary: 0,
    payday: 1,
    day: today,
    monthDays: 30,
    purchases: [],
    bills: [],
    scheduled: [],
    car: { n: { ar: 'سيارة العائلة', en: 'Family Car' }, plate: '', odo: 0, oilInterval: 7000, lastOilOdo: 0, nextOil: 7000, kmDay: 45, fuelUsed: 0 },
    carItems: [
      { id: 'oil', ico: 'drop', c: '#F59E0B', n: { ar: 'تغيير زيت المحرك (كل 7,000 كم)', en: 'Engine oil change (every 7,000 km)' }, s: { ar: 'عند 7,000 كم · تنبيه الذكاء الاصطناعي مفعّل', en: 'At 7,000 km · AI reminder active' }, days: 30, ai: true }
    ],
    hikes: [],
    dups: [],
    cart: [],
    goal: { name: { ar: '', en: '' }, target: 0, saved: 0, monthly: 0 },
    famFilter: 'all', billFilter: 'all', scanCount: 0, bannerHidden: false, lastState: null,
  };
};

const I = (ar, en, q, p) => ({ n: { ar, en }, q, p });
const P = (id, member, mar, men, cat, amount, day, time, items, scanned = true) => ({ id, member, merchant: { ar: mar, en: men }, cat, amount, day, time, items: items || [], scanned });

/* Demo seed kept strictly for automated test suites on port 3088/3099 */
M.demoSeed = () => ({
  onboarded: true,
  familyCode: 'MSR-2026',
  familyName: { ar: 'عائلة أبو خالد', en: 'Abu Khalid Family' },
  currentMemberId: 'abu',
  members: JSON.parse(JSON.stringify(M.DEFAULT_MEMBERS)),
  salary: 150000, payday: 1, day: 10, monthDays: 30,
  purchases: [
    P(1, 'umm', 'أونو هايبر', 'Uno Hypermarket', 'groceries', 4910, 10, '6:40 PM', [I('حليب 1 لتر', 'Milk 1L', 4, 90), I('سميد 10 كغ', 'Semolina 10kg', 1, 1400), I('دجاج', 'Chicken', 2, 480), I('خضر وفواكه', 'Fruit & veg', 1, 650), I('منظفات', 'Detergents', 2, 320), I('تمر دقلة نور', 'Deglet Nour dates', 1, 900)]),
    P(2, 'khalid', 'نفطال', 'Naftal', 'car', 1500, 10, '2:15 PM', [I('بنزين', 'Petrol', 1, 1500)]),
    P(3, 'abu', 'صيدلية الشفاء', 'El Chifa Pharmacy', 'health', 1250, 9, '9:05 PM', [I('فيتامينات', 'Vitamins', 1, 850), I('مسكن', 'Pain relief', 2, 200)]),
    P(4, 'sara', 'مكتبة العالم الثالث', 'Tiers Monde Bookstore', 'family', 2300, 9, '5:30 PM', [I('أدوات مدرسية', 'School supplies', 1, 1600), I('رواية', 'Novel', 1, 700)]),
    P(5, 'umm', 'أرديس', 'Ardis', 'groceries', 4500, 7, '7:10 PM', [I('مقاضي الأسبوع', 'Weekly groceries', 1, 4500)]),
    P(6, 'abu', 'كوندور', 'Condor Store', 'home', 6900, 6, '8:00 PM', [I('مكنسة كهربائية', 'Vacuum cleaner', 1, 6900)]),
    P(7, 'khalid', 'بيتزيريا البهجة', 'El Bahdja Pizzeria', 'dining', 1600, 5, '10:20 PM', [I('وجبات عائلية', 'Family meals', 2, 800)], false),
    P(8, 'umm', 'سوق الخضر', 'Local market', 'groceries', 3800, 3, '6:00 PM', [I('خضر ولحم', 'Veg & meat' , 1, 3800)]),
    P(9, 'abu', 'نفطال', 'Naftal', 'car', 2000, 2, '7:45 AM', [I('بنزين', 'Petrol', 1, 2000)], false),
    P(10, 'sara', 'مركز باب الزوار', 'Bab Ezzouar Mall', 'family', 3600, 2, '4:30 PM', [I('ملابس', 'Clothes', 3, 1200)]),
    P(11, 'abu', 'إيريس', 'IRIS Store', 'home', 4200, 1, '9:00 PM', [I('آلة قهوة', 'Coffee maker', 1, 4200)]),
  ],
  bills: [
    { id: 'ins',   n: { ar: 'تأمين السيارة · SAA', en: 'Car insurance · SAA' }, cat: 'car', amount: 18500, due: 15, paid: false, kind: 'fixed' },
    { id: 'elec',  n: { ar: 'الكهرباء والغاز · سونلغاز', en: 'Power & gas · Sonelgaz' }, cat: 'utilities', amount: 6500, prevAmount: 5900, due: 18, paid: false, kind: 'var' },
    { id: 'water', n: { ar: 'الماء · سيال', en: 'Water · SEAAL' }, cat: 'utilities', amount: 2800, prevAmount: 2650, due: 22, paid: false, kind: 'var' },
    { id: 'inst',  n: { ar: 'قسط السيارة', en: 'Car installment' }, cat: 'car', amount: 18000, due: 1, paid: true, paidDay: 1, kind: 'fixed' },
    { id: 'net',   n: { ar: 'إنترنت المنزل · Idoom', en: 'Home internet · Idoom' }, cat: 'net', amount: 2600, due: 5, paid: true, paidDay: 4, kind: 'fixed' },
    { id: 'subs',  n: { ar: 'رصيد موبيليس', en: 'Mobilis credit' }, cat: 'net', amount: 1000, prevAmount: 1000, due: 3, paid: true, paidDay: 3, kind: 'var' },
  ],
  scheduled: [],
  car: { n: { ar: 'رونو سامبول 2021', en: 'Renault Symbol 2021' }, plate: '01234 121 16', odo: 69300, oilInterval: 7000, lastOilOdo: 63000, nextOil: 70000, kmDay: 50, fuelUsed: 3500 },
  carItems: [
    { id: 'ins',  ico: 'shield', c: '#3B82F6', n: { ar: 'تجديد التأمين', en: 'Insurance renewal' }, s: { ar: '15 نوفمبر · 18,500 د.ج', en: 'Nov 15 · 18,500 DZD' }, days: 5 },
    { id: 'oil',  ico: 'drop',   c: '#F59E0B', n: { ar: 'تغيير الزيت (كل 7,000 كم)', en: 'Oil change (every 7,000 km)' }, s: { ar: 'عند 70,000 كم · متبقي 700 كم', en: 'At 70,000 km · 700 km left' }, days: 14, ai: true },
    { id: 'inst', ico: 'card',   c: '#8B5CF6', n: { ar: 'قسط السيارة', en: 'Car installment' }, s: { ar: 'القسط 25 من 60 · 18,000 د.ج', en: 'Payment 25 of 60 · 18,000 DZD' }, days: 21 },
    { id: 'fahs', ico: 'checkc', c: '#10B981', n: { ar: 'المراقبة التقنية', en: 'Technical inspection' }, s: { ar: '3 فبراير 2027', en: 'Feb 3, 2027' }, days: 85 },
  ],
  hikes: [
    { n: { ar: 'سميد 10 كغ', en: 'Semolina 10kg' }, was: 1250, now: 1400 },
    { n: { ar: 'بيض 30 حبة', en: 'Eggs ×30' }, was: 480, now: 560 },
    { n: { ar: 'زيت 5 لتر', en: 'Cooking oil 5L' }, was: 650, now: 720 },
  ],
  dups: [{ m: { ar: 'أرديس · 4,500 د.ج', en: 'Ardis · 4,500 DZD' }, d: 7 }],
  cart: [
    { id: 1, ...I('حليب 1 لتر', 'Milk 1L', 3, 90), got: false },
    { id: 2, ...I('بيض 30 حبة', 'Eggs ×30', 1, 560), got: false },
    { id: 3, ...I('دجاج 1 كغ', 'Chicken 1kg', 2, 480), got: false },
    { id: 4, ...I('طماطم 1 كغ', 'Tomatoes 1kg', 2, 120), got: true },
    { id: 5, ...I('خبز (باقيت)', 'Baguette', 6, 15), got: false },
    { id: 6, ...I('منظف غسيل', 'Laundry detergent', 1, 450), got: false },
  ],
  goal: { name: { ar: 'رحلة الصيف للعائلة', en: 'Family summer trip' }, target: 300000, saved: 180000, monthly: 20000 },
  famFilter: 'all', billFilter: 'all', scanCount: 0, bannerHidden: false, lastState: null,
});

M.seed = () => {
  if (typeof window !== 'undefined' && (window.__MASROFI_TEST_MODE__ || window.location.port === '3088' || window.location.port === '3099')) {
    return M.demoSeed();
  }
  return M.cleanState();
};

M.SIM_PURCHASES = [
  ['umm', 'كارفور', 'Carrefour', 'groceries', [6000, 11000]],
  ['khalid', 'نفطال', 'Naftal', 'car', [1500, 3000]],
  ['sara', 'مركز باب الزوار', 'Bab Ezzouar Mall', 'family', [3500, 7000]],
  ['abu', 'كوندور', 'Condor Store', 'home', [8000, 14000]],
  ['umm', 'أونو هايبر', 'Uno Hypermarket', 'groceries', [5000, 9000]],
  ['khalid', 'مطعم الكرم', 'El Karam Restaurant', 'dining', [1200, 2400]],
];

/* ── Smart Monthly AI Car Oil (Every 7,000 km) & Bills Alert Engine ── */
M.getCarOilStatus = () => {
  const s = M.s || {};
  const car = s.car || { odo: 0, oilInterval: 7000, lastOilOdo: 0, nextOil: 7000, kmDay: 45 };
  const interval = 7000;
  car.oilInterval = 7000;
  const odo = Math.max(0, Number(car.odo) || 0);
  let nextOil = Number(car.nextOil) || 7000;
  // Always enforce the 7,000 km cycle (fix any legacy 10,000 km value from cache/Supabase)
  if (odo < 7000) {
    nextOil = 7000;
  } else if (nextOil === 10000 || nextOil <= odo || (nextOil - odo) > 7000) {
    const base = Number(car.lastOilOdo) > 0 && (odo - Number(car.lastOilOdo)) < 7000
      ? Number(car.lastOilOdo)
      : Math.floor(odo / 7000) * 7000;
    nextOil = base + 7000;
  }
  car.nextOil = nextOil;
  const toOil = Math.max(0, nextOil - odo);
  const kmDay = Math.max(1, Number(car.kmDay) || 45);
  const days = Math.max(1, Math.round(toOil / kmDay));
  const dueThisMonth = toOil <= 1500 || days <= 30;
  return { odo, interval, nextOil, toOil, kmDay, days, dueThisMonth };
};

M.syncCarOilItem = () => {
  const s = M.s;
  if (!s) return;
  const st = M.getCarOilStatus();
  if (!Array.isArray(s.carItems)) s.carItems = [];
  const oilItem = {
    id: 'oil',
    ico: 'drop',
    c: '#F59E0B',
    n: { ar: `تغيير الزيت (كل ${M.fmt ? M.fmt(st.interval) : '7,000'} كم)`, en: `Oil change (every ${M.fmt ? M.fmt(st.interval) : '7,000'} km)` },
    s: {
      ar: `عند ${M.fmt ? M.fmt(st.nextOil) : st.nextOil} كم · متبقي ${M.fmt ? M.fmt(st.toOil) : st.toOil} كم`,
      en: `At ${M.fmt ? M.fmt(st.nextOil) : st.nextOil} km · ${M.fmt ? M.fmt(st.toOil) : st.toOil} km left`
    },
    days: st.days,
    ai: true
  };
  const idx = s.carItems.findIndex(x => x.id === 'oil');
  if (idx >= 0) s.carItems[idx] = oilItem;
  else s.carItems.unshift(oilItem);
};

M.getMonthlyAIAlert = () => {
  const s = M.s || {};
  const ar = s.lang === 'ar';
  const oil = M.getCarOilStatus();
  const unpaid = (s.bills || []).filter(b => !b.paid).sort((a, b) => a.due - b.due);
  const fmt = M.fmt || (n => String(n));

  let title = ar ? 'تنبيه الذكاء الاصطناعي لهذا الشهر' : 'This Month’s AI Smart Alert';
  let body = '';
  if (oil.dueThisMonth && unpaid.length > 0) {
    body = ar
      ? `يجب تغيير زيت السيارة هذا الشهر (دورة كل ${fmt(oil.interval)} كم — متبقي ${fmt(oil.toOil)} كم فقط) + لديك ${unpaid.length} فواتير مستحقة.`
      : `Car oil change due this month (every ${fmt(oil.interval)} km — ${fmt(oil.toOil)} km left) + ${unpaid.length} unpaid bills.`;
  } else if (oil.dueThisMonth) {
    body = ar
      ? `حان موعد تغيير زيت السيارة هذا الشهر (تغيير كل ${fmt(oil.interval)} كم — متبقي ${fmt(oil.toOil)} كم عند ${fmt(oil.nextOil)} كم).`
      : `Car oil change is due this month (every ${fmt(oil.interval)} km — ${fmt(oil.toOil)} km left at ${fmt(oil.nextOil)} km).`;
  } else if (unpaid.length > 0) {
    body = ar
      ? `لديك ${unpaid.length} فواتير مستحقة هذا الشهر (أقربها يوم ${unpaid[0]?.due ?? 15}) · ومتبقي ${fmt(oil.toOil)} كم لتغيير زيت السيارة (كل ${fmt(oil.interval)} كم).`
      : `You have ${unpaid.length} bills due this month · and ${fmt(oil.toOil)} km left until your 7,000 km oil change.`;
  } else {
    body = ar
      ? `متابعة السيارة (دورة كل ${fmt(oil.interval)} كم): متبقي ${fmt(oil.toOil)} كم لتغيير الزيت القادم عند عداد ${fmt(oil.nextOil)} كم.`
      : `Car oil tracker (every ${fmt(oil.interval)} km): ${fmt(oil.toOil)} km left until next oil change at ${fmt(oil.nextOil)} km.`;
  }
  return { title, body, oil, unpaid };
};

/* ── Smart AI & Historical Price-Hike Detection Over Time ── */
M.normItemKey = str => {
  if (!str) return '';
  const s = typeof str === 'object' ? (str.ar || str.en || '') : String(str);
  return s.trim().toLowerCase().replace(/[\s\-_·.,]+/g, ' ');
};

M.getHistoricalPriceMap = (excludePurchaseId = null) => {
  const map = new Map();
  const s = M.s || {};
  const purchList = [...(s.purchases || [])].reverse();
  for (const p of purchList) {
    if (excludePurchaseId && p.id === excludePurchaseId) continue;
    if (Array.isArray(p.items) && p.items.length) {
      for (const it of p.items) {
        const unitP = Number(it.p);
        if (unitP > 0) {
          const kAr = M.normItemKey(it.n?.ar);
          const kEn = M.normItemKey(it.n?.en);
          if (kAr) map.set(kAr, { price: unitP, label: it.n });
          if (kEn) map.set(kEn, { price: unitP, label: it.n });
        }
      }
    }
    const mKey = M.normItemKey(p.merchant?.ar || p.merchant);
    if (mKey && Number(p.amount) > 0 && (!p.items || p.items.length <= 1)) {
      map.set(mKey, { price: Number(p.amount), label: p.merchant });
    }
  }
  for (const b of (s.bills || [])) {
    const bKey = M.normItemKey(b.n?.ar || b.n);
    const refAmt = Number(b.prevAmount || b.amount);
    if (bKey && refAmt > 0) {
      map.set(bKey, { price: refAmt, label: b.n });
    }
  }
  return map;
};

M.findPriceHikesForEntry = (entry = {}, excludeId = null) => {
  const hist = M.getHistoricalPriceMap(excludeId);
  const found = [];
  const checkOne = (nameObj, newPrice) => {
    const p = Number(newPrice);
    if (!(p > 0) || !nameObj) return;
    const label = typeof nameObj === 'object' ? nameObj : { ar: String(nameObj), en: String(nameObj) };
    const kAr = M.normItemKey(label.ar);
    const kEn = M.normItemKey(label.en);
    const prev = (kAr && hist.get(kAr)) || (kEn && hist.get(kEn));
    if (prev && prev.price > 0 && p > prev.price) {
      const pct = Math.round(((p - prev.price) / prev.price) * 100);
      if (pct >= 1) {
        found.push({ n: label, was: prev.price, now: p, pct, day: M.s?.day || 14 });
      }
    }
  };

  if (Array.isArray(entry.detectedHikes)) {
    for (const dh of entry.detectedHikes) {
      if (dh && Number(dh.now) > Number(dh.was) && Number(dh.was) > 0) {
        found.push({
          n: typeof dh.n === 'object' ? dh.n : { ar: String(dh.n || 'صنف'), en: String(dh.n || 'Item') },
          was: Number(dh.was),
          now: Number(dh.now),
          pct: Math.round(((Number(dh.now) - Number(dh.was)) / Number(dh.was)) * 100),
          day: M.s?.day || 14
        });
      }
    }
  }

  if (Array.isArray(entry.items) && entry.items.length) {
    for (const it of entry.items) {
      checkOne(it.n, it.p);
    }
  }
  if (entry.merchant && (!entry.items || entry.items.length <= 1)) {
    checkOne(entry.merchant, entry.amount);
  }
  if (entry.biller) {
    checkOne(entry.biller, entry.amount);
  }
  return found;
};

M.recordDetectedHikes = hikes => {
  if (!Array.isArray(hikes) || !hikes.length || !M.s) return [];
  if (!Array.isArray(M.s.hikes)) M.s.hikes = [];
  const added = [];
  for (const h of hikes) {
    const key = M.normItemKey(h.n?.ar || h.n?.en);
    if (!key) continue;
    const existingIdx = M.s.hikes.findIndex(x => M.normItemKey(x.n?.ar || x.n?.en) === key);
    const cleanHike = { n: h.n, was: Number(h.was), now: Number(h.now) };
    if (existingIdx >= 0) {
      M.s.hikes[existingIdx] = cleanHike;
    } else {
      M.s.hikes.unshift(cleanHike);
    }
    added.push(h);
  }
  return added;
};

/* derived numbers — safe against salary = 0 or daysLeft = 0 */
M.calc = () => {
  const s = M.s;
  const sal = Math.max(0, Number(s.salary) || 0);
  const spentPurch = (s.purchases || []).reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const paidBills = (s.bills || []).filter(b => b.paid).reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const reserved = (s.bills || []).filter(b => !b.paid).reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const spent = spentPurch + paidBills;
  const spendable = Math.max(0, sal - spent - reserved);
  const daysLeft = Math.max(1, (s.monthDays || 30) - (s.day || 1));
  const pct = sal > 0 ? Math.round((spendable / sal) * 100) : 100;
  const state = sal === 0 ? 'safe' : (pct > 40 ? 'safe' : pct >= 15 ? 'warn' : 'crit');
  return { spentPurch, paidBills, reserved, spent, spendable, daysLeft, daily: spendable / daysLeft, pct, state };
};

M.member = id => M.MEMBERS.find(m => m.id === id) || M.MEMBERS[0] || M.DEFAULT_MEMBERS[0];
M.currentUser = () => M.member(M.s?.currentMemberId || M.MEMBERS[0]?.id);
