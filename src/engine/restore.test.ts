import { describe, expect, it } from 'vitest';
import { world } from '../scenario';
import type { GameState } from './state';
import { canMove, createInitialState, reduce, trace } from './state';
import { restoreState } from './restore';

/** その場所の話をすべて終える */
function talkAll(state: GameState): GameState {
  const place = world.places.find((p) => p.id === state.currentPlaceId)!;
  return place.talks.reduce((s, talk) => reduce(s, { type: 'FINISH_TALK', talkId: talk.id }, world), state);
}

/** 広場と織り小屋で話を集め、仕事の扉をひとつ開けたところまで歩いた状態 */
function walked(): GameState {
  let s = talkAll(createInitialState(world));
  s = talkAll(reduce(s, { type: 'MOVE', to: 'loom' }, world));
  return reduce(s, { type: 'OPEN_GATE', gateId: 'g-work', fragmentId: s.fragmentIds[0] }, world);
}

describe('restoreState', () => {
  it('保存した状態をそのまま読み戻せる（JSON を通しても同じ姿になる）', () => {
    const before = walked();
    const after = restoreState(world, JSON.parse(JSON.stringify(before)));
    expect(after).toEqual(before);
  });

  it('始めたばかりの状態も読み戻せる', () => {
    const before = createInitialState(world);
    expect(restoreState(world, JSON.parse(JSON.stringify(before)))).toEqual(before);
  });

  it('オブジェクトでないものは読まない', () => {
    for (const raw of [null, undefined, 0, 'saved', [], true]) {
      expect(restoreState(world, raw)).toBeNull();
    }
  });

  it('立っている場所が世界に無ければ、保存ごと捨てる', () => {
    expect(restoreState(world, { ...createInitialState(world), currentPlaceId: 'nowhere' })).toBeNull();
    expect(restoreState(world, { ...createInitialState(world), currentPlaceId: 42 })).toBeNull();
  });

  it('世界に無い場所・断片・対話・扉の記録は落とし、歩みは残す', () => {
    const restored = restoreState(world, {
      currentPlaceId: 'loom',
      visitedPlaceIds: ['square', 'atlantis', 'loom'],
      fragmentIds: ['f-nothing', ...walked().fragmentIds],
      finishedTalkIds: ['t-nobody'],
      openedGateIds: ['g-nothing'],
      gateChoices: [],
    });
    expect(restored).not.toBeNull();
    expect(restored!.visitedPlaceIds).toEqual(['square', 'loom']);
    expect(restored!.fragmentIds).toEqual(walked().fragmentIds);
    expect(restored!.finishedTalkIds).toEqual([]);
    expect(restored!.openedGateIds).toEqual([]);
  });

  it('配列でない欄は空として読む', () => {
    const restored = restoreState(world, {
      currentPlaceId: world.start,
      visitedPlaceIds: 'square',
      fragmentIds: null,
      finishedTalkIds: { 0: 't-x' },
      openedGateIds: 7,
      gateChoices: 'nothing',
    });
    expect(restored).toEqual({
      currentPlaceId: world.start,
      // 立っている場所は、保存が欠けていても訪れたことになる
      visitedPlaceIds: [world.start],
      fragmentIds: [],
      finishedTalkIds: [],
      openedGateIds: [],
      gateChoices: [],
    });
  });

  it('同じ id が重ねて書かれていても一件に畳む', () => {
    const restored = restoreState(world, {
      ...createInitialState(world),
      visitedPlaceIds: [world.start, world.start, 'loom', 'loom'],
    });
    expect(restored!.visitedPlaceIds).toEqual([world.start, 'loom']);
  });

  it('開いた記録の無い扉に置いた一枚は、記録として残さない', () => {
    const before = walked();
    const restored = restoreState(world, { ...before, openedGateIds: [] });
    expect(restored!.gateChoices).toEqual([]);
  });

  it('持っていない断片を置いたことにはできない', () => {
    const before = walked();
    const restored = restoreState(world, { ...before, fragmentIds: [] });
    expect(restored!.gateChoices).toEqual([]);
  });

  it('同じ扉に二枚置かれていても、扉ごとに一件しか残さない（軸の集計が二重に効かない）', () => {
    const before = walked();
    const doubled = {
      ...before,
      gateChoices: [...before.gateChoices, { gateId: before.gateChoices[0].gateId, fragmentId: before.fragmentIds[1] }],
    };
    const restored = restoreState(world, doubled)!;
    expect(restored.gateChoices).toEqual(before.gateChoices);
    expect(trace(world, restored)).toHaveLength(1);
  });

  it('形の壊れた記録が混じっていても、読める記録は残る', () => {
    const before = walked();
    const restored = restoreState(world, {
      ...before,
      gateChoices: [null, 'g-work', { gateId: 'g-work' }, { fragmentId: 'x' }, ...before.gateChoices],
    });
    expect(restored!.gateChoices).toEqual(before.gateChoices);
  });

  it('読み戻した状態でも、扉の向こうへ歩けるかの判定はそのまま働く', () => {
    const before = walked();
    const restored = restoreState(world, JSON.parse(JSON.stringify(before)))!;
    const beyond = world.gates.find((g) => g.id === 'g-work')!.beyond;
    expect(canMove(world, restored, beyond)).toBe(canMove(world, before, beyond));
  });
});
