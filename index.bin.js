const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.evaluateOnNewDocument(() => {
    window.addEventListener('renderComplete', ({ type, detail }) => {
      // Array.from(document.querySelectorAll('web-layer[template]')).forEach(l => l.remove())
      Array.from(document.querySelectorAll('iframe[src^="blob:"]')).forEach(i => i.remove())
    });
  });
  await page.goto(process.argv[2], {
    waitUntil: 'networkidle0',
  });
  const htmlHandle = await page.$('html');
  const html = await page.evaluate(el => el.outerHTML, htmlHandle);
  await htmlHandle.dispose();
  console.log(html);
  await browser.close();
})()
