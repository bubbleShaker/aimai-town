import { describe, expect, it } from 'vitest';
import { world } from '../scenario';
import type { Ending, EndingId, World } from '../scenario/types';
import type { GameState } from './state';
import {
  axes,
  canMove,
  createInitialState,
  heldContradiction,
  isSealed,
  reduce,
  resolveEndingId,
  trace,
} from './state';
import { restoreState } from './restore';

/**
 * 検めそのものを試すための、最小の町。
 * 本番の world だけで試すと、シナリオを書き足したとき期待値の意味がずれる。
 * また restore が備えている「世界データを削った／足したあとの古い保存」は、
 * 世界を二つ用意しないと再現できない。
 *
 * あ ―― い（戸のむこう）
 * ｜
 * ゑ（終幕）
 */
function tinyWorld(edit: (w: World) => World = (w) => w): World {
  const lines = [{ text: '…' }];
  const endingIds: EndingId[] = [
    'e-lighthouse',
    'e-weaver',
    'e-square',
    'e-fog',
    'e-halfway',
    'e-nameless',
  ];
  return edit({
    start: 'a',
    finale: 'z',
    places: [
      {
        id: 'a',
        name: 'あ',
        x: 50,
        y: 50,
        arrival: lines,
        links: ['b', 'z'],
        talks: [{ id: 't1', label: '話す', lines, grants: ['f1', 'f2'] }],
      },
      { id: 'b', name: 'い', x: 20, y: 20, arrival: lines, links: ['a'], talks: [] },
      { id: 'z', name: 'ゑ', x: 80, y: 80, arrival: lines, links: ['a'], talks: [] },
    ],
    fragments: [
      { id: 'f1', text: 'ひとつめ', source: '誰か' },
      { id: 'f2', text: 'ふたつめ', source: '誰か' },
    ],
    gates: [
      {
        id: 'g1',
        name: '戸',
        beyond: 'b',
        tension: ['f1', 'f2'],
        prologue: lines,
        responses: {},
        fallback: { lines, shift: { distance: 1, certainty: 1 } },
      },
    ],
    endings: Object.fromEntries(
      endingIds.map((id) => [id, { id, name: id, lines }]),
    ) as Record<EndingId, Ending>,
    closing: lines,
  });
}

/** その場所の話をすべて終える */
function talkAll(state: GameState): GameState {
  const place = world.places.find((p) => p.id === state.currentPlaceId)!;
  return place.talks.reduce((s, talk) => reduce(s, { type: 'FINISH_TALK', talkId: talk.id }, world), state);
}

/**
 * 最小の町を歩き切った状態。言葉をすべて拾い、突きつけられた片方をそのまま戸に置いてある。
 * つまり隠しの終幕（矛盾を矛盾のまま抱えた）を引く歩み。
 */
function tinyPlayed(): GameState {
  const w = tinyWorld();
  let s = reduce(createInitialState(w), { type: 'FINISH_TALK', talkId: 't1' }, w);
  s = reduce(s, { type: 'OPEN_GATE', gateId: 'g1', fragmentId: 'f1' }, w);
  return reduce(s, { type: 'MOVE', to: 'b' }, w);
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

  it('読み戻しても、軸と引く終幕は変わらない', () => {
    const before = walked();
    const restored = restoreState(world, JSON.parse(JSON.stringify(before)))!;
    expect(axes(world, restored)).toEqual(axes(world, before));
    expect(resolveEndingId(world, restored)).toBe(resolveEndingId(world, before));
    expect(heldContradiction(world, restored)).toBe(heldContradiction(world, before));
  });
});

describe('まだ入れない場所に立った保存', () => {
  it('開いた扉の向こうに立っているだけなら、そのままそこに残す', () => {
    const beyond = world.gates.find((g) => g.id === 'g-work')!.beyond;
    const before = { ...walked(), currentPlaceId: beyond };
    expect(restoreState(world, before)!.currentPlaceId).toBe(beyond);
  });

  it('閉じた扉の向こうに立った保存は、始まりの場所へ戻す（歩みは残す）', () => {
    const before = { ...walked(), openedGateIds: [], gateChoices: [] };
    const restored = restoreState(world, { ...before, currentPlaceId: 'loom-inner' })!;
    expect(restored.currentPlaceId).toBe(world.start);
    // 拾った断片まで流さない
    expect(restored.fragmentIds).toEqual(before.fragmentIds);
    expect(restored.visitedPlaceIds).toContain(world.start);
  });

  it('扉を開かないまま終幕の場所に立った保存では、終幕を引けない', () => {
    const restored = restoreState(world, {
      ...createInitialState(world),
      currentPlaceId: world.finale,
    })!;
    expect(restored.currentPlaceId).toBe(world.start);
    expect(isSealed(world, restored, world.finale)).toBe(true);
  });
});

describe('世界データを書き換えたあとの、古い保存', () => {
  it('置いた一枚が世界から消えたら、その扉は開いていないことにする', () => {
    const before = tinyPlayed();
    // 戸に置いた f1 を、あとから町から削った世界で読む
    const after = tinyWorld((w) => ({
      ...w,
      fragments: w.fragments.filter((f) => f.id !== 'f1'),
      places: w.places.map((p) => ({ ...p, talks: p.talks.map((t) => ({ ...t, grants: ['f2'] })) })),
    }));
    const restored = restoreState(after, before)!;
    expect(restored.openedGateIds).toEqual([]);
    expect(restored.gateChoices).toEqual([]);
    // 開いていないことにした扉の向こうに立ったままにはしない
    expect(restored.currentPlaceId).toBe(after.start);
  });

  it('扉を足したあとは、その向こうに立っていた人を始まりの場所へ戻す', () => {
    const before = { ...tinyPlayed(), currentPlaceId: 'z' };
    // 終幕の場所に、新しく戸を立てた世界
    const after = tinyWorld((w) => ({
      ...w,
      gates: [...w.gates, { ...w.gates[0], id: 'g2', name: '新しい戸', beyond: 'z' }],
    }));
    expect(restoreState(after, before)!.currentPlaceId).toBe(after.start);
  });

  it('扉の記録が片側だけ残っても、隠しの終幕は成り立たない', () => {
    const before = tinyPlayed();
    // 突きつけられた片方をそのまま置いて歩き切った状態なので、本来はこれを引く
    expect(resolveEndingId(tinyWorld(), before)).toBe('e-nameless');

    // 置いた一枚の記録だけを消した保存
    const tampered = { ...before, gateChoices: [] };
    const restored = restoreState(tinyWorld(), tampered)!;
    expect(heldContradiction(tinyWorld(), restored)).toBe(false);
    expect(resolveEndingId(tinyWorld(), restored)).not.toBe('e-nameless');
  });
});
