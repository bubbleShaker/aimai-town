/* 開発用: スマホ幅で通しプレイを撮って目視確認する。ゲーム本体には含まれない */
const fs = require('node:fs');
const { chromium } = require('playwright');

const OUT = process.argv[2] || '/tmp';
const URL = process.argv[3] || 'http://127.0.0.1:5199/aimai-town/';

(async () => {
  const browser = await chromium.launch();
  try {
    await run(browser);
  } finally {
    // 途中で投げても閉じる。開いたまま落ちると chromium が残る
    await browser.close();
  }
})();

async function run(browser) {
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
   * :not([disabled]) を付けているのは、force click が
   * 「歩けない灯を叩いて素通り」してしまい、道が壊れても気づけなくなるため。
   */
  const walk = (id) => tap(`.place[data-place="${id}"]:not([disabled])`);
  /**
   * 物語欄が消えるまで（stopAtEnd なら全文が出たところで）読み進める。
   * 読み終えたかは「つづける」が消えたことで見る。
   * 読み終えたあとの文字は場面によって変わる（もどる／灯を見る）ため。
   *
   * 一字送りが入ってから、一行につき二度触れる（出し切る・次へ進む）ので、
   * 回数の上限は行数の倍を見込んでおく。
   */
  const read = async (stopAtEnd = false) => {
    for (let i = 0; i < 100; i++) {
      if ((await page.locator('.story').count()) === 0) return;
      if (stopAtEnd && !(await page.locator('.story-next').innerText()).includes('つづける')) return;
      await tap('.story');
    }
    // 上限に達したら投げる。黙って抜けると、読み進めなくなったことに気づけない
    throw new Error('読み進められないまま上限に達した');
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
    if (place !== 'bridge') {
      await walk('square');
      await read();
    }
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

  // 扉の向こうにも入って、そこでしか拾えない断片まで手に入れる
  await walk('tavern-back');
  await read();
  await tap('.button >> nth=0');
  await read();
  await walk('tavern');
  await walk('square');
  await walk('loom');
  await read();
  await tap('.button.is-gate');
  await read();
  await tap('.gate-hand .button >> nth=0');
  await read();
  await walk('loom-inner');
  await read();
  await tap('.button >> nth=0');
  await read();
  await shot('09-map');

  await tap('.button.is-quiet');
  await shot('10-note');
  /* ノートの「閉じる」。一覧の中ではなく、その外にある一枚を掴む */
  await tap('.note > .button');

  // 三つの扉を開いたので、井戸の先の霧の底が開いている
  await walk('loom');
  await walk('square');
  await walk('well');
  await walk('fog-bottom');
  await read(true);
  await shot('11-fog-bottom');
  await read();
  await shot('12-fog-actions');

  // 灯を見る。ここが終わり
  await tap('.button.is-lit');
  await read(true);
  await shot('13-ending-lines');
  await read();
  // 灯の名はゆっくり浮かび上がる。撮るのは浮かび切ってから
  await page.waitForTimeout(1800);
  await shot('14-ending');

  // 置いてきたものを振り返る。末尾まで送って、締めの一行まで出ることを見る
  await tap('.ending-back');
  await shot('15-trace');
  await page.locator('.trace-body').evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await page.waitForTimeout(220);
  await shot('16-trace-end');

  // はじめから歩き直すと、町の入口へ戻る。
  // 畳んでいた町が開くのに 0.45s かかるので、開き切ってから撮る
  await tap('.trace .button.is-lit');
  await page.waitForTimeout(700);
  await shot('17-restart');
}
