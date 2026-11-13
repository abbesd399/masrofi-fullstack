const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const app = require('../server/index');
const fs = require('fs');
const path = require('path');

const PORT = 3092;
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

    // Home
    await page.screenshot({ path: path.join(__dirname, '../test/tab-home.png') });

    // Bills
    await page.click('.nav-item[data-id="bills"]');
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(__dirname, '../test/tab-bills.png') });

    // Car segment
    await page.evaluate(() => document.querySelector('button[data-seg="billSeg"][data-v="car"]')?.click());
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(__dirname, '../test/tab-car.png') });

    // Family
    await page.click('.nav-item[data-id="family"]');
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(__dirname, '../test/tab-family.png') });

    // Cart
    await page.evaluate(() => document.querySelector('button[data-seg="famSeg"][data-v="cart"]')?.click());
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(__dirname, '../test/tab-cart.png') });

    // Insights
    await page.click('.nav-item[data-id="insights"]');
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(__dirname, '../test/tab-insights.png') });

    console.log('Screenshots captured successfully!');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
