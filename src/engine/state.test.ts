import { describe, expect, it } from 'vitest';
import { world } from '../scenario';
import { canMove, collectedFragments, createInitialState, reduce } from './state';

describe('createInitialState', () => {
  it('世界の開始地点から始まり、断片は何も持っていない', () => {
    const s = createInitialState(world);
    expect(s.currentPlaceId).toBe(world.start);
    expect(s.visitedPlaceIds).toEqual([world.start]);
    expect(s.fragmentIds).toEqual([]);
  });
});

describe('MOVE', () => {
  it('隣接する場所へは歩ける', () => {
    const s = reduce(createInitialState(world), { type: 'MOVE', to: 'loom' }, world);
    expect(s.currentPlaceId).toBe('loom');
    expect(s.visitedPlaceIds).toContain('loom');
  });

  it('隣接していない場所へは歩けず、状態が変わらない', () => {
    const before = reduce(createInitialState(world), { type: 'MOVE', to: 'loom' }, world);
    // 織り小屋から井戸へは直接つながっていない
    const after = reduce(before, { type: 'MOVE', to: 'well' }, world);
    expect(after).toBe(before);
  });

  it('存在しない場所へは歩けない', () => {
    const before = createInitialState(world);
    expect(reduce(before, { type: 'MOVE', to: 'nowhere' }, world)).toBe(before);
    expect(canMove(world, 'square', 'nowhere')).toBe(false);
  });
});

describe('FINISH_TALK', () => {
  it('対話を終えると断片が手に入る', () => {
    const s = reduce(createInitialState(world), { type: 'FINISH_TALK', talkId: 't-child' }, world);
    expect(s.fragmentIds).toEqual(['f-approval']);
    expect(s.finishedTalkIds).toEqual(['t-child']);
  });

  it('一度に複数の断片を与える対話がある', () => {
    let s = reduce(createInitialState(world), { type: 'MOVE', to: 'loom' }, world);
    s = reduce(s, { type: 'FINISH_TALK', talkId: 't-master' }, world);
    expect(s.fragmentIds).toEqual(['f-autonomy', 'f-respect']);
  });

  it('同じ対話を繰り返しても断片は重複しない', () => {
    let s = reduce(createInitialState(world), { type: 'FINISH_TALK', talkId: 't-child' }, world);
    s = reduce(s, { type: 'FINISH_TALK', talkId: 't-child' }, world);
    expect(s.fragmentIds).toEqual(['f-approval']);
  });

  it('その場にいない相手とは話せない', () => {
    const before = createInitialState(world);
    // 親方は織り小屋にいる
    expect(reduce(before, { type: 'FINISH_TALK', talkId: 't-master' }, world)).toBe(before);
  });
});

describe('collectedFragments', () => {
  it('獲得順に断片の実体を取り出せる', () => {
    let s = reduce(createInitialState(world), { type: 'FINISH_TALK', talkId: 't-nameless' }, world);
    s = reduce(s, { type: 'FINISH_TALK', talkId: 't-child' }, world);
    expect(collectedFragments(world, s).map((f) => f.id)).toEqual(['f-empty-time', 'f-approval']);
  });
});

describe('世界の整合性', () => {
  it('対話が与える断片は、すべて定義済みである', () => {
    const known = new Set(world.fragments.map((f) => f.id));
    for (const place of world.places) {
      for (const talk of place.talks) {
        for (const id of talk.grants) {
          expect(known.has(id), `${talk.id} が未定義の断片 ${id} を与えている`).toBe(true);
        }
      }
    }
  });

  it('場所のつながりは双方向である', () => {
    for (const place of world.places) {
      for (const linked of place.links) {
        const other = world.places.find((p) => p.id === linked);
        expect(other, `${place.id} → ${linked} の行き先が無い`).toBeDefined();
        expect(other!.links, `${linked} から ${place.id} へ戻れない`).toContain(place.id);
      }
    }
  });
});
