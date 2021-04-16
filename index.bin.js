const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.evaluateOnNewDocument(() => {
    window.addEventListener('renderComplete', ({ type, detail }) => {
      Array.from(document.querySelectorAll('web-layer[template]')).forEach(l => l.remove())
      Array.from(document.querySelectorAll('web-layer')).forEach(layer => {
        const existingTemplate = layer.querySelector('template');
        if(existingTemplate){
          existingTemplate.remove();
        }
        const template = document.createElement('template');
        const iframe = layer.querySelector('iframe[srcdoc]');
        template.content.appendChild(iframe);
        layer.appendChild(template);
        layer.setAttribute('prerendered', '');
      })
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
