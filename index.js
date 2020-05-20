const express = require('express');
const cors = require('cors');
const { webkit } = require('playwright');

const app = express();
const port = 3333;

app.use(cors());

const processUrls = async (urls) => {
  const promises = urls.map(async (url) => {
    const requests = [];
    const responses = [];

    const browser = await webkit.launch();
    const page = await browser.newPage();
    page.on('request', (request) =>
      requests.push([request.method(), request.url()])
    );
    page.on('response', (response) =>
      responses.push([response.status(), response.url()])
    );
    await page.goto(url);

    const title = await page.evaluate(async () => document.title);

    const description = await page.evaluate(async () =>
      document.querySelector('meta[name="description"]')
        ? document.querySelector('meta[name="description"]').content
        : false
    );

    const keywords = await page.evaluate(async () =>
      document.querySelector('meta[name="keywords"]')
        ? document.querySelector('meta[name="keywords"]').content
        : false
    );

    const doctype = await page.evaluate(async () =>
      new XMLSerializer().serializeToString(document.doctype)
    );

    const meta = await page.$$eval('head > meta', (element) =>
      element.map((el) => el.outerHTML)
    );

    const charset = meta.includes('<meta charset="utf-8">');

    const viewport = await page.evaluate(async () =>
      document.querySelector('meta[name="viewport"]')
        ? document.querySelector('meta[name="viewport"]').content
        : false
    );

    const getLinkElements = await page.$$eval('head > link', (element) =>
      element.map((el) => el.outerHTML)
    );

    const findAppleTouchIcon = getLinkElements.map((a) =>
      a.includes('apple-touch-icon') ? true : false
    );

    const appleTouchIcon = findAppleTouchIcon.includes(true) ? true : false;

    const favicon = await page.goto(`${url}/favicon.ico`);
    const checkFavicon = favicon.status() === 200 ? true : false;

    await browser.close();

    const all404s = responses.filter((res) => res[0] === 404);
    const checkDoctype =
      doctype.toLowerCase() === '<!doctype html>' ? true : false;

    return {
      [url]: {
        title,
        description,
        keywords,
        requests: requests.length,
        responses: responses.length,
        all404s,
        checkDoctype,
        viewport,
        charset,
        checkFavicon,
        appleTouchIcon,
      },
    };
  });

  const data = await Promise.all(promises);
  return data;
};

app.get('/', async (req, res) =>
  res.json(
    await processUrls([
      'https://rails3.cefcloud.co.uk',
      'https://rails5.cefcloud.co.uk/',
      'https://rails3.cefcloud.co.uk/catalogue/categories/cables-and-accessories',
      'https://rails5.cefcloud.co.uk/catalogue/categories/cables-and-accessories',
      'https://css-tricks.com/',
    ])
  )
);

app.listen(port, () => console.log(`Running on http://localhost:${port}`));
