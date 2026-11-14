const puppeteer = require('puppeteer-core');
const app = require('../server/index');
const { dbInstance } = require('../server/db');
const assert = require('node:assert');
const path = require('node:path');

const PORT = 3099;
const CHROME_PATH = process.env.CHROME_PATH || [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
].find(p => require("node:fs").existsSync(p)) || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const EASTERN_NUMERAL_REGEX = /[\u0660-\u0669\u06F0-\u06F9]/;

async function runAudit() {
  console.log('=== Starting In-Depth UI & Numerals Audit ===');
  const server = app.listen(PORT);
  dbInstance.resetToSeed();
  await new Promise(r => setTimeout(r, 200));

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('#phone');
    await new Promise(r => setTimeout(r, 600));

    // Helper to check for Eastern Arabic numerals across all rendered text in an element
    async function assertNoEasternNumerals(scopeName) {
      const text = await page.evaluate(() => document.getElementById('phone').innerText);
      const match = text.match(EASTERN_NUMERAL_REGEX);
      if (match) {
        throw new Error(`Eastern Arabic numeral found in ${scopeName}: "${match[0]}" in text: ...${text.slice(Math.max(0, match.index - 30), match.index + 30)}...`);
      }
      console.log(`  ✓ No Eastern Arabic numerals in: ${scopeName}`);
    }

    // Helper to check for vertical overlaps between two selector elements
    async function assertNoVerticalOverlap(topSel, bottomSel, description) {
      const collision = await page.evaluate((s1, s2) => {
        const el1 = document.querySelector(s1);
        const el2 = document.querySelector(s2);
        if (!el1 || !el2) return null;
        const r1 = el1.getBoundingClientRect();
        const r2 = el2.getBoundingClientRect();
        // check if bottom of r1 overlaps top of r2 (r1.bottom > r2.top)
        const overlapPx = r1.bottom - r2.top;
        return {
          r1Bottom: r1.bottom,
          r2Top: r2.top,
          overlapPx,
          isOverlapping: overlapPx > 0.5
        };
      }, topSel, bottomSel);

      if (collision) {
        assert.strictEqual(collision.isOverlapping, false,
          `Vertical overlap in ${description}! Top element bottom (${collision.r1Bottom}px) collides with bottom element top (${collision.r2Top}px) by ${collision.overlapPx}px`);
        console.log(`  ✓ Spacing OK: ${description} (gap: ${Math.round(-collision.overlapPx)}px)`);
      }
    }

    // --- TAB 1: HOME (Arabic RTL) ---
    console.log('\nTesting Tab: Home (Arabic RTL)...');
    await assertNoEasternNumerals('Home tab');
    await assertNoVerticalOverlap('.appbar .ab-sub', '.appbar h2', 'Appbar Month Subtitle -> Greeting Header');
    await assertNoVerticalOverlap('.hero .h-big', '.hero .h-salary', 'Hero Big Balance -> Salary Footnote');
    await assertNoVerticalOverlap('.gauge .g-c b', '.gauge .g-c span', 'Gauge Percentage -> Status Label');

    const appbarEl = await page.$('.appbar');
    if (appbarEl) {
      await appbarEl.screenshot({ path: path.join(__dirname, 'appbar-header-fixed.png') });
      console.log('  [Screenshot saved: test/appbar-header-fixed.png]');
    }

    // --- TAB 2: BILLS (Arabic RTL) ---
    console.log('\nTesting Tab: Bills (Arabic RTL)...');
    await page.evaluate(() => document.querySelector('.nav-item[data-id="bills"]')?.click());
    await new Promise(r => setTimeout(r, 300));
    await assertNoEasternNumerals('Bills tab (Bills segment)');
    await assertNoVerticalOverlap('.bill-sum .bs:nth-child(1) .small', '.bill-sum .bs:nth-child(1) b', 'Bill Summary Due Title -> Amount');
    await assertNoVerticalOverlap('.bill-sum .bs:nth-child(2) .small', '.bill-sum .bs:nth-child(2) b', 'Bill Summary Paid Title -> Amount');

    const paidBtnHeight = await page.$eval('.paid-btn', el => el.getBoundingClientRect().height);
    assert.ok(paidBtnHeight <= 34, `paid-btn height (${paidBtnHeight}px) should be <= 34px (not bloated to 44px)`);
    console.log(`  ✓ Button sizing OK: Paid button height is compact (${Math.round(paidBtnHeight)}px)`);

    // Switch to Car segment
    await page.evaluate(() => {
      document.querySelector('button[data-seg="billSeg"][data-v="car"]')?.click();
    });
    await new Promise(r => setTimeout(r, 300));
    await assertNoEasternNumerals('Bills tab (Car segment)');
    await assertNoVerticalOverlap('.car-card .cc-name', '.car-card .cc-sub', 'Car Card Name -> Subtitle');
    await assertNoVerticalOverlap('.car-card .cc-odo b', '.car-card .cc-odo span', 'Car Card Odometer Value -> Label');

    // Open Car Timeline bottom sheet
    await page.click('.car-card');
    await new Promise(r => setTimeout(r, 400));
    await assertNoEasternNumerals('Car Timeline Sheet');
    const timelineText = await page.$eval('.tl', el => el.innerText);
    assert.ok(!timelineText.includes('DZD'), 'Timeline in Arabic should use د.ج instead of DZD');
    assert.ok(!timelineText.includes('km'), 'Timeline in Arabic should use كم instead of km');
    console.log('  ✓ Car Timeline units localized: uses د.ج and كم');
    await page.click('.sh-close');
    await new Promise(r => setTimeout(r, 300));

    // --- TAB 3: FAMILY & GROCERY CART (Arabic RTL) ---
    console.log('\nTesting Tab: Family & Grocery Cart (Arabic RTL)...');
    await page.evaluate(() => document.querySelector('.nav-item[data-id="family"]')?.click());
    await new Promise(r => setTimeout(r, 300));
    await assertNoEasternNumerals('Family tab (Purchases Feed)');

    // Switch to Grocery Cart segment
    await page.evaluate(() => {
      document.querySelector('button[data-seg="famSeg"][data-v="cart"]')?.click();
    });
    await new Promise(r => setTimeout(r, 300));
    await assertNoEasternNumerals('Grocery Cart');

    // Explicitly verify the exact card from screenshot 2!
    await new Promise(r => setTimeout(r, 600));
    await assertNoVerticalOverlap('.cart-est .ce-big', '.cart-est .ce-meta', 'Grocery Cart Balance -> Subtitle Meta (Screenshot 2 issue)');

    // Verify Grocery Cart Edit Modal Label
    await page.click('.cart-list .r-main');
    await new Promise(r => setTimeout(r, 400));
    const firstLabel = await page.$eval('.manual-form label:first-child', el => el.innerText);
    assert.ok(firstLabel.includes('اسم الغرض'), `Item edit label should be 'اسم الغرض' instead of '${firstLabel}'`);
    console.log('  ✓ Grocery Cart edit modal label: correctly shows "اسم الغرض"');
    await page.click('.sh-close');
    await new Promise(r => setTimeout(r, 300));

    // Verify Real-time Input Sanitization (Eastern numerals -> Western digits)
    await page.type('#cartPrice', '١٢٥۰');
    const typedVal = await page.$eval('#cartPrice', el => el.value);
    assert.strictEqual(typedVal, '1250', `Typing Eastern digits '١٢٥۰' must sanitize to '1250', got: '${typedVal}'`);
    console.log('  ✓ Real-time input digit normalization: Eastern Arabic/Hindi digits sanitize to Western 1250');
    await page.evaluate(() => { document.getElementById('cartPrice').value = ''; });

    // Take screenshot of the fixed Grocery Basket Card
    const cartCard = await page.$('.cart-est');
    if (cartCard) {
      await cartCard.screenshot({ path: path.join(__dirname, 'cart-card-fixed.png') });
      console.log('  [Screenshot saved: test/cart-card-fixed.png]');
    }

    // --- TAB 4: INSIGHTS (Arabic RTL) ---
    console.log('\nTesting Tab: Insights (Arabic RTL)...');
    await page.evaluate(() => document.querySelector('.nav-item[data-id="insights"]')?.click());
    await new Promise(r => setTimeout(r, 400));
    await assertNoEasternNumerals('Insights tab');
    await assertNoVerticalOverlap('.ins-head .ih-t', '.ins-head .ih-b', 'Insights Coach Header -> Body');

    const sparkIcoRect = await page.$eval('.ins-head .ih-t svg', el => {
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
    assert.ok(sparkIcoRect.width <= 24 && sparkIcoRect.height <= 24, `Spark icon in ih-t must stay compact (got ${sparkIcoRect.width}x${sparkIcoRect.height})`);
    console.log(`  ✓ Icon sizing OK: Coach header spark icon is compact (${Math.round(sparkIcoRect.width)}x${Math.round(sparkIcoRect.height)}px)`);

    const ihTTextWidth = await page.$eval('.ins-head .ih-t', el => el.getBoundingClientRect().width);
    assert.ok(ihTTextWidth >= 200, `Coach header text width must not be crushed vertically (got ${ihTTextWidth}px)`);
    console.log(`  ✓ Text flow OK: Coach header text breathes horizontally (${Math.round(ihTTextWidth)}px wide)`);

    const hikeCollisions = await page.evaluate(() => {
      const hike = document.querySelector('.hike');
      if (!hike) return null;
      const title = hike.querySelector('.hk-n');
      const sub = hike.querySelector('.hk-p');
      if (!title || !sub) return null;
      return {
        isInline: sub.getBoundingClientRect().top < title.getBoundingClientRect().top + 5,
        subTop: sub.getBoundingClientRect().top,
        titleTop: title.getBoundingClientRect().top
      };
    });
    if (hikeCollisions) {
      assert.strictEqual(hikeCollisions.isInline, false, 'Hike price subtitle must be on its own line below the product title');
      console.log('  ✓ Layout OK: Hike price is on its own row below product title (no word collision)');
    }

    // Open Price hikes modal
    await page.click('.card[data-act="hikes"]');
    await new Promise(r => setTimeout(r, 400));
    await assertNoEasternNumerals('Price Hikes Bottom Sheet');
    await page.click('.sh-close');
    await new Promise(r => setTimeout(r, 300));

    // Open Burn rate modal
    await page.click('.ins-head');
    await new Promise(r => setTimeout(r, 400));
    await assertNoEasternNumerals('Burn Rate Bottom Sheet');
    await page.click('.sh-close');
    await new Promise(r => setTimeout(r, 300));

    // Open Savings goal modal
    await page.click('.card[data-act="goal"]');
    await new Promise(r => setTimeout(r, 400));
    await assertNoEasternNumerals('Savings Goal Bottom Sheet');
    await page.click('.sh-close');
    await new Promise(r => setTimeout(r, 300));

    // --- TEST SCANNER MODAL (Arabic RTL) ---
    console.log('\nTesting AI Scanner Modal (Arabic RTL)...');
    await page.evaluate(() => document.querySelector('.nav-scan')?.click());
    await new Promise(r => setTimeout(r, 500));
    await assertNoEasternNumerals('Scanner viewfinder');

    // Simulate receipt scan
    await page.evaluate(() => document.querySelector('.sc-sim')?.click());
    await new Promise(r => setTimeout(r, 3800));

    await assertNoEasternNumerals('Scanner Results Bottom Sheet');
    await page.evaluate(() => document.querySelector('[data-act="scan-confirm"]')?.click());
    await new Promise(r => setTimeout(r, 1500));
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 400));

    // --- SWITCH TO ENGLISH (LTR) & AUDIT ALL SCREENS ---
    console.log("\nTesting English LTR mode...");
    await page.evaluate(() => { M.s.lang = "en"; M.applyEnv(); });
    await new Promise(r => setTimeout(r, 300));

    // Check Home (LTR)
    await page.evaluate(() => document.querySelector('.nav-item[data-id="home"]')?.click());
    await new Promise(r => setTimeout(r, 300));
    await assertNoVerticalOverlap('.hero .h-big', '.hero .h-salary', 'Hero Big Balance -> Salary Footnote (LTR)');

    // Check Grocery Cart (LTR)
    await page.evaluate(() => document.querySelector('.nav-item[data-id="family"]')?.click());
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      document.querySelector('button[data-seg="famSeg"][data-v="cart"]')?.click();
    });
    await new Promise(r => setTimeout(r, 300));
    await assertNoVerticalOverlap('.cart-est .ce-big', '.cart-est .ce-meta', 'Grocery Cart Balance -> Subtitle Meta (LTR)');

    console.log('\n✓ ALL In-Depth UI & Numerals Audit checks passed with ZERO errors and ZERO overlap!');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runAudit().catch(err => {
  console.error('\n❌ Audit Failed:', err);
  process.exit(1);
});
