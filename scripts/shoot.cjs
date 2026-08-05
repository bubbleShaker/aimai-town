/* 開発用: スマホ幅で画面を撮って目視確認する。ゲーム本体には含まれない */
const { chromium } = require('playwright');

const OUT = process.argv[2] || '/tmp';
const URL = process.argv[3] || 'http://127.0.0.1:5199/';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
  });
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  const tap = async (sel) => {
    await page.click(sel, { force: true });
    await page.waitForTimeout(250);
  };
  /** 物語欄が消える（＝行動選択に戻る）まで読み進める */
  const readThrough = async (stopBefore = 0) => {
    for (let i = 0; i < 30; i++) {
      const rest = await page.locator('.story').count();
      if (rest === 0) return;
      const hint = await page.locator('.story-hint').innerText();
      if (stopBefore && hint.includes('もどる')) return;
      await tap('.story');
    }
  };

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await shot('01-arrival');

  await readThrough();
  await shot('02-actions');

  await tap('.button >> nth=0');
  await readThrough(1); // 全文を出したところで止める
  await shot('03-talk');

  await readThrough();
  await tap('.button.is-quiet');
  await page.waitForTimeout(400);
  await shot('04-note');

  await browser.close();
})();
