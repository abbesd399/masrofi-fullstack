/* Masrofi — strings (Arabic RTL / English LTR) */
window.M = window.M || {};

/* Helper to convert any Eastern Arabic (Hindi ٠-٩) or Extended Arabic-Indic (۰-۹) digits to standard Western digits (0-9) */
M.toWesternDigits = str => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[\u0660-\u0669]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
    .replace(/[\u06F0-\u06F9]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]);
};

M.STR = {
  ar: {
    cur: 'د.ج', hello: 'مساء الخير، أبو خالد', homeT: 'الرئيسية', billsT: 'الفواتير والسيارة', familyT: 'محفظة العائلة', insightsT: 'المدرب المالي',
    nav: ['الرئيسية', 'الفواتير', 'العائلة', 'التحليلات'], scan: 'الماسح الذكي', november: 'نوفمبر 2026',
    alertTitle: 'تنبيه بداية الشهر', alertBody: (n, d) => `${n} فواتير مستحقة هذا الشهر، منها تأمين السيارة يوم ${d} — تم حجزها تلقائياً.`,
    alertMini: 'تنبيه بداية الشهر', remaining: 'المتبقي القابل للصرف', ofSalary: 'من الراتب', salary: 'الراتب الشهري',
    reserved: 'حصالة الفواتير', daily: 'الحد اليومي الآمن', perDay: '/يوم', left: 'متبقٍ', daysLeft: d => `${d} يوماً حتى الراتب`,
    family: 'نشاط العائلة', seeAll: 'عرض الكل', add: 'إضافة', live: 'مباشر', you: 'أنت',
    breakdown: 'تفاصيل الراتب', spent: 'المصروف حتى الآن', trueBal: 'الصافي الحقيقي بعد الفواتير', upcoming: 'فواتير محجوزة',
    safeMsg: 'وضعك آمن — استمر بهذا الإيقاع', warnMsg: 'انتبه — اقتربت من حد الصرف', critMsg: 'حرج — الرصيد لن يكفي حتى الراتب',
    stSafe: 'آمن', stWarn: 'تحذير', stCrit: 'حرج',
    segBills: 'فواتير هذا الشهر', segCar: 'ملف السيارة', due: 'مستحق', paidL: 'مدفوع', markPaid: 'تم الدفع', dueOn: d => `يستحق ${d}`, paidOn: d => `دُفع ${d}`,
    totalDue: 'المتبقي للدفع', paidThis: 'مدفوع هذا الشهر', billPaid: 'تم تسجيل الدفع', allPaid: 'كل الفواتير مدفوعة', allPaidSub: 'لا التزامات متبقية هذا الشهر — أحسنت!',
    billFixed: 'ثابتة', billVar: 'متغيرة', billType: 'نوع الفاتورة',
    fixedDesc: 'مبلغ ثابت كل شهر (مثل القسط أو الاشتراك)', varDesc: 'مبلغ متغير حسب الاستهلاك (يتحدث تلقائياً عند تصوير الفاتورة أو يدوياً)',
    editBillAmt: 'تعديل مبلغ الفاتورة الحالية', addBillBtn: 'إضافة فاتورة', billUpdated: 'تم تحديث الفاتورة',
    autoDest: 'مكان الحفظ التلقائي', destMonth: 'فواتير هذا الشهر (تحديث المبلغ وحجزه)', destSched: 'الفواتير المجدولة + التزامات السيارة',
    days: 'يوم', km: 'كم', odo: 'عداد المسافة', aiOdo: (km, d) => `تنبيه الذكاء الاصطناعي (كل 7,000 كم): متبقي ${km} كم لتغيير الزيت (خلال ~${d} يوماً) بناءً على قيادتك.`,
    reminderOn: 'تذكير بداية الشهر مفعّل', timeline: 'جدول الصيانة السنوي', fuelBudget: 'سجل وقود السيارة هذا الشهر', carObl: 'التزامات السيارة',
    members: 'أفراد العائلة', segFeed: 'سجل المشتريات', segCart: 'سلة المقاضي', all: 'الكل', today: 'اليوم', yesterday: 'أمس', earlier: 'سابقاً',
    addPurchBtn: 'تسجيل شراء', addPurchT: 'تسجيل عملية شراء جديدة', editSalary: 'تعديل الراتب الشهري', salaryUpdated: 'تم تحديث الراتب الشهري',
    estBasket: 'إجمالي سلة المقاضي', remBasket: 'المتبقي للشراء', ofSpend: p => `≈ ${p}% من المتبقي القابل للصرف`,
    addItem: 'اسم الغرض…', itemPrice: 'السعر (د.ج)', itemQty: 'الكمية', addBtn: 'إضافة للسلة',
    editItem: 'تعديل الغرض والسعر', unitPrice: 'سعر الوحدة', clearGot: 'حذف المكتمل',
    enterNamePrice: 'يرجى إدخال اسم الغرض والسعر أولاً', itemAdded: 'تمت الإضافة للسلة', itemUpdated: 'تم تحديث الغرض', itemRemoved: 'تم حذف الغرض',
    items: 'أغراض', emptyCart: 'سلة المقاضي فارغة', emptyCartSub: 'أضف الأغراض وحدد سعر كل غرض بنفسك لحساب تكلفة المقاضي بدقة.',
    spentBy: 'صرف هذا الشهر', purchases: 'المشتريات', receipt: 'تفاصيل الإيصال', items2: 'الأصناف', total: 'الإجمالي', scannedBy: 'بواسطة',
    burn: 'مؤشر سرعة الصرف', burnOk: 'إيقاعك الحالي يكفي حتى الراتب', burnBad: d => `بهذا الإيقاع سينفد الراتب يوم ${d}`,
    actual: 'الفعلي', ideal: 'المثالي', forecast: 'المتوقع', hikeT: 'كاشف غلاء الأسعار والتكرار', dup: 'إيصال مكرر', goalT: 'هدف التوفير العائلي',
    goalName: 'رحلة الصيف للعائلة', monthly: 'المساهمة الشهرية', reachBy: m => `ستصل للهدف خلال ${m} أشهر`, insHead: 'ملخص الذكاء الاصطناعي',
    insBody: 'وفّرتم 8% أكثر من الشهر الماضي، لكن أسعار الألبان ارتفعت.', vsLast: 'مقارنة بالشهر الماضي',
    scReceipt: 'إيصال مشتريات', scBill: 'فاتورة / أوراق السيارة', scanHint: 'وجّه الكاميرا نحو الإيصال أو الفاتورة ليتم فرزها وحفظها في مكانها تلقائياً', simulate: 'محاكاة المسح والحفظ التلقائي',
    manual: 'أو أدخل التفاصيل يدوياً', s1: 'التقاط وتحسين الصورة', s2: 'قراءة النص والجهة (OCR)', s3: 'استخراج المبلغ وتاريخ الاستحقاق', s4: 'تحديد القسم والحفظ في مكانه تلقائياً',
    resultR: 'تم قراءة الإيصال وحفظه', resultB: 'تم فرز الفاتورة وتوجيهها لمكانها', merchant: 'المتجر', category: 'الفئة', member: 'فرد العائلة', date: 'التاريخ', amount: 'المبلغ',
    biller: 'الجهة', dueDate: 'تاريخ التسديد', reminder: 'التذكير', reminderAt: d => `بداية الشهر · ${d}`,
    confirmR: 'تأكيد وحفظ في سجل المشتريات', confirmB: 'تأكيد وحفظ في قسم الفواتير', done: 'تم', addedR: 'تم حفظ الإيصال في سجل المشتريات وخصمه', addedB: 'تم حفظ الفاتورة في مكانها تلقائياً',
    hikeWarn: (i, p) => `ارتفع سعر <b>${i}</b> بنسبة ${p}% مقارنة بالشهر الماضي.`, dupWarn: 'يبدو أن هذا <b>الإيصال مكرر</b> — نفس المتجر والمبلغ اليوم.', addAnyway: 'إضافة رغم ذلك',
    varBillNote: (oldP, newP) => `فاتورة <b>متغيرة</b>: سيتم تحديث المبلغ المحجوز تلقائياً من ${oldP} إلى <b>${newP} د.ج</b> في فواتير هذا الشهر.`,
    manualT: 'إضافة فاتورة جديدة', save: 'حفظ', name: 'اسم الفاتورة / الجهة', itemName: 'اسم الغرض', newPurchase: (n, m) => `${n} اشترى من ${m}`,
    thresholdWarn: 'وصلت لمنطقة التحذير — المتبقي أقل من 40%', thresholdCrit: 'تنبيه حرج — المتبقي أقل من 15%', privacyOn: 'تم إخفاء الأرصدة', privacyOff: 'تم إظهار الأرصدة',
    notifApp: 'مصروفي', now: 'الآن', gotIt: 'حسناً', viewBills: 'عرض الفواتير', reservedAuto: 'محجوز تلقائياً',
    settings: 'الإعدادات', designSystem: 'نظام التصميم', theme: 'المظهر', langDir: 'اللغة والاتجاه', resetDemo: 'إعادة ضبط البيانات التوضيحية', light: 'فاتح', dark: 'داكن',
    camera: 'الكاميرا', gallery: 'معرض الصور', cameraError: 'تعذر فتح الكاميرا',
    cloudSetup: 'الربط السحابي (Supabase) والذكاء الاصطناعي',
    cloudSub: 'مزامنة فورية (Realtime) لجميع أفراد العائلة + قراءة الإيصالات بالذكاء الاصطناعي المجاني',
    supaUrl: 'رابط مشروع Supabase (Project URL)',
    supaKey: 'مفتاح Supabase العام (Anon Public Key)',
    aiProvider: 'مزود الذكاء الاصطناعي المجاني',
    aiKey: 'مفتاح API للذكاء الاصطناعي (اختياري)',
    saveConnect: 'حفظ وتفعيل الربط الفوري',
    cloudSaved: 'تم حفظ إعدادات الربط وتفعيل المزامنة الفورية',
    rtSyncToast: 'تحديث فوري من محفظة العائلة',
  },
  en: {
    cur: 'DZD', hello: 'Good evening, Abu Khalid', homeT: 'Home', billsT: 'Bills & Car', familyT: 'Family Wallet', insightsT: 'AI Coach',
    nav: ['Home', 'Bills', 'Family', 'Insights'], scan: 'AI Scan', november: 'November 2026',
    alertTitle: 'Start-of-Month Alert', alertBody: (n, d) => `${n} bills are due this month (including Car Insurance on the ${d}th — reserved automatically).`,
    alertMini: 'Start-of-month alert', remaining: 'True spendable balance', ofSalary: 'of salary', salary: 'Monthly salary',
    reserved: 'Bills bucket', daily: 'Safe daily spend', perDay: '/day', left: 'left', daysLeft: d => `${d} days to payday`,
    family: 'Family activity', seeAll: 'See all', add: 'Add', live: 'Live', you: 'You',
    breakdown: 'Salary breakdown', spent: 'Spent so far', trueBal: 'True balance after bills', upcoming: 'Reserved bills',
    safeMsg: "You're safe — keep this pace", warnMsg: 'Heads up — nearing your spend limit', critMsg: "Critical — balance won't last to payday",
    stSafe: 'Safe', stWarn: 'Warning', stCrit: 'Critical',
    segBills: "This month's bills", segCar: 'Car obligations', due: 'Due', paidL: 'Paid', markPaid: 'Mark paid', dueOn: d => `Due ${d}`, paidOn: d => `Paid ${d}`,
    totalDue: 'Left to pay', paidThis: 'Paid this month', billPaid: 'Payment recorded', allPaid: 'All bills paid', allPaidSub: 'No obligations left this month — nice work!',
    billFixed: 'Fixed', billVar: 'Variable', billType: 'Bill type',
    fixedDesc: 'Same fixed amount each month', varDesc: 'Varies by consumption (auto-updated when scanned or edited)',
    editBillAmt: 'Update current bill amount', addBillBtn: 'Add bill', billUpdated: 'Bill updated',
    autoDest: 'Auto-saved destination', destMonth: "This month's bills (amount updated & reserved)", destSched: 'Scheduled bills + Car obligations',
    days: 'days', km: 'km', odo: 'Odometer', aiOdo: (km, d) => `AI 7,000 km Oil Alert: ${km} km left until next oil change (~${d} days) based on your driving.`,
    reminderOn: 'Start-of-month reminder on', timeline: 'Annual maintenance timeline', fuelBudget: 'Fuel filled this month', carObl: 'Car obligations',
    members: 'Family members', segFeed: 'Purchases feed', segCart: 'Grocery cart', all: 'All', today: 'Today', yesterday: 'Yesterday', earlier: 'Earlier',
    addPurchBtn: 'Add purchase', addPurchT: 'Record new purchase', editSalary: 'Edit monthly salary', salaryUpdated: 'Monthly salary updated',
    estBasket: 'Grocery basket total', remBasket: 'Remaining to buy', ofSpend: p => `≈ ${p}% of your spendable balance`,
    addItem: 'Item name…', itemPrice: 'Price (DZD)', itemQty: 'Qty', addBtn: 'Add to cart',
    editItem: 'Edit item & price', unitPrice: 'Unit price', clearGot: 'Clear checked',
    enterNamePrice: 'Please enter both item name and price', itemAdded: 'Added to cart', itemUpdated: 'Item updated', itemRemoved: 'Item removed',
    items: 'items', emptyCart: 'Your cart is empty', emptyCartSub: 'Add items and enter their prices yourself to track your exact grocery total.',
    spentBy: 'Spent this month', purchases: 'Purchases', receipt: 'Receipt details', items2: 'Items', total: 'Total', scannedBy: 'By',
    burn: 'Salary burn-rate', burnOk: 'Your pace comfortably lasts until payday', burnBad: d => `At this pace your salary runs out on the ${d}th`,
    actual: 'Actual', ideal: 'Ideal', forecast: 'Forecast', hikeT: 'Price-hike & duplicate guard', dup: 'Duplicate receipt', goalT: 'Family savings goal',
    goalName: 'Family summer trip', monthly: 'Monthly contribution', reachBy: m => `You'll reach it in ${m} months`, insHead: 'AI summary',
    insBody: 'You saved 8% more than last month, but dairy prices went up.', vsLast: 'vs last month',
    scReceipt: 'Purchase receipt', scBill: 'Bill / car document', scanHint: 'Point the camera at a receipt or bill to auto-route & save it', simulate: 'Simulate AI scan & auto-route',
    manual: 'or enter details manually', s1: 'Capturing & enhancing', s2: 'Reading text & biller (OCR)', s3: 'Extracting amount & due date', s4: 'Routing to section & saving',
    resultR: 'Receipt read & routed', resultB: 'Bill read & routed to section', merchant: 'Merchant', category: 'Category', member: 'Family member', date: 'Date', amount: 'Amount',
    biller: 'Biller', dueDate: 'Due date', reminder: 'Reminder', reminderAt: d => `Start of month · ${d}`,
    confirmR: 'Confirm & save to purchases', confirmB: 'Confirm & save in Bills section', done: 'Done', addedR: 'Saved to purchases & deducted', addedB: 'Saved automatically in its section',
    hikeWarn: (i, p) => `<b>${i}</b> costs ${p}% more than last month.`, dupWarn: 'This looks like a <b>duplicate receipt</b> — same merchant & total today.', addAnyway: 'Add anyway',
    varBillNote: (oldP, newP) => `<b>Variable bill</b>: reserved amount will auto-update from ${oldP} to <b>${newP} DZD</b> in this month's bills.`,
    manualT: 'Add a new bill', save: 'Save', name: 'Bill / Biller name', itemName: 'Item name', newPurchase: (n, m) => `${n} bought at ${m}`,
    thresholdWarn: 'Warning zone — under 40% left', thresholdCrit: 'Critical — under 15% left', privacyOn: 'Balances hidden', privacyOff: 'Balances visible',
    notifApp: 'MASROFI', now: 'now', gotIt: 'Got it', viewBills: 'View bills', reservedAuto: 'Auto-reserved',
    settings: 'Settings', designSystem: 'Design system', theme: 'Theme', langDir: 'Language & direction', resetDemo: 'Reset demo data', light: 'Light', dark: 'Dark',
    camera: 'Camera', gallery: 'Photo library', cameraError: 'Could not access camera',
    cloudSetup: 'Cloud Realtime (Supabase) & Free AI',
    cloudSub: 'Instant family Realtime sync + free AI receipt & bill OCR',
    supaUrl: 'Supabase Project URL',
    supaKey: 'Supabase Anon Public Key',
    aiProvider: 'Free AI Provider',
    aiKey: 'AI API Key (Optional)',
    saveConnect: 'Save & Connect Realtime',
    cloudSaved: 'Cloud & AI settings saved and Realtime activated',
    rtSyncToast: 'Live family wallet update',
  }
};
M.t = k => {
  const lang = (M.s && M.s.lang) || 'ar';
  const item = M.STR[lang]?.[k] ?? M.STR.ar?.[k];
  if (typeof item === 'function') {
    return (...args) => M.toWesternDigits(item(...args));
  }
  return typeof item === 'string' ? M.toWesternDigits(item) : item;
};
M.L = o => {
  const lang = (M.s && M.s.lang) || 'ar';
  const val = (o && typeof o === 'object') ? (o[lang] ?? o.ar ?? o.en) : o;
  return typeof val === 'string' ? M.toWesternDigits(val) : val;
};
M.fmt = n => Math.round(n).toLocaleString('en-US');
M.money = n => `<span class="num">${M.fmt(n)}</span> <span class="cur-u">${M.t('cur')}</span>`;
/* Leading minus sign on the outer edge (never stuck between number and currency) */
M.moneyNeg = n => `<span class="amt-neg"><i class="neg-sign">−</i><span class="num">${M.fmt(n)}</span><span class="cur-u">${M.t('cur')}</span></span>`;
