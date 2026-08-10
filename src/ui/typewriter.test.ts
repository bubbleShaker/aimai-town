import { describe, expect, it } from 'vitest';
import { sentSoFar, type TypeProgress, type TypeTarget } from './typewriter';

/** ある場面の言葉。実体で場面を見分けるので、テストでも作り分ける */
const scene = [{ text: '霧は、人の背丈のあたりでいちばん濃い。' }, { text: 'だから顔だけが、いくつも浮かんで見える。' }];

function target(lineNo: number, text: string, source: object = scene): TypeTarget {
  return { source, lineNo, text };
}

function progress(sent: number, t: TypeTarget): TypeProgress {
  return { ...t, sent };
}

describe('sentSoFar', () => {
  it('同じ場面の同じ行なら、記録した字数から続ける', () => {
    const t = target(1, 'ひとつ');
    expect(sentSoFar(progress(2, t), t, 3, false)).toBe(2);
  });

  it('文面が差し替わったら送り直す', () => {
    const before = target(1, 'ひとつ');
    const after = target(1, 'ふたつめ');
    expect(sentSoFar(progress(3, before), after, 4, false)).toBe(0);
  });

  it('同じ文が二行続いても、行が変われば送り直す', () => {
    const first = target(1, 'おなじ言葉');
    const second = target(2, 'おなじ言葉');
    expect(sentSoFar(progress(5, first), second, 5, false)).toBe(0);
  });

  it('場面が変われば、行番号も文面も同じでも送り直す', () => {
    // 対話のあとに扉の言葉が続くように、reading から reading へ直に移った場合。
    // 行番号（1行目）も文面も同じなので、場面の実体でしか見分けられない
    const other = [{ text: 'おなじ言葉' }];
    const before = target(1, 'おなじ言葉');
    const after = target(1, 'おなじ言葉', other);
    expect(sentSoFar(progress(5, before), after, 5, false)).toBe(0);
  });

  it('演出を減らす設定なら、送らずはじめから全文を出す', () => {
    const t = target(1, 'ひとつ');
    expect(sentSoFar(progress(0, t), t, 3, true)).toBe(3);
  });

  it('記録が文字数を追い越していても、全文より先へは進めない', () => {
    const t = target(1, 'ひとつ');
    expect(sentSoFar(progress(99, t), t, 3, false)).toBe(3);
  });

  it('まだ何も送っていない記録は 0 のまま', () => {
    const t = target(1, 'ひとつ');
    expect(sentSoFar(progress(0, t), t, 3, false)).toBe(0);
  });
});
