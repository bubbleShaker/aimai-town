/* 開発用: スマホ幅で通しプレイを撮って目視確認する。ゲーム本体には含まれない */
const fs = require('node:fs');
const { chromium } = require('playwright');

const OUT = process.argv[2] || '/tmp';
const URL = process.argv[3] || 'http://127.0.0.1:5199/aimai-town/';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
  });

  // page.screenshot() はこの環境だとフォント待ちで固まるため、CDP から直接撮る
  const cdp = await page.context().newCDPSession(page);
  const shot = async (name) => {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, 'base64'));
  };
  const tap = async (sel) => {
    await page.click(sel, { force: true });
    await page.waitForTimeout(220);
  };
  /** 物語欄が消えるまで（stopAtEnd なら全文が出たところで）読み進める */
  const read = async (stopAtEnd = false) => {
    for (let i = 0; i < 40; i++) {
      if ((await page.locator('.story').count()) === 0) return;
      if (stopAtEnd && (await page.locator('.story-next').innerText()).includes('もどる')) return;
      await tap('.story');
    }
  };

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await shot('01-arrival');

  await read();
  await shot('02-actions');

  // 広場のふたりから断片を得る
  await tap('.button >> nth=0');
  await read(true);
  await shot('03-talk');
  await read();
  await tap('.button >> nth=1');
  await read();

  // 井戸へ寄ってから織り小屋へ。扉の前に立つ時点で手持ち五枚になる
  await tap('.place >> nth=3');
  await read();
  await tap('.button >> nth=0');
  await read();
  await tap('.place >> nth=0');
  await read();
  await tap('.place >> nth=1');
  await read();
  await tap('.button >> nth=0');
  await read();

  // 戸の前に立ち、断片を差し出す
  await tap('.button.is-gate');
  await read();
  await shot('04-gate');
  await tap('.gate-hand .button >> nth=0');
  await read(true);
  await shot('05-gate-answer');
  await read();
  await shot('06-opened');

  await browser.close();
})();
