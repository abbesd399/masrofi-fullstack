const assert = require('node:assert');
const http = require('node:http');
const app = require('../server/index');

const PORT = 3055;
let server;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    let data;
    const isBuffer = Buffer.isBuffer(body);
    if (isBuffer) {
      data = body;
    } else {
      data = body ? JSON.stringify(body) : null;
    }
    const defaultHeaders = isBuffer
      ? { ...(body ? { 'Content-Length': body.length } : {}) }
      : {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
        };
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path,
      method,
      headers: { ...defaultHeaders, ...headers }
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const json = raw ? JSON.parse(raw) : null;
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting API & Persistence Verification Tests ---');

  server = app.listen(PORT);
  await new Promise(r => setTimeout(r, 100));

  try {
    // 1. Reset state
    console.log('Testing POST /api/reset...');
    let res = await request('POST', '/api/reset');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.state.salary, 150000);
    assert.strictEqual(res.data.state.bills.length, 6);
    assert.strictEqual(res.data.state.purchases.length, 11);
    assert.strictEqual(res.data.state.cart.length, 6);

    // Verify chronological ordering of seed data
    assert.strictEqual(res.data.state.purchases[0].id, 1, 'Purchases[0] should be id 1 (Uno Hypermarket, Day 10)');
    assert.strictEqual(res.data.state.purchases[10].id, 11, 'Purchases[10] should be id 11 (IRIS, Day 1)');
    assert.strictEqual(res.data.state.cart[0].id, 1, 'Cart[0] should be id 1 (Milk 1L)');
    assert.strictEqual(res.data.state.cart[5].id, 6, 'Cart[5] should be id 6 (Laundry detergent)');

    // 2. GET /api/state
    console.log('Testing GET /api/state...');
    res = await request('GET', '/api/state');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.salary, 150000);
    assert.ok(Array.isArray(res.data.purchases));
    assert.ok(Array.isArray(res.data.bills));
    assert.ok(Array.isArray(res.data.cart));

    // 3. PATCH /api/salary
    console.log('Testing PATCH /api/salary...');
    res = await request('PATCH', '/api/salary', { salary: 175000 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.salary, 175000);
    // Verify persistence
    res = await request('GET', '/api/state');
    assert.strictEqual(res.data.salary, 175000);

    // 4. Purchases API
    console.log('Testing Purchases CRUD...');
    const newPurch = {
      id: 99991,
      member: 'khalid',
      merchant: { ar: 'متجر اختبار', en: 'Test Store' },
      cat: 'dining',
      amount: 2500,
      day: 10,
      time: '1:30 PM',
      scanned: true,
      items: [{ n: { ar: 'وجبة غداء', en: 'Lunch meal' }, q: 2, p: 1250 }]
    };
    res = await request('POST', '/api/purchases', newPurch);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.amount, 2500);

    res = await request('GET', '/api/purchases');
    assert.ok(res.data.some(p => p.id === 99991));

    res = await request('DELETE', '/api/purchases/99991');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);

    res = await request('GET', '/api/purchases');
    assert.ok(!res.data.some(p => p.id === 99991));

    // 5. Bills & Scheduled API
    console.log('Testing Bills & Scheduled CRUD...');
    // Create new bill
    res = await request('POST', '/api/bills', {
      id: 'test_bill_1',
      n: { ar: 'فاتورة هاتف', en: 'Phone bill' },
      cat: 'net',
      amount: 1500,
      due: 20,
      kind: 'fixed',
      paid: false
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.id, 'test_bill_1');

    // Update bill: mark paid & change amount
    res = await request('PATCH', '/api/bills/test_bill_1', {
      paid: true,
      paidDay: 10,
      amount: 1600
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.paid, true);
    assert.strictEqual(res.data.amount, 1600);

    // Verify in GET /api/bills
    res = await request('GET', '/api/bills');
    const tb = res.data.bills.find(b => b.id === 'test_bill_1');
    assert.ok(tb);
    assert.strictEqual(tb.paid, true);
    assert.strictEqual(tb.amount, 1600);

    // Delete bill
    res = await request('DELETE', '/api/bills/test_bill_1');
    assert.strictEqual(res.status, 200);

    // Verify scheduled bill creation
    res = await request('POST', '/api/bills', {
      id: 'test_sched_1',
      n: { ar: 'فاتورة قادمة', en: 'Future bill' },
      cat: 'family',
      amount: 4000,
      isScheduled: true,
      dueStr: { ar: 'يستحق 12 ديسمبر', en: 'Due Dec 12' }
    });
    assert.strictEqual(res.status, 201);
    res = await request('GET', '/api/bills');
    assert.ok(res.data.scheduled.some(b => b.id === 'test_sched_1'), 'Future bill should be in scheduled');
    assert.ok(!res.data.bills.some(b => b.id === 'test_sched_1'), 'Future bill must NOT be in bills');
    await request('DELETE', '/api/bills/test_sched_1');

    // Test unpaying bill with null paidDay
    res = await request('PATCH', '/api/bills/inst', { paid: false, paidDay: null });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.paid, false);
    assert.strictEqual(res.data.paidDay, null, 'paidDay must be null, not 0');
    // Restore paid status
    await request('PATCH', '/api/bills/inst', { paid: true, paidDay: 1 });

    // 6. Grocery Cart API
    console.log('Testing Grocery Cart CRUD...');
    // Add item explicitly with name & unit price
    res = await request('POST', '/api/cart', {
      id: 8881,
      n: { ar: 'جبن أبيض', en: 'White cheese' },
      p: 350,
      q: 2,
      got: false
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.p, 350);
    assert.strictEqual(res.data.q, 2);

    // Update quantity & check status
    res = await request('PATCH', '/api/cart/8881', {
      q: 3,
      got: true
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.q, 3);
    assert.strictEqual(res.data.got, true);

    // Clear got items
    res = await request('DELETE', '/api/cart/got');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);

    res = await request('GET', '/api/cart');
    assert.ok(!res.data.some(i => i.id === 8881));

    // 7. Savings Goal & Car
    console.log('Testing Goal & Car PATCH...');
    res = await request('PATCH', '/api/goal', { monthly: 25000 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.goal.monthly, 25000);

    res = await request('PATCH', '/api/car', { car: { odo: 93000 } });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.car.odo, 93000);

    // Flat body car update
    res = await request('PATCH', '/api/car', { odo: 93500 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.car.odo, 93500);

    // 8. AI Scanner & Auto-Routing
    console.log('Testing POST /api/scan auto-routing...');
    // A: Purchase receipt scan
    res = await request('POST', '/api/scan', { mode: 'receipt' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.mode, 'receipt');
    assert.strictEqual(res.data.persisted.action, 'purchases_add');
    assert.strictEqual(res.data.persisted.record.amount, 3450);

    // A2: Receipt scan with base64 data string (must not false-match keywords inside base64 bytes)
    res = await request('POST', '/api/scan', { mode: 'receipt', image: 'data:image/jpeg;base64,saa123seaal456' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.mode, 'receipt', 'Receipt mode must be preserved despite binary bytes');
    assert.strictEqual(res.data.persisted.action, 'purchases_add');

    // B: Variable bill scan (Sonelgaz electricity)
    res = await request('POST', '/api/scan', { mode: 'bill', sampleIdx: 0 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.mode, 'bill');
    assert.strictEqual(res.data.persisted.action, 'bill_update');
    // Matching bill 'elec' should have its amount updated to 7200
    const elecBill = res.data.state.bills.find(b => b.id === 'elec');
    assert.ok(elecBill);
    assert.strictEqual(elecBill.amount, 7200);
    assert.strictEqual(elecBill.kind, 'var');

    // C: Future bill scan (SAA Insurance renewal)
    res = await request('POST', '/api/scan', { mode: 'bill', sampleIdx: 2 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.mode, 'bill');
    assert.strictEqual(res.data.persisted.action, 'scheduled_and_car_add');
    // Check scheduled list
    const schedBill = res.data.state.scheduled.find(b => b.id === 'ins2');
    assert.ok(schedBill);
    assert.strictEqual(schedBill.amount, 19800);
    // Check carItems
    const carIns = res.data.state.carItems.find(ci => ci.id === 'ins2');
    assert.ok(carIns);
    assert.strictEqual(carIns.days, 28);

    // D: Single-item GET endpoints
    console.log('Testing Single-Item GET Endpoints...');
    res = await request('GET', '/api/purchases/1');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.id, 1);
    assert.ok(res.data.amount > 0);

    res = await request('GET', '/api/bills/elec');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.id, 'elec');

    res = await request('GET', '/api/cart/1');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.id, 1);

    // E: PUT Route Aliases
    console.log('Testing PUT Route Aliases...');
    res = await request('PUT', '/api/salary', { salary: 180000 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.salary, 180000);

    res = await request('PUT', '/api/bills/elec', { amount: 7300 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.amount, 7300);

    // F: DELETE /api/bills with query param
    console.log('Testing DELETE /api/bills?id=...');
    await request('POST', '/api/bills', { id: 'temp_to_del', n: 'مؤقت', amount: 900 });
    res = await request('DELETE', '/api/bills?id=temp_to_del');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    res = await request('GET', '/api/bills/temp_to_del');
    assert.strictEqual(res.status, 404);

    // G: POST /api/scan with Multipart/form-data
    console.log('Testing POST /api/scan with multipart/form-data...');
    const boundary = '----WebKitFormBoundaryTest789';
    const multipartData = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="mode"\r\n\r\nreceipt\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="amount"\r\n\r\n5400\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="text"\r\n\r\nArdis Hypermarket Total: 5400 DZD 12/11/2026\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="receipt.jpg"\r\nContent-Type: image/jpeg\r\n\r\nfakejpgbytes\r\n`),
      Buffer.from(`--${boundary}--\r\n`)
    ]);
    res = await request('POST', '/api/scan', multipartData, {
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.mode, 'receipt');
    assert.strictEqual(res.data.extracted.amount, 5400);
    assert.strictEqual(res.data.extracted.merchant.en, 'Ardis');
    assert.strictEqual(res.data.extracted.day, 12);
    assert.strictEqual(res.data.persisted.action, 'purchases_add');

    // H: POST /api/scan with text-based OCR extraction (amount, merchant, category)
    console.log('Testing POST /api/scan with AI text extraction...');
    res = await request('POST', '/api/scan', {
      text: 'Naftal Station Service Carburant Essence 2,400 DA 10/11/2026'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.mode, 'receipt');
    assert.strictEqual(res.data.extracted.merchant.en, 'Naftal');
    assert.strictEqual(res.data.extracted.cat, 'car');
    assert.strictEqual(res.data.extracted.amount, 2400);

    console.log('✓ ALL API and Database Persistence tests passed successfully!');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('Test failed:', err);
  if (server) server.close();
  process.exit(1);
});
