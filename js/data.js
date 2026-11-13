/* Masrofi — Algerian demo data (today = 10 Nov 2026, salary cycle 1–30 Nov) · amounts in DZD (د.ج) */
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
M.MEMBERS = [
  { id: 'abu',    n: { ar: 'أبو خالد', en: 'Abu Khalid' }, i: { ar: 'أ', en: 'A' }, c: '#0D9488', role: { ar: 'الأب · صاحب الراتب', en: 'Dad · salary owner' } },
  { id: 'umm',    n: { ar: 'أم خالد', en: 'Umm Khalid' }, i: { ar: 'م', en: 'U' }, c: '#EC4899', role: { ar: 'الأم', en: 'Mom' } },
  { id: 'khalid', n: { ar: 'خالد', en: 'Khalid' },       i: { ar: 'خ', en: 'K' }, c: '#3B82F6', role: { ar: 'الابن · 17 سنة', en: 'Son · 17' } },
  { id: 'sara',   n: { ar: 'سارة', en: 'Sara' },         i: { ar: 'س', en: 'S' }, c: '#F59E0B', role: { ar: 'الابنة · 14 سنة', en: 'Daughter · 14' } },
];
const I = (ar, en, q, p) => ({ n: { ar, en }, q, p });
const P = (id, member, mar, men, cat, amount, day, time, items, scanned = true) => ({ id, member, merchant: { ar: mar, en: men }, cat, amount, day, time, items: items || [], scanned });

M.seed = () => ({
  salary: 150000, day: 10, monthDays: 30,
  purchases: [
    P(1, 'umm', 'أونو هايبر', 'Uno Hypermarket', 'groceries', 4910, 10, '6:40 PM', [I('حليب 1 لتر', 'Milk 1L', 4, 90), I('سميد 10 كغ', 'Semolina 10kg', 1, 1400), I('دجاج', 'Chicken', 2, 480), I('خضر وفواكه', 'Fruit & veg', 1, 650), I('منظفات', 'Detergents', 2, 320), I('تمر دقلة نور', 'Deglet Nour dates', 1, 900)]),
    P(2, 'khalid', 'نفطال', 'Naftal', 'car', 1500, 10, '2:15 PM', [I('بنزين', 'Petrol', 1, 1500)]),
    P(3, 'abu', 'صيدلية الشفاء', 'El Chifa Pharmacy', 'health', 1250, 9, '9:05 PM', [I('فيتامينات', 'Vitamins', 1, 850), I('مسكن', 'Pain relief', 2, 200)]),
    P(4, 'sara', 'مكتبة العالم الثالث', 'Tiers Monde Bookstore', 'family', 2300, 9, '5:30 PM', [I('أدوات مدرسية', 'School supplies', 1, 1600), I('رواية', 'Novel', 1, 700)]),
    P(5, 'umm', 'أرديس', 'Ardis', 'groceries', 4500, 7, '7:10 PM', [I('مقاضي الأسبوع', 'Weekly groceries', 1, 4500)]),
    P(6, 'abu', 'كوندور', 'Condor Store', 'home', 6900, 6, '8:00 PM', [I('مكنسة كهربائية', 'Vacuum cleaner', 1, 6900)]),
    P(7, 'khalid', 'بيتزيريا البهجة', 'El Bahdja Pizzeria', 'dining', 1600, 5, '10:20 PM', [I('وجبات عائلية', 'Family meals', 2, 800)], false),
    P(8, 'umm', 'سوق الخضر', 'Local market', 'groceries', 3800, 3, '6:00 PM', [I('خضر ولحم', 'Veg & meat', 1, 3800)]),
    P(9, 'abu', 'نفطال', 'Naftal', 'car', 2000, 2, '7:45 AM', [I('بنزين', 'Petrol', 1, 2000)], false),
    P(10, 'sara', 'مركز باب الزوار', 'Bab Ezzouar Mall', 'family', 3600, 2, '4:30 PM', [I('ملابس', 'Clothes', 3, 1200)]),
    P(11, 'abu', 'إيريس', 'IRIS Store', 'home', 4200, 1, '9:00 PM', [I('آلة قهوة', 'Coffee maker', 1, 4200)]),
  ],
  /* Bills now distinguish Fixed (ثابتة) vs Variable (متغيرة) */
  bills: [
    { id: 'ins',   n: { ar: 'تأمين السيارة · SAA', en: 'Car insurance · SAA' }, cat: 'car', amount: 18500, due: 15, paid: false, kind: 'fixed' },
    { id: 'elec',  n: { ar: 'الكهرباء والغاز · سونلغاز', en: 'Power & gas · Sonelgaz' }, cat: 'utilities', amount: 6500, prevAmount: 5900, due: 18, paid: false, kind: 'var' },
    { id: 'water', n: { ar: 'الماء · سيال', en: 'Water · SEAAL' }, cat: 'utilities', amount: 2800, prevAmount: 2650, due: 22, paid: false, kind: 'var' },
    { id: 'inst',  n: { ar: 'قسط السيارة', en: 'Car installment' }, cat: 'car', amount: 18000, due: 1, paid: true, paidDay: 1, kind: 'fixed' },
    { id: 'net',   n: { ar: 'إنترنت المنزل · Idoom', en: 'Home internet · Idoom' }, cat: 'net', amount: 2600, due: 5, paid: true, paidDay: 4, kind: 'fixed' },
    { id: 'subs',  n: { ar: 'رصيد موبيليس', en: 'Mobilis credit' }, cat: 'net', amount: 1000, prevAmount: 1000, due: 3, paid: true, paidDay: 3, kind: 'var' },
  ],
  scheduled: [],
  car: { n: { ar: 'رونو سامبول 2021', en: 'Renault Symbol 2021' }, plate: '01234 121 16', odo: 92400, nextOil: 95000, kmDay: 110, fuelBudget: 6000, fuelUsed: 3500 },
  carItems: [
    { id: 'ins',  ico: 'shield', c: '#3B82F6', n: { ar: 'تجديد التأمين', en: 'Insurance renewal' }, s: { ar: '15 نوفمبر · 18,500 د.ج', en: 'Nov 15 · 18,500 DZD' }, days: 5 },
    { id: 'oil',  ico: 'drop',   c: '#F59E0B', n: { ar: 'تغيير الزيت والصيانة', en: 'Oil change & service' }, s: { ar: 'عند 95,000 كم · ~4,500 د.ج', en: 'At 95,000 km · ~4,500 DZD' }, days: 24, ai: true },
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
  goal: { target: 300000, saved: 180000, monthly: 20000 },
  famFilter: 'all', billFilter: 'all', scanCount: 0, bannerHidden: false, lastState: null,
});

M.SIM_PURCHASES = [
  ['umm', 'كارفور', 'Carrefour', 'groceries', [6000, 11000]],
  ['khalid', 'نفطال', 'Naftal', 'car', [1500, 3000]],
  ['sara', 'مركز باب الزوار', 'Bab Ezzouar Mall', 'family', [3500, 7000]],
  ['abu', 'كوندور', 'Condor Store', 'home', [8000, 14000]],
  ['umm', 'أونو هايبر', 'Uno Hypermarket', 'groceries', [5000, 9000]],
  ['khalid', 'مطعم الكرم', 'El Karam Restaurant', 'dining', [1200, 2400]],
];

/* derived numbers */
M.calc = () => {
  const s = M.s;
  const spentPurch = s.purchases.reduce((a, p) => a + p.amount, 0);
  const paidBills = s.bills.filter(b => b.paid).reduce((a, b) => a + b.amount, 0);
  const reserved = s.bills.filter(b => !b.paid).reduce((a, b) => a + b.amount, 0);
  const spent = spentPurch + paidBills;
  const spendable = Math.max(0, s.salary - spent - reserved);
  const daysLeft = s.monthDays - s.day;
  const pct = Math.round((spendable / s.salary) * 100);
  const state = pct > 40 ? 'safe' : pct >= 15 ? 'warn' : 'crit';
  return { spentPurch, paidBills, reserved, spent, spendable, daysLeft, daily: spendable / daysLeft, pct, state };
};
M.member = id => M.MEMBERS.find(m => m.id === id);
