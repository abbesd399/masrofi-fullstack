/* Masrofi — Dynamic Family Data Model + 7,000 km AI Oil Predictor + Smart Next-Bill Countdown Engine + Price-Hike Detector */
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

/* Helper: Format future date offset in days into Arabic & English readable strings */
M.formatFutureDate = (daysAhead = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(0, Math.round(daysAhead)));
  const arMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNum = d.getDate();
  const mIdx = d.getMonth();
  const yr = d.getFullYear();
  return {
    ar: `${dayNum} ${arMonths[mIdx]} ${yr}`,
    en: `${enMonths[mIdx]} ${dayNum}, ${yr}`,
    day: dayNum,
    month: mIdx + 1,
    year: yr
  };
};

/* Clean state for real users (oil change every 7,000 km, no fixed fuel budget, optional savings goal starts at 0) */
M.cleanState = () => {
  const today = new Date().getDate() || 15;
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
    car: { n: { ar: 'سيارة العائلة', en: 'Family Car' }, plate: '', odo: 0, oilInterval: 7000, lastOilOdo: 0, nextOil: 7000, kmDay: 45, oilCost: 4500, fuelUsed: 0 },
    carItems: [
      { id: 'oil', ico: 'drop', c: '#F59E0B', n: { ar: 'تغيير زيت المحرك (كل 7,000 كم)', en: 'Engine oil change (every 7,000 km)' }, s: { ar: 'عند 7,000 كم · تنبيه الذكاء الاصطناعي مفعّل', en: 'At 7,000 km · AI reminder active' }, days: 30, cycleDays: 155, ai: true }
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
    { id: 'ins',   n: { ar: 'تأمين السيارة · SAA', en: 'Car insurance · SAA' }, cat: 'car', amount: 18500, due: 15, paid: false, kind: 'fixed', cycleDays: 365 },
    { id: 'elec',  n: { ar: 'الكهرباء والغاز · سونلغاز', en: 'Power & gas · Sonelgaz' }, cat: 'utilities', amount: 6500, prevAmount: 5900, due: 18, paid: false, kind: 'var', cycleDays: 60 },
    { id: 'water', n: { ar: 'الماء · سيال', en: 'Water · SEAAL' }, cat: 'utilities', amount: 2800, prevAmount: 2650, due: 22, paid: false, kind: 'var', cycleDays: 60 },
    { id: 'inst',  n: { ar: 'قسط السيارة', en: 'Car installment' }, cat: 'car', amount: 18000, due: 1, paid: true, paidDay: 1, kind: 'fixed', cycleDays: 30 },
    { id: 'net',   n: { ar: 'إنترنت المنزل · Idoom', en: 'Home internet · Idoom' }, cat: 'net', amount: 2600, due: 5, paid: true, paidDay: 4, kind: 'fixed', cycleDays: 30 },
    { id: 'subs',  n: { ar: 'رصيد موبيليس', en: 'Mobilis credit' }, cat: 'net', amount: 1000, prevAmount: 1000, due: 3, paid: true, paidDay: 3, kind: 'var', cycleDays: 30 },
  ],
  scheduled: [],
  car: { n: { ar: 'رونو سامبول 2021', en: 'Renault Symbol 2021' }, plate: '01234 121 16', odo: 69300, oilInterval: 7000, lastOilOdo: 63000, nextOil: 70000, kmDay: 50, oilCost: 4500, fuelUsed: 3500 },
  carItems: [
    { id: 'ins',  ico: 'shield', c: '#3B82F6', n: { ar: 'تجديد التأمين', en: 'Insurance renewal' }, s: { ar: '15 نوفمبر · 18,500 د.ج', en: 'Nov 15 · 18,500 DZD' }, days: 5, cycleDays: 365 },
    { id: 'oil',  ico: 'drop',   c: '#F59E0B', n: { ar: 'تغيير الزيت (كل 7,000 كم)', en: 'Oil change (every 7,000 km)' }, s: { ar: 'عند 70,000 كم · متبقي 700 كم', en: 'At 70,000 km · 700 km left' }, days: 14, cycleDays: 140, ai: true },
    { id: 'inst', ico: 'card',   c: '#8B5CF6', n: { ar: 'قسط السيارة', en: 'Car installment' }, s: { ar: 'القسط 25 من 60 · 18,000 د.ج', en: 'Payment 25 of 60 · 18,000 DZD' }, days: 21, cycleDays: 30 },
    { id: 'fahs', ico: 'checkc', c: '#10B981', n: { ar: 'المراقبة التقنية', en: 'Technical inspection' }, s: { ar: '3 فبراير 2027', en: 'Feb 3, 2027' }, days: 85, cycleDays: 365 },
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

/* ── AI Billing Cycle & Next-Bill Countdown Engine (Predicts when the NEXT bill after the current one will arrive) ── */
M.inferBillCycleDays = b => {
  if (b && Number(b.cycleDays) > 0) return Number(b.cycleDays);
  const title = ((b?.n?.ar || b?.n || '') + ' ' + (b?.n?.en || '')).toLowerCase();
  if (/(saa|alliance|ciar|caar|تأمين|assurance|مراقبة تقنية|فحص تقني|contrôle technique)/i.test(title)) {
    return 365; // Annual (12 months)
  }
  if (/(sonelgaz|سونلغاز|كهرباء|غاز|seaal|سيال|الجزائرية للمياه|فاتورة الماء)/i.test(title)) {
    return 60; // Bi-monthly (every 2 months = 60 days)
  }
  return 30; // Monthly default (Idoom internet, mobile, rent, installments)
};

M.getBillCycleLabel = cycleDays => {
  const ar = (M.s?.lang || 'ar') === 'ar';
  const d = Number(cycleDays) || 30;
  if (d >= 330) return ar ? 'سنوية (كل 12 شهر)' : 'Annual (Every 12 mos)';
  if (d >= 160) return ar ? 'نصف سنوية (كل 6 أشهر)' : 'Semi-Annual (6 mos)';
  if (d >= 80) return ar ? 'فصلية (كل 3 أشهر)' : 'Quarterly (3 mos)';
  if (d >= 50) return ar ? 'دورية (كل شهرين · 60 يوم)' : 'Bi-Monthly (Every 60 days)';
  return ar ? 'شهرية (كل 30 يوم)' : 'Monthly (Every 30 days)';
};

M.getBillCountdown = b => {
  const s = M.s || {};
  const curDay = Math.max(1, Number(s.day) || new Date().getDate() || 15);
  const mDays = Math.max(28, Number(s.monthDays) || 30);
  const cycleDays = M.inferBillCycleDays(b);
  const dueDay = Math.max(1, Math.min(31, Number(b?.due) || 18));

  let daysUntilDue = 0;
  if (!b?.paid) {
    daysUntilDue = dueDay >= curDay ? (dueDay - curDay) : (mDays - curDay + dueDay);
  } else {
    // Already paid this cycle -> countdown to the NEXT bill after this one!
    const paidOn = Number(b.paidDay) || dueDay;
    const elapsedSincePaid = Math.max(0, curDay - paidOn);
    daysUntilDue = Math.max(1, cycleDays - elapsedSincePaid);
  }

  // Next bill arrival after the current one
  const nextCycleDaysFromToday = b?.paid ? daysUntilDue : (daysUntilDue + cycleDays);
  const nextBillDate = M.formatFutureDate(nextCycleDaysFromToday);
  const thisDueDate = M.formatFutureDate(daysUntilDue);

  // Payday alignment: how many days until the user's next salary drop?
  const payday = Math.max(1, Math.min(31, Number(s.payday) || 1));
  const daysToNextPayday = payday > curDay ? (payday - curDay) : (mDays - curDay + payday);
  const dueInCurrentSalaryCycle = !b?.paid && daysUntilDue <= daysToNextPayday;
  const nextFallsInCurrentMonth = nextCycleDaysFromToday <= 30;

  const progressPct = Math.max(6, Math.min(100, Math.round(((cycleDays - Math.min(cycleDays, daysUntilDue)) / Math.max(1, cycleDays)) * 100)));

  return {
    cycleDays,
    cycleLabel: M.getBillCycleLabel(cycleDays),
    daysLeft: daysUntilDue,
    nextCycleDaysFromToday,
    thisDueDate,
    nextBillDate,
    dueInCurrentSalaryCycle,
    nextFallsInCurrentMonth,
    progressPct
  };
};

/* ── Smart Monthly AI Car Oil (Every 7,000 km) & Predictive Date Engine ── */
M.getCarOilStatus = () => {
  const s = M.s || {};
  const car = s.car || { odo: 0, oilInterval: 7000, lastOilOdo: 0, nextOil: 7000, kmDay: 45, oilCost: 4500 };
  const interval = 7000;
  car.oilInterval = 7000;
  const odo = Math.max(0, Number(car.odo) || 0);
  let nextOil = Number(car.nextOil) || 7000;
  if (odo < 7000) {
    nextOil = 7000;
  } else if (nextOil === 10000 || nextOil <= odo || (nextOil - odo) > 7000) {
    const base = Number(car.lastOilOdo) > 0 && (odo - Number(car.lastOilOdo)) < 7000
      ? Number(car.lastOilOdo)
      : Math.floor(odo / 7000) * 7000;
    nextOil = base + 7000;
  }
  car.nextOil = nextOil;
  const lastOilOdo = Math.max(0, nextOil - interval);
  const toOil = Math.max(0, nextOil - odo);
  const kmUsed = Math.max(0, Math.min(interval, interval - toOil));
  const pctUsed = Math.max(4, Math.min(100, Math.round((kmUsed / interval) * 100)));
  const kmDay = Math.max(5, Number(car.kmDay) || 45);
  const days = Math.max(1, Math.round(toOil / kmDay));
  const predictedDate = M.formatFutureDate(days);
  const followingOil = nextOil + interval;
  const followingDays = days + Math.round(interval / kmDay);
  const followingDate = M.formatFutureDate(followingDays);
  const oilCost = Number(car.oilCost) > 0 ? Number(car.oilCost) : 4500;
  const dueThisMonth = toOil <= 1500 || days <= 30;
  const approachingSoon = toOil <= 1000 || days <= 14;
  return {
    odo,
    interval,
    lastOilOdo,
    nextOil,
    followingOil,
    toOil,
    kmUsed,
    pctUsed,
    kmDay,
    days,
    predictedDate,
    followingDays,
    followingDate,
    oilCost,
    dueThisMonth,
    approachingSoon
  };
};

M.syncCarOilItem = () => {
  const s = M.s;
  if (!s) return;
  const st = M.getCarOilStatus();
  if (!Array.isArray(s.carItems)) s.carItems = [];
  const fmt = M.fmt || (n => String(n));
  const oilItem = {
    id: 'oil',
    ico: 'drop',
    c: '#F59E0B',
    n: { ar: `تغيير الزيت (كل ${fmt(st.interval)} كم)`, en: `Oil change (every ${fmt(st.interval)} km)` },
    s: {
      ar: `عند ${fmt(st.nextOil)} كم · متبقي ${fmt(st.toOil)} كم · المتوقع: ${st.predictedDate.ar}`,
      en: `At ${fmt(st.nextOil)} km · ${fmt(st.toOil)} km left · Est: ${st.predictedDate.en}`
    },
    days: st.days,
    cycleDays: Math.max(30, Math.round(st.interval / st.kmDay)),
    ai: true
  };
  const idx = s.carItems.findIndex(x => x.id === 'oil');
  if (idx >= 0) s.carItems[idx] = oilItem;
  else s.carItems.unshift(oilItem);
};

/* ── Smart Payday & Monthly AI Alert Report (Checks Bills, Next-Bills, Timed Items & 7,000 km Oil on Salary Drop) ── */
M.getPaydaySmartReport = () => {
  const s = M.s || {};
  const curDay = Math.max(1, Number(s.day) || new Date().getDate() || 15);
  const mDays = Math.max(28, Number(s.monthDays) || 30);
  const payday = Math.max(1, Math.min(31, Number(s.payday) || 1));
  const daysToPayday = payday === curDay ? 0 : (payday > curDay ? (payday - curDay) : (mDays - curDay + payday));
  const isPaydayWindow = daysToPayday === 0 || (curDay >= payday && (curDay - payday) <= 3);

  const oil = M.getCarOilStatus();
  const unpaidBills = (s.bills || []).filter(b => !b.paid).map(b => ({
    bill: b,
    cd: M.getBillCountdown(b)
  })).sort((a, b) => a.cd.daysLeft - b.cd.daysLeft);

  const timedCarDueThisMonth = (s.carItems || []).filter(it => it.id !== 'oil' && Number(it.days) <= 30);
  const totalUnpaidBillsAmt = unpaidBills.reduce((acc, x) => acc + (Number(x.bill.amount) || 0), 0);
  const oilReserveAmt = oil.dueThisMonth ? oil.oilCost : 0;
  const totalRecommendedReserve = totalUnpaidBillsAmt + oilReserveAmt;

  return {
    payday,
    daysToPayday,
    isPaydayWindow,
    oil,
    unpaidBills,
    timedCarDueThisMonth,
    totalUnpaidBillsAmt,
    oilReserveAmt,
    totalRecommendedReserve
  };
};

M.getMonthlyAIAlert = () => {
  const s = M.s || {};
  const ar = s.lang === 'ar';
  const rep = M.getPaydaySmartReport();
  const oil = rep.oil;
  const unpaid = (s.bills || []).filter(b => !b.paid).sort((a, b) => a.due - b.due);
  const fmt = M.fmt || (n => String(n));

  let title = ar ? 'تنبيه يوم نزول الراتب · الحجز المسبق قبل الصرف 💰' : 'Payday Day-1 Alert · Pre-Reserved Before Spending 💰';

  let body = '';
  if (oil.dueThisMonth && unpaid.length > 0) {
    body = ar
      ? `منذ لحظة استلام راتبك، حجز التطبيق تلقائياً ${fmt(rep.totalRecommendedReserve)} د.ج (${unpaid.length} فواتير قادمة هذا الشهر + ~${fmt(oil.oilCost)} د.ج لتغيير زيت السيارة المتوقع يوم ${oil.predictedDate.ar}) حتى لا تصرف الراتب وتنسى التزاماتك!`
      : `Right on payday, AI pre-reserved ${fmt(rep.totalRecommendedReserve)} DZD (${unpaid.length} bills this month + ~${fmt(oil.oilCost)} DZD for your 7,000 km oil change on ${oil.predictedDate.en}) so you never overspend mid-month!`;
  } else if (oil.dueThisMonth) {
    body = ar
      ? `منذ يوم نزول راتبك، ينبهك الذكاء الاصطناعي ويحجز ~${fmt(oil.oilCost)} د.ج لأن موعد تغيير زيت السيارة (كل ${fmt(oil.interval)} كم) سيحل خلال هذا الشهر يوم ${oil.predictedDate.ar} (متبقي ${fmt(oil.toOil)} كم).`
      : `Right on payday, AI pre-reserved ~${fmt(oil.oilCost)} DZD because your 7,000 km oil change falls this month on ${oil.predictedDate.en} (${fmt(oil.toOil)} km left).`;
  } else if (unpaid.length > 0) {
    body = ar
      ? `منذ يوم استلام الراتب، تم حجز ${fmt(rep.totalUnpaidBillsAmt)} د.ج مسبقاً لـ ${unpaid.length} فواتير ستأتي خلال هذا الشهر حتى لا تصرفها · وتغيير الزيت القادم متوقع يوم ${oil.predictedDate.ar}.`
      : `Right on payday, AI pre-reserved ${fmt(rep.totalUnpaidBillsAmt)} DZD for ${unpaid.length} bills arriving this month · Next oil change est. ${oil.predictedDate.en}.`;
  } else {
    body = ar
      ? `لا توجد فواتير مستحقة الحجز من راتب هذا الشهر · وتغيير زيت السيارة القادم (كل ${fmt(oil.interval)} كم) متوقع يوم ${oil.predictedDate.ar} (بعد ${fmt(oil.toOil)} كم).`
      : `No bills to reserve from this month's salary · Next 7,000 km oil change est. ${oil.predictedDate.en} (${fmt(oil.toOil)} km left).`;
  }
  return { title, body, oil, unpaid, report: rep };
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

/* derived numbers — Pre-reserves ALL month bills + predicted 7,000 km Oil Change from Day 1 of Salary (Payday) so user never spends bill/oil money mid-month! */
M.calc = () => {
  const s = M.s;
  const sal = Math.max(0, Number(s.salary) || 0);
  const spentPurch = (s.purchases || []).reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const paidBills = (s.bills || []).filter(b => b.paid).reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const reservedBills = (s.bills || []).filter(b => !b.paid).reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const oil = M.getCarOilStatus ? M.getCarOilStatus() : { dueThisMonth: false, oilCost: 0 };
  const reservedOil = (oil.dueThisMonth && sal > 0) ? (Number(oil.oilCost) || 0) : 0;
  const reserved = reservedBills + reservedOil;
  const spent = spentPurch + paidBills;
  const spendable = Math.max(0, sal - spent - reserved);
  const daysLeft = Math.max(1, (s.monthDays || 30) - (s.day || 1));
  const pct = sal > 0 ? Math.round((spendable / sal) * 100) : 100;
  const state = sal === 0 ? 'safe' : (pct > 40 ? 'safe' : pct >= 15 ? 'warn' : 'crit');
  return { spentPurch, paidBills, reservedBills, reservedOil, reserved, spent, spendable, daysLeft, daily: spendable / daysLeft, pct, state };
};

M.member = id => M.MEMBERS.find(m => m.id === id) || M.MEMBERS[0] || M.DEFAULT_MEMBERS[0];
M.currentUser = () => M.member(M.s?.currentMemberId || M.MEMBERS[0]?.id);
