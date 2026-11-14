const puppeteer = require('puppeteer-core');
const app = require('../server/index');
const { dbInstance } = require('../server/db');
const assert = require('node:assert');

const PORT = 3088;
const CHROME_PATH = process.env.CHROME_PATH || [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
].find(p => require("node:fs").existsSync(p)) || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const VIEWPORTS = [
  { name: 'iPhone SE (small)', width: 320, height: 568 },
  { name: 'iPhone X / 11 Pro', width: 375, height: 812 },
  { name: 'iPhone 12 / 13 / 14', width: 390, height: 844 },
  { name: 'Pixel 7 / Android', width: 412, height: 915 },
  { name: 'iPhone 14/15 Pro Max', width: 430, height: 932 },
  { name: 'Desktop Studio View', width: 1280, height: 800 }
];

async function runBrowserTests() {
  console.log('--- Starting Headless Browser E2E & Responsiveness Tests ---');

  const server = app.listen(PORT);
  console.log(`[Test Server] Running on http://127.0.0.1:${PORT}`);
  dbInstance.resetToSeed();
  await new Promise(r => setTimeout(r, 200));

  let browser;
  const pageErrors = [];
  const consoleErrors = [];

  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();

    page.on('pageerror', err => {
      console.error('[Browser PageError]:', err.message);
      pageErrors.push(err.message);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        // Exclude favicon or harmless font warnings if any
        if (!msg.text().includes('favicon') && !msg.text().includes('Failed to load resource')) {
          console.error('[Browser ConsoleError]:', msg.text());
          consoleErrors.push(msg.text());
        }
      }
    });

    // 1. Initial Load at default viewport
    console.log('Navigating to http://127.0.0.1:' + PORT + '...');
    const response = await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('#phone');
    await new Promise(r => setTimeout(r, 600));
    assert.strictEqual(response.status(), 200, 'Page must return status 200');

    // Check page title and core root element
    const title = await page.title();
    assert.ok(title.includes('Masrofi'), 'Title should contain Masrofi');

    const hasPhone = await page.$('#phone');
    assert.ok(hasPhone, '#phone element must exist');

    // 2. Test Tab Navigation
    console.log('Testing Tab Navigation in UI...');
    for (const tab of ['bills', 'family', 'insights', 'home']) {
      await page.evaluate(t => {
        const el = document.querySelector(`.nav-item[data-id="${t}"]`);
        if (el) el.click();
      }, tab);
      await new Promise(r => setTimeout(r, 200));
      const curTab = await page.$eval('#phone', el => el.dataset.tab);
      assert.strictEqual(curTab, tab, `Active tab should be ${tab}`);
    }

    // 3. Test Responsive Viewports and Layouts
    console.log('Testing Responsive Viewports across phone and desktop sizes...');
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.width < 900 });
      await new Promise(r => setTimeout(r, 250));

      const layoutCheck = await page.evaluate(isDesktop => {
        const body = document.body;
        const phone = document.getElementById('phone');
        const panel = document.querySelector('.panel');
        const settingsBtn = document.querySelector('.mobile-settings-btn');
        const scrollEl = document.getElementById('scroll');

        const panelVisible = Boolean(panel && window.getComputedStyle(panel).display !== 'none');
        const settingsVisible = Boolean(settingsBtn && window.getComputedStyle(settingsBtn).display !== 'none');
        const phoneWidth = phone.getBoundingClientRect().width;
        const phoneHeight = phone.getBoundingClientRect().height;

        // Check for horizontal overflow
        const hasHOverflow = scrollEl.scrollWidth > scrollEl.clientWidth + 2;

        return {
          panelVisible,
          settingsVisible,
          phoneWidth,
          phoneHeight,
          hasHOverflow
        };
      }, vp.width >= 900);

      console.log(`  Viewport: ${vp.name} (${vp.width}x${vp.height}) -> Phone: ${Math.round(layoutCheck.phoneWidth)}x${Math.round(layoutCheck.phoneHeight)}, Overflow: ${layoutCheck.hasHOverflow ? 'YES (FAIL)' : 'NONE (PASS)'}`);

      assert.strictEqual(layoutCheck.hasHOverflow, false, `Horizontal overflow detected at ${vp.width}x${vp.height}`);

      if (vp.width < 900) {
        assert.strictEqual(layoutCheck.panelVisible, false, `Studio panel must be hidden on mobile (${vp.width}px)`);
        assert.strictEqual(layoutCheck.settingsVisible, false, `Settings gear icon must be permanently removed (${vp.width}px)`);
      } else {
        assert.strictEqual(layoutCheck.panelVisible, true, 'Studio panel must be visible on desktop (>= 900px)');
      }
    }

    // 4. Test Language (RTL/LTR), Theme & OS Switching (Internal API without settings gear)
    console.log("Testing RTL/LTR, Theme & OS switching...");
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    await page.evaluate(() => { M.s.lang = "en"; M.applyEnv(); });
    await new Promise(r => setTimeout(r, 200));
    let curLang = await page.$eval("#phone", el => el.lang);
    let curDir = await page.$eval("#phone", el => el.dir);
    assert.strictEqual(curLang, "en", "Language should switch to English");
    assert.strictEqual(curDir, "ltr", "Direction should switch to LTR");

    await page.evaluate(() => { M.s.theme = "dark"; M.s.os = "android"; M.applyEnv(); });
    await new Promise(r => setTimeout(r, 200));
    assert.strictEqual(await page.$eval("#phone", el => el.dataset.theme), "dark");
    assert.strictEqual(await page.$eval("#phone", el => el.dataset.os), "android");

    await page.evaluate(() => { M.s.lang = "ar"; M.s.theme = "light"; M.s.os = "ios"; M.applyEnv(); });
    await new Promise(r => setTimeout(r, 200));

    // 5. Test Grocery Cart Interaction
    console.log('Testing Grocery Cart interaction...');
    await page.evaluate(() => { document.querySelector('.nav-item[data-id="family"]')?.click(); });
    await new Promise(r => setTimeout(r, 200));

    // Switch to Cart segment
    await page.evaluate(() => {
      document.querySelector('button[data-seg="famSeg"][data-v="cart"]')?.click();
    });
    await new Promise(r => setTimeout(r, 300));

    const initialCartCount = await page.evaluate(() => {
      return document.querySelectorAll('.cart-list .row').length;
    });
    console.log('  Initial cart items visible:', initialCartCount);

    // Add explicit cart item
    await page.evaluate(() => {
      const inName = document.getElementById('cartIn');
      const inPrice = document.getElementById('cartPrice');
      if (inName) inName.value = 'خبز شعير';
      if (inPrice) inPrice.value = '45';
      M.addCartItem('خبز شعير', '45');
    });
    await new Promise(r => setTimeout(r, 400));

    const cartCount = await page.evaluate(() => {
      return document.querySelectorAll('.cart-list .row').length;
    });
    console.log('  Updated cart items visible:', cartCount);
    assert.ok(cartCount > initialCartCount, `Cart items should increase from ${initialCartCount} (got ${cartCount})`);

    // 6. Test AI Scanner Open & Simulation
    console.log('Testing AI Scanner modal & simulation...');
    const initialPurchCount = await page.evaluate(() => M.s.purchases.length);
    const initialBackendCount = await page.evaluate(async () => {
      const res = await fetch('/api/purchases');
      const list = await res.json();
      return list.filter(p => p.amount === 3450 && p.time === '6:52 PM').length;
    });

    await page.evaluate(() => document.querySelector('.nav-scan')?.click());
    await new Promise(r => setTimeout(r, 600));

    const scannerOpen = await page.$eval('#scanner', el => el.classList.contains('on'));
    assert.strictEqual(scannerOpen, true, 'Scanner should open');

    // Run simulated scan
    await page.evaluate(() => document.querySelector('.sc-sim')?.click());
    // Wait for the laser + 4-step OCR parse + results sheet
    await new Promise(r => setTimeout(r, 3600));

    const scanResultOpen = await page.$eval('#sheet', el => el.classList.contains('on'));
    assert.strictEqual(scanResultOpen, true, 'Scan result sheet should appear');

    // Confirm scan
    await page.evaluate(() => document.querySelector('[data-act="scan-confirm"]')?.click());
    await new Promise(r => setTimeout(r, 2200));

    const afterPurchCount = await page.evaluate(() => M.s.purchases.length);
    assert.strictEqual(afterPurchCount, initialPurchCount + 1, `Purchases count must increase by exactly 1 (from ${initialPurchCount} to ${afterPurchCount})`);

    // Verify backend persistence has exactly 1 new record without duplicates
    const afterBackendCount = await page.evaluate(async () => {
      const res = await fetch('/api/purchases');
      const list = await res.json();
      return list.filter(p => p.amount === 3450 && p.time === '6:52 PM').length;
    });
    assert.strictEqual(afterBackendCount, initialBackendCount + 1, `Exactly 1 receipt purchase must be persisted in backend DB (went from ${initialBackendCount} to ${afterBackendCount})`);

    // Ensure zero page errors or console errors
    assert.strictEqual(pageErrors.length, 0, `Zero page errors expected, but got: ${pageErrors.join(', ')}`);
    assert.strictEqual(consoleErrors.length, 0, `Zero console errors expected, but got: ${consoleErrors.join(', ')}`);

    console.log('✓ ALL Headless Browser E2E, Responsive, and UI Interaction tests passed with ZERO errors!');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runBrowserTests().catch(err => {
  console.error('Browser Test Failed:', err);
  process.exit(1);
});
