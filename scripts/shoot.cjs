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
  /**
   * マップの灯を場所の id で選んで歩く。
   * 名前は訪れるまで「？」なので、表示名では掴めない。
   */
  const walk = (id) => tap(`.place[data-place="${id}"]`);
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

  // 井戸・織り小屋・酒場・橋をひと回りして、手持ちを六枚まで増やす
  for (const place of ['well', 'loom', 'tavern', 'bridge']) {
    await walk(place);
    await read();
    await tap('.button >> nth=0');
    await read();
    if (place !== 'bridge') await walk('square');
    await read();
  }

  // 橋の先の戸に、増えた手持ちのまま向き合う（あふれても選べることの確認）
  await tap('.button.is-gate');
  await read();
  await shot('04-gate');
  await tap('.gate-hand .button >> nth=0');
  await read(true);
  await shot('05-gate-answer');
  await read();
  await shot('06-opened');

  // 灯台守に会い、町へ戻って残る二つの扉も開ける
  await walk('lighthouse');
  await read();
  await tap('.button >> nth=0');
  await read();
  await shot('07-lighthouse');

  await walk('bridge');
  await walk('square');
  await walk('tavern');
  await read();
  await tap('.button.is-gate');
  await read();
  await shot('08-gate-chat');
  await tap('.gate-hand .button >> nth=0');
  await read();

  await walk('square');
  await walk('loom');
  await tap('.button.is-gate');
  await read();
  await tap('.gate-hand .button >> nth=0');
  await read();
  await shot('09-map');

  await tap('.button.is-quiet');
  await shot('10-note');

  await browser.close();
})();
