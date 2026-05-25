const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();

  const filePath = 'file://' + path.resolve(__dirname, 'event_cards.html').replace(/\\/g, '/');
  await page.goto(filePath, { waitUntil: 'networkidle0', timeout: 30000 });

  await page.evaluate(() => {
    document.querySelectorAll('.save-btn').forEach(b => b.remove());
    document.querySelectorAll('.pattern-title').forEach(t => t.remove());
  });

  await page.pdf({
    path: 'event_cards.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();
  console.log('完了: event_cards.pdf を保存しました');
})();
