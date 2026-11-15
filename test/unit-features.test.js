const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Running Unit Tests for New Features (Steps 1 to 7) ===');

// Setup mock browser globals
global.window = {
  location: { port: '', protocol: 'http:' },
  addEventListener: () => {},
  matchMedia: (q) => ({
    matches: q.includes('dark'),
    addEventListener: () => {},
    addListener: () => {}
  }),
  Capacitor: {
    Plugins: {
      LocalNotifications: {
        schedule: async (opts) => opts
      }
    }
  }
};
global.addEventListener = () => {};
global.requestAnimationFrame = fn => setTimeout(fn, 0);
global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = v; }
};
const makeMockEl = () => ({
  dataset: {},
  style: { setProperty: () => {} },
  classList: { contains: () => false, add: () => {}, remove: () => {}, toggle: () => {} },
  addEventListener: () => {},
  querySelector: () => makeMockEl(),
  querySelectorAll: () => []
});

global.document = {
  documentElement: { dataset: {} },
  body: { dataset: {}, classList: { contains: () => false, add: () => {}, remove: () => {}, toggle: () => {} } },
  addEventListener: () => {},
  querySelector: () => makeMockEl(),
  querySelectorAll: () => [],
  getElementById: () => makeMockEl()
};

global.M = {
  acts: {},
  screens: {},
  scan: {},
  phone: () => makeMockEl(),
  $: () => makeMockEl(),
  toast: () => {},
  replayAnim: () => {}
};

// Load code
eval(fs.readFileSync(path.join(__dirname, '../js/icons.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/i18n.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/ui.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/screen-home.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/screen-bills.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/screen-family.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/screen-insights.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8'));

// --- Step 1: Theme Sync & In-App Toggle ---
console.log('\nTesting Step 1: Automatic Theme Sync & In-App Toggle...');
assert.strictEqual(typeof M.getInitialThemeMode, 'function');
assert.strictEqual(typeof M.resolveSystemTheme, 'function');
assert.strictEqual(typeof M.setThemeMode, 'function');

M.setThemeMode('light');
assert.strictEqual(M.s.themeMode, 'light');
assert.strictEqual(M.s.theme, 'light');

M.setThemeMode('dark');
assert.strictEqual(M.s.themeMode, 'dark');
assert.strictEqual(M.s.theme, 'dark');

M.setThemeMode('auto');
assert.strictEqual(M.s.themeMode, 'auto');
assert.strictEqual(M.s.theme, 'dark'); // because mock matchMedia matches 'dark'

const appbar = M.appbarHtml();
assert.ok(appbar.includes('data-act="theme-toggle"'), 'Appbar must include theme toggle button');
console.log('  ✓ Theme mode toggle and resolution verified');

// --- Step 2: Payday Day-1 Pre-Reservation & Alert ---
console.log('\nTesting Step 2: Payday Day-1 Pre-Reservation...');
M.s = M.demoSeed();
M.s.salary = 180000;
M.s.payday = 1;
M.s.day = 1; // Exactly on Payday
M.s.car = { odo: 93500, nextOil: 95000, kmDay: 110, oilCost: 4500, oilInterval: 7000 };

const calc = M.calc();
assert.ok(calc.reservedBills > 0, 'Unpaid bills must be reserved');
assert.ok(calc.reservedOil === 4500, 'Oil must be pre-reserved because toOil=1500 (<= 1500 or <= 30 days)');
assert.strictEqual(calc.reserved, calc.reservedBills + calc.reservedOil);
assert.strictEqual(calc.spendable, 180000 - calc.spent - calc.reserved);

const smartRep = M.getPaydaySmartReport();
assert.strictEqual(smartRep.isPaydayWindow, true);
assert.ok(smartRep.totalRecommendedReserve >= 4500);

const alert = M.getMonthlyAIAlert();
assert.ok(alert.title.includes('تنبيه يوم نزول الراتب') || alert.title.includes('Payday'));
assert.ok(alert.body.length > 20);
console.log('  ✓ Payday pre-reservation and AI alerts verified');

// --- Step 3: Bilingual Receipt Dictionary & Thermal Fixes ---
console.log('\nTesting Step 3: Bilingual Receipt Dictionary...');
assert.strictEqual(typeof M.cleanReceiptItemName, 'function');

const sampleDari = M.cleanReceiptItemName('COUSCOUS DARI 1KG');
assert.ok(sampleDari.ar.includes('كسكس') && sampleDari.en.includes('Couscous'));

const sampleElio = M.cleanReceiptItemName('HUILE ELIO 1L');
assert.ok(sampleElio.ar.includes('إيليو') && sampleElio.en.includes('ELIO'));

const sampleCandia = M.cleanReceiptItemName('LAIT CANDIA 1L');
assert.ok(sampleCandia.ar.includes('كونديا') && sampleCandia.en.includes('CANDIA'));

const sampleDanone = M.cleanReceiptItemName('YAOURT DANONE X4');
assert.ok(sampleDanone.ar.includes('دانون') && sampleDanone.en.includes('Danone'));

assert.strictEqual(typeof M.preprocessImageForOCR, 'function');
console.log('  ✓ Bilingual dictionary and OCR helpers verified');

// --- Step 4: AI Next-Bill Cycle Predictor & Countdowns ---
console.log('\nTesting Step 4: Next-Bill Cycle Predictor & Countdown Engine...');
const sonelgazCycle = M.inferBillCycleDays({ n: { ar: 'الكهرباء والغاز · سونلغاز', en: 'Power & gas · Sonelgaz' } });
assert.strictEqual(sonelgazCycle, 60, 'Sonelgaz cycle must be 60 days (bi-monthly)');

const saaCycle = M.inferBillCycleDays({ n: { ar: 'تأمين السيارة · SAA', en: 'Car insurance · SAA' } });
assert.strictEqual(saaCycle, 365, 'Insurance cycle must be 365 days (annual)');

const idoomCycle = M.inferBillCycleDays({ n: { ar: 'إنترنت المنزل · Idoom', en: 'Home internet · Idoom' } });
assert.strictEqual(idoomCycle, 30, 'Internet cycle must be 30 days (monthly)');

const billCountdown = M.getBillCountdown({
  id: 'elec',
  n: { ar: 'سونلغاز', en: 'Sonelgaz' },
  due: 18,
  amount: 6500,
  paid: false,
  cycleDays: 60
});
assert.ok(billCountdown.daysLeft >= 0);
assert.ok(billCountdown.nextCycleDaysFromToday > billCountdown.daysLeft);
assert.ok(billCountdown.nextBillDate.ar.length > 5);
console.log('  ✓ Recurrence cycle inference and countdowns verified');

// --- Step 5: 7,000 KM Car Oil Predictor ---
console.log('\nTesting Step 5: 7,000 KM Car Oil Predictor...');
M.s.car = { odo: 93500, nextOil: 95000, kmDay: 50, oilCost: 4500, oilInterval: 7000 };
const oilStatus = M.getCarOilStatus();
assert.strictEqual(oilStatus.interval, 7000);
assert.strictEqual(oilStatus.toOil, 1500);
assert.strictEqual(oilStatus.days, 30); // 1500 / 50 = 30 days
assert.strictEqual(oilStatus.dueThisMonth, true);
assert.strictEqual(oilStatus.followingOil, 95000 + 7000);
assert.ok(oilStatus.predictedDate.ar.length > 0);
assert.ok(oilStatus.followingDate.ar.length > 0);
console.log('  ✓ 7,000 KM oil status and predictive dates verified');

// --- Step 6: Purchases Search Bar & Insights Report ---
console.log('\nTesting Step 6: Purchases Live Filter & Report Share...');
M.s.feedSearch = 'أونو';
const filteredFeed = M.feedRowsOnlyHtml();
assert.ok(filteredFeed.includes('أونو'));

M.s.feedSearch = '999999nonexistent';
const emptyFeed = M.feedRowsOnlyHtml();
assert.ok(emptyFeed.includes('لا توجد نتائج مطابقة للبحث'));

const insightsHtml = M.screens.insights();
assert.ok(insightsHtml.includes('data-act="share-month-report"'), 'Insights must have 1-tap share report button');
console.log('  ✓ Feed live filtering and insights share button verified');

// --- Step 7: Supabase Schema ---
console.log('\nTesting Step 7: Supabase Schema File Integrity...');
const sql = fs.readFileSync(path.join(__dirname, '../supabase/schema.sql'), 'utf8');
assert.ok(sql.includes('cycle_days INTEGER DEFAULT 30'));
assert.ok(sql.includes('idx_purchases_created_desc'));
assert.ok(sql.includes('idx_bills_scheduled_due'));
assert.ok(sql.includes('idx_cart_got_created'));
assert.ok(sql.includes('idx_car_items_sort'));
assert.ok(sql.includes('masrofi_set_updated_at()'));
assert.ok(sql.includes('supabase_realtime'));
console.log('  ✓ Supabase schema file verified');

console.log('\n✓ ALL Step 1-7 feature unit tests passed successfully!');
process.exit(0);
