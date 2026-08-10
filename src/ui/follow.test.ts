import { describe, expect, it } from 'vitest';
import { isAtBottom } from './follow';

describe('isAtBottom', () => {
  it('あふれていなければ、いつでも下端にいる', () => {
    expect(isAtBottom(400, 0, 400)).toBe(true);
  });

  it('下まで送りきっていれば下端', () => {
    expect(isAtBottom(1000, 600, 400)).toBe(true);
  });

  it('一行に満たない距離なら、まだ下端とみなす', () => {
    // 送っている最中は字が伸びて下端が動く。ぴったりでないと追わない作りだと、
    // 伸びたぶんだけ離れたと見えて追うのをやめてしまう
    expect(isAtBottom(1010, 600, 400)).toBe(true);
  });

  it('一行より離れたら、読み返しているとみなす', () => {
    expect(isAtBottom(1000, 560, 400)).toBe(false);
  });

  it('先頭までさかのぼれば下端ではない', () => {
    expect(isAtBottom(1000, 0, 400)).toBe(false);
  });
});
