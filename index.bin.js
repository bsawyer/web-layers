const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.evaluateOnNewDocument(() => {
    window.addEventListener('renderComplete', ({ type, detail }) => {
      Array.from(document.querySelectorAll('iframe[src^="blob:"]')).forEach(i => i.remove());
      window.addEventListener('prerenderComplete', ()=>{
        window._prerendered = true;
      });
      window.dispatch(new Event('prerender'));

      // copy shadowroots to layer content - need to indicate which layers we want to do this for ...
      // the layer will need to have the previewContent attribute set also ...
      // optionally wrap with <web-layer prerendered></web-layer> ?

      // optionally hoist templates as <weblayer template></web-layer> to the top?
    });
  });
  await page.mainFrame().waitForFunction('!!window._prerendered');
  // await page.goto(process.argv[2], {
  //   waitUntil: 'networkidle0',
  // });
  const htmlHandle = await page.$('html');
  const html = await page.evaluate(el => el.outerHTML, htmlHandle);
  await htmlHandle.dispose();
  console.log(html);
  await browser.close();
})()
