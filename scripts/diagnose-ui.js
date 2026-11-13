const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const app = require('../server/index');

const PORT = 3094;
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

    // Go to insights tab
    await page.click('.nav-item[data-id="insights"]');
    await new Promise(r => setTimeout(r, 400));

    const diag = await page.evaluate(() => {
      const insHead = document.querySelector('.ins-head');
      const rectToObj = r => ({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right });

      const allElements = Array.from(insHead.querySelectorAll('*')).map(el => ({
        tag: el.tagName,
        class: el.className,
        rect: rectToObj(el.getBoundingClientRect()),
        text: el.innerText,
        style: {
          position: window.getComputedStyle(el).position,
          display: window.getComputedStyle(el).display,
          width: window.getComputedStyle(el).width,
          height: window.getComputedStyle(el).height,
          overflow: window.getComputedStyle(el).overflow,
          writingMode: window.getComputedStyle(el).writingMode
        }
      }));

      const insHeadStyle = {
        display: window.getComputedStyle(insHead).display,
        flexDirection: window.getComputedStyle(insHead).flexDirection,
        gridTemplateColumns: window.getComputedStyle(insHead).gridTemplateColumns,
        rect: rectToObj(insHead.getBoundingClientRect())
      };

      return { insHeadStyle, allElements };
    });

    console.log('INS_HEAD STYLE:', JSON.stringify(diag.insHeadStyle, null, 2));
    console.log('ALL ELEMENTS INSIDE INS_HEAD:');
    diag.allElements.forEach((el, idx) => {
      console.log(`[${idx}] ${el.tag}.${el.class}: rect=(${Math.round(el.rect.left)},${Math.round(el.rect.top)},${Math.round(el.rect.width)}x${Math.round(el.rect.height)}) text="${el.text?.replace(/\n/g, ' ')}"`);
    });

  } catch (e) {
    console.error('Error:', e);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
