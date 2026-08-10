import { describe, expect, it } from 'vitest';
import { emptyLore, markRead } from '../engine/lore';
import type { Reading } from '../engine/lore';
import type { Scene, ShownLine } from './scene';
import { beginReading, isFacing } from './scene';

const reading: Reading = { kind: 'talk', talkId: 't-child' };
const three: ShownLine[] = [{ text: '一' }, { text: '二' }, { text: '三' }];

describe('beginReading', () => {
  it('まだ読んでいない言葉は、何行あっても一行目から', () => {
    // この一行がこの作品の中核。ここが崩れると、触れた人が一行も目にしないまま次の場面へ行ける
    const scene = beginReading(emptyLore(), reading, three);
    expect(scene.shown).toBe(1);
    expect(scene.instant).toBe(false);
  });

  it('一度読み切った言葉は、はじめから全文が開く', () => {
    const scene = beginReading(markRead(emptyLore(), reading), reading, three);
    expect(scene.shown).toBe(three.length);
    expect(scene.instant).toBe(true);
  });

  it('別の読み物を読んだだけでは、開き方は変わらない', () => {
    const other = markRead(emptyLore(), { kind: 'talk', talkId: 't-nameless' });
    expect(beginReading(other, reading, three).shown).toBe(1);
  });

  /**
   * 「一行目しか開いていないのに、その一行が一息で出る」を作れないこと。
   * これができると、触れた人はその一行を読む間もなく次の行へ進める。
   * どこまで開くかと送り方を同じ拍で決めているのは、この組み合わせを消すため。
   */
  it('途中までしか開いていない場面が、一息で出ることはない', () => {
    for (const lore of [emptyLore(), markRead(emptyLore(), reading)]) {
      const scene = beginReading(lore, reading, three);
      expect(scene.instant && scene.shown < scene.lines.length).toBe(false);
    }
  });

  it('言葉の無い読み物でも、一行目を開いた形になる', () => {
    // shown が 0 だと、読んでいる行が無いまま場面だけが立つ
    for (const lore of [emptyLore(), markRead(emptyLore(), reading)]) {
      expect(beginReading(lore, reading, []).shown).toBe(1);
    }
  });

  it('読み終えたあとの行き先を、そのまま持つ', () => {
    const scene = beginReading(emptyLore(), reading, three, {
      kind: 'finishTalk',
      talkId: 't-child',
    });
    expect(scene.then).toEqual({ kind: 'finishTalk', talkId: 't-child' });
  });
});

describe('isFacing', () => {
  it('戸の前と終わったあとだけ、町を畳む', () => {
    const facing: Scene['kind'][] = ['choosing', 'ending', 'trace'];
    const open: Scene['kind'][] = ['idle', 'reading', 'note'];
    for (const kind of facing) expect(isFacing({ kind } as Scene)).toBe(true);
    for (const kind of open) expect(isFacing({ kind } as Scene)).toBe(false);
  });

  it('場面を足して振り分け忘れたら気づける', () => {
    expect(() => isFacing({ kind: 'まだ無い' } as unknown as Scene)).toThrow();
  });
});
