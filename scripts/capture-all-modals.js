const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const app = require('../server/index');
const path = require('path');
const fs = require('fs');

const PORT = 3096;
const MODALS_DIR = path.join(__dirname, '../test/modals');
if (!fs.existsSync(MODALS_DIR)) fs.mkdirSync(MODALS_DIR, { recursive: true });

const server = app.listen(PORT, async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle0' });

    async function snap(name) {
      await new Promise(r => setTimeout(r, 350));
      await page.screenshot({ path: path.join(MODALS_DIR, `${name}.png`) });
    }

    async function closeSheet() {
      await page.evaluate(() => {
        const closeBtn = document.querySelector('.sh-close');
        if (closeBtn) closeBtn.click();
        else if (window.M?.sheet?.close) window.M.sheet.close();
      });
      await new Promise(r => setTimeout(r, 250));
    }

    // 8. Family Tab: Add Purchase Modal
    await page.click('.nav-item[data-id="family"]');
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      document.querySelector('button[data-seg="famSeg"][data-v="feed"]')?.click();
    });
    await new Promise(r => setTimeout(r, 300));
    await page.click('[data-act="add-purch-open"]');
    await snap('08-add-purchase-sheet');
    await closeSheet();

    // 9. Grocery Cart: Edit Item Modal
    await page.evaluate(() => {
      document.querySelector('button[data-seg="famSeg"][data-v="cart"]')?.click();
    });
    await new Promise(r => setTimeout(r, 300));
    await page.click('.cart-list .r-main');
    await snap('09-cart-edit-sheet');
    await closeSheet();

    // 10. Insights Tab: Price Hikes Modal
    await page.click('.nav-item[data-id="insights"]');
    await new Promise(r => setTimeout(r, 300));
    await page.click('.card[data-act="hikes"]');
    await snap('10-hikes-sheet');
    await closeSheet();

    // 11. Insights Tab: Burn Rate Modal
    await page.click('.ins-head');
    await snap('11-burn-sheet');
    await closeSheet();

    // 12. Insights Tab: Savings Goal Modal
    await page.click('.card[data-act="goal"]');
    await snap('12-goal-sheet');
    await closeSheet();

    // 13. Settings Sheet
    await page.click('.mobile-settings-btn');
    await snap('13-settings-sheet');
    await closeSheet();

    // 14. Scanner Modal: Receipt Viewfinder
    await page.click('.nav-scan');
    await snap('14-scanner-viewfinder');

    // 15. Scanner Modal: Manual Bill Form
    await page.click('.manual');
    await snap('15-scanner-manual');
    await closeSheet();

    // 16. Scanner Bill Mode
    await page.click('.sc-modes button[data-id="bill"]');
    await snap('16-scanner-bill-mode');

    // Close scanner
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));

    console.log('Modals 8-16 captured successfully!');
  } catch (err) {
    console.error('Modal capture error:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
