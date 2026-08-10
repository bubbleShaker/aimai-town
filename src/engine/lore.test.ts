import { describe, expect, it } from 'vitest';
import { world } from '../scenario';
import type { Reading } from './lore';
import {
  READING_LIMIT,
  emptyLore,
  hasRead,
  markRead,
  readingId,
  restoreLore,
} from './lore';

describe('readingId', () => {
  it('種類が違えば、同じ id を持っていても別の読み物になる', () => {
    // 場所と対話が同じ名前を持つ世界を書かれても、混ざらないこと
    expect(readingId({ kind: 'arrival', placeId: 'x' })).not.toBe(
      readingId({ kind: 'talk', talkId: 'x' }),
    );
  });

  it('戸の返答は、戸と差し出した一枚の組で見分ける', () => {
    const a = readingId({ kind: 'reply', gateId: 'g', fragmentId: 'f1' });
    const b = readingId({ kind: 'reply', gateId: 'g', fragmentId: 'f2' });
    expect(a).not.toBe(b);
    // 戸そのものの口上とも別
    expect(a).not.toBe(readingId({ kind: 'gate', gateId: 'g' }));
  });

  it('読み物の種類を足して畳み忘れたら気づける', () => {
    // 型では通らない値をあえて渡す。実際に落ちるのは Reading に枝を足したとき
    expect(() => readingId({ kind: 'まだ無い' } as unknown as Reading)).toThrow();
  });
});

describe('世界の id', () => {
  /**
   * 名を継ぐ区切りが id に混じると、`reply:戸:断片` の読みが割れる。
   * シナリオを書き足す人が lore.ts を読まなくて済むよう、ここで縛る。
   */
  it('名を継ぐ区切り（:）を含まない', () => {
    const ids = [
      ...world.places.map((p) => p.id),
      ...world.places.flatMap((p) => p.talks.map((t) => t.id)),
      ...world.fragments.map((f) => f.id),
      ...world.gates.map((g) => g.id),
      ...Object.values(world.endings).map((e) => e.id),
    ];
    expect(ids.filter((id) => id.includes(':'))).toEqual([]);
  });
});

describe('markRead / hasRead', () => {
  const talk: Reading = { kind: 'talk', talkId: 't-keeper' };

  it('読み終えるまでは未読で、覚えれば既読になる', () => {
    const lore = emptyLore();
    expect(hasRead(lore, talk)).toBe(false);
    expect(hasRead(markRead(lore, talk), talk)).toBe(true);
  });

  it('覚えたものを覚え直しても、記録は増えず参照も変わらない', () => {
    const once = markRead(emptyLore(), talk);
    expect(markRead(once, talk)).toBe(once);
  });

  it('元の記録を書き換えない', () => {
    const lore = emptyLore();
    markRead(lore, talk);
    expect(lore.readIds).toEqual([]);
  });

  it('あふれたら古いほうから忘れる', () => {
    let lore = emptyLore();
    for (let i = 0; i <= READING_LIMIT; i += 1) {
      lore = markRead(lore, { kind: 'talk', talkId: `t${i}` });
    }
    expect(lore.readIds).toHaveLength(READING_LIMIT);
    // いちばん古い一件だけが落ち、いま読んだものは残る
    expect(hasRead(lore, { kind: 'talk', talkId: 't0' })).toBe(false);
    expect(hasRead(lore, { kind: 'talk', talkId: `t${READING_LIMIT}` })).toBe(true);
  });
});

describe('restoreLore', () => {
  it('保存した記録を読み戻せる', () => {
    const lore = markRead(emptyLore(), { kind: 'ending', endingId: 'e-fog' });
    expect(restoreLore(JSON.parse(JSON.stringify(lore)))).toEqual(lore);
  });

  it('読めないものは、まっさらな記録として扱う', () => {
    // 記録が無いことは「すべて未読」でしかなく、遊びは止まらない
    for (const raw of [null, undefined, 42, 'なにか', [], { readIds: 'ひとつ' }]) {
      expect(restoreLore(raw)).toEqual(emptyLore());
    }
  });

  it('文字列でないものと空の名は落とし、重複は畳む', () => {
    const restored = restoreLore({ readIds: ['talk:a', 1, null, '', 'talk:a', 'talk:b'] });
    expect(restored.readIds).toEqual(['talk:a', 'talk:b']);
  });

  it('世界に無い読み物の名が混じっていても捨てない', () => {
    // 世界の言葉を書き換える前に読んだ記録まで流す理由が無い。引かれないだけで害も無い
    const restored = restoreLore({ readIds: ['talk:もう無い対話'] });
    expect(restored.readIds).toEqual(['talk:もう無い対話']);
  });

  it('書き換えられて際限なく膨らんだ記録は、上限まで切り詰める', () => {
    const swollen = Array.from({ length: READING_LIMIT + 10 }, (_, i) => `talk:t${i}`);
    expect(restoreLore({ readIds: swollen }).readIds).toHaveLength(READING_LIMIT);
  });
});
