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
})().catch((e) => {
  // 何につまずいたのかを読める形で出す。撮れた絵だけ見て素通りしないよう
  console.error(e);
  process.exitCode = 1;
});

async function run(browser) {
  await assertStillWhenReduced(browser);

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
  /**
   * 物語欄の姿。何行出ているかと、読み終えたことになっているか。
   *
   * 一字ずつ送られたかは撮った絵に映らない。送り終えた画面と、はじめから
   * 出し切った画面は同じ姿になるため。だから絵ではなくこの二つで見る。
   */
  const readingShape = () =>
    page.evaluate(() => ({
      lines: document.querySelectorAll('.story-lines .line').length,
      done: !(document.querySelector('.story-next')?.textContent ?? '').includes('つづける'),
    }));

  /**
   * まだ読んでいない言葉は、今までどおり一行ずつ送られることを見る。
   * 既読を取り違えて何もかも一息で出すようになると、
   * 「読ませないまま先へ行かせない」が根から崩れる。
   */
  const assertTypedForNewWords = async () => {
    const { lines, done } = await readingShape();
    if (lines !== 1 || done) {
      throw new Error(`まだ読んでいない言葉が、はじめから出し切られている（${lines} 行 / 読了=${done}）`);
    }
  };

  /**
   * 一度読み切った言葉は、次に開いたときはじめから全文が出ていることを見る。
   * 全文が残るからこそ読み返せる（飛ばすのではなく、待ち時間だけを消している）。
   */
  const assertNoWaitOnReread = async () => {
    const { lines, done } = await readingShape();
    if (lines < 2 || !done) {
      throw new Error(`一度読んだ言葉が、また一字ずつ送られている（${lines} 行 / 読了=${done}）`);
    }
  };

  /**
   * 読み返そうと上へさかのぼってから進めたとき、増えた行が画面の中に残るかを見る。
   * ここが崩れると、増えた行は画面の外に置かれ、何も起きていないように見えて叩き続け、
   * 一行も目にしないまま扉や終幕まで行ける。絵にはほとんど映らないので、ここで確かめる。
   *
   * 読みかけの場面で呼ぶこと。まだ先がある場面でないと、叩いた拍子に場面が閉じてしまう。
   */
  const assertNotLeftBehind = async () => {
    const box = () => page.locator('.story-lines');
    const reading = async () => (await page.locator('.story').count()) > 0;
    const hasMore = async () => (await page.locator('.story-next').innerText()).includes('つづける');

    // あふれるまで読み進める。あふれていなければ、さかのぼる余地が無い
    for (let i = 0; i < 40; i++) {
      if (!(await reading()) || !(await hasMore())) return;
      if (await box().evaluate((el) => el.scrollHeight - el.clientHeight > 40)) break;
      await tap('.story');
    }

    await box().evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.waitForTimeout(150);
    // 出し切って、次の行へ進める
    for (let i = 0; i < 2; i++) {
      if (!(await reading())) return; // 場面が閉じたなら、この確認の対象ではない
      await tap('.story');
    }
    if (!(await reading())) return;

    const visible = await box().evaluate((el) => {
      const last = el.querySelector('.line:last-child');
      if (!last) return true;
      const line = last.getBoundingClientRect();
      const view = el.getBoundingClientRect();
      return line.top < view.bottom && line.bottom > view.top;
    });
    if (!visible) throw new Error('読み返した後に進むと、増えた行が画面の外に置き去りになる');
  };

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await shot('01-arrival');
  await assertFogDrifts(page);
  await assertTypedForNewWords(); // 初めての言葉は、一行ずつ送られている途中のはず

  await read();
  await shot('02-actions');

  // 広場のふたりから断片を得る
  await tap('.button >> nth=0');
  await assertNotLeftBehind(); // 読みかけのうちに、読み返しても置き去りにされないことを見る
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
  // 二周目。降りてきた言葉は一度読んでいるので、もう待たせない
  await assertNoWaitOnReread();
}

/**
 * いま動いているものの名前。疑似要素の分もここに出る。
 * 移り変わり（transition）は animationName を持たないので、動いている性質の名前で拾う。
 * 落とすと「アニメーションは止めたが移り変わりは動いたまま」を見逃すことになる。
 */
async function runningNames(page) {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === 'running')
      .map((a) => a.animationName ?? a.transitionProperty)
      .filter(Boolean),
  );
}

/**
 * 霧が流れていることを見る。
 * 一枚の絵には映らないので、止まっても撮った絵からは気づけない。
 * 名前の頭で見て枚数を数えないのは、層を足しても減らしても引っかからないようにするため。
 */
async function assertFogDrifts(page) {
  const names = await runningNames(page);
  if (!names.some((n) => n.startsWith('drift-'))) {
    throw new Error(`霧が流れていない（動いているのは ${names.join(', ') || 'なし'}）`);
  }
}

/**
 * 動きを減らす設定の人には、何も動かないことを見る。
 * 通しプレイとは関わりが無いので、撮る前に済ませる（ここで落ちるなら早いほうがいい）。
 * 撮る画面ではないので、確かめ終えたら閉じる。
 */
async function assertStillWhenReduced(browser) {
  const page = await browser.newPage({
    viewport: { width: 375, height: 667 },
    reducedMotion: 'reduce',
  });
  try {
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(600);
    const names = await runningNames(page);
    if (names.length > 0) {
      throw new Error(`動きを減らす設定でも動いている: ${names.join(', ')}`);
    }
  } finally {
    await page.close();
  }
}
