import { describe, expect, it } from 'vitest';
import { world } from '../scenario';
import {
  canMove,
  collectedFragments,
  createInitialState,
  findFragment,
  findGate,
  findPlace,
  gateResponse,
  gatesAhead,
  pendingGrants,
  reduce,
  roads,
} from './state';

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
    expect(canMove(world, before, 'nowhere')).toBe(false);
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

describe('pendingGrants', () => {
  it('これから得る断片だけを返す', () => {
    const s = createInitialState(world);
    expect(pendingGrants(world, s, 't-child').map((f) => f.id)).toEqual(['f-approval']);
  });

  it('すでに持っている断片は含まない', () => {
    const s = reduce(createInitialState(world), { type: 'FINISH_TALK', talkId: 't-child' }, world);
    expect(pendingGrants(world, s, 't-child')).toEqual([]);
  });

  it('その場にいない相手の断片は覗けない', () => {
    expect(pendingGrants(world, createInitialState(world), 't-master')).toEqual([]);
  });
});

describe('roads', () => {
  it('双方向の道を一本に畳む', () => {
    const list = roads(world);
    const keys = list.map(([a, b]) => [a, b].sort().join('|'));
    expect(new Set(keys).size).toBe(list.length);
    // 道は双方向に張られているので、畳むとちょうど半分になる
    const totalLinks = world.places.reduce((n, p) => n + p.links.length, 0);
    expect(list.length).toBe(totalLinks / 2);
  });
});

describe('扉', () => {
  /** 織り小屋まで行き、親方から二枚もらった状態 */
  function atLoom() {
    let s = reduce(createInitialState(world), { type: 'MOVE', to: 'loom' }, world);
    s = reduce(s, { type: 'FINISH_TALK', talkId: 't-master' }, world);
    return s;
  }

  it('開くまで、扉の向こうへは歩けない', () => {
    const s = atLoom();
    expect(canMove(world, s, 'loom-inner')).toBe(false);
    expect(reduce(s, { type: 'MOVE', to: 'loom-inner' }, world)).toBe(s);
  });

  it('目の前の扉だけが見える', () => {
    expect(gatesAhead(world, createInitialState(world))).toEqual([]);
    expect(gatesAhead(world, atLoom()).map((g) => g.id)).toEqual(['g-work']);
  });

  it('持っていない断片は差し出せない', () => {
    const s = atLoom();
    expect(reduce(s, { type: 'OPEN_GATE', gateId: 'g-work', fragmentId: 'f-solitude' }, world)).toBe(s);
  });

  it('目の前に無い扉は開けられない', () => {
    const s = reduce(createInitialState(world), { type: 'FINISH_TALK', talkId: 't-child' }, world);
    expect(reduce(s, { type: 'OPEN_GATE', gateId: 'g-work', fragmentId: 'f-approval' }, world)).toBe(s);
  });

  it('どの断片を差し出しても扉は開き、選択が記録される', () => {
    const before = atLoom();
    for (const fragmentId of before.fragmentIds) {
      const after = reduce(before, { type: 'OPEN_GATE', gateId: 'g-work', fragmentId }, world);
      expect(after.openedGateIds).toEqual(['g-work']);
      expect(after.gateChoices).toEqual([{ gateId: 'g-work', fragmentId }]);
      expect(canMove(world, after, 'loom-inner')).toBe(true);
    }
  });

  it('一度開いた扉は、二度目の選択を受け付けない', () => {
    let s = reduce(atLoom(), { type: 'OPEN_GATE', gateId: 'g-work', fragmentId: 'f-autonomy' }, world);
    const opened = s;
    s = reduce(s, { type: 'OPEN_GATE', gateId: 'g-work', fragmentId: 'f-respect' }, world);
    expect(s).toBe(opened);
    expect(s.gateChoices).toHaveLength(1);
  });

  it('扉の向こうと行き来できる', () => {
    let s = reduce(atLoom(), { type: 'OPEN_GATE', gateId: 'g-work', fragmentId: 'f-autonomy' }, world);
    s = reduce(s, { type: 'MOVE', to: 'loom-inner' }, world);
    expect(s.currentPlaceId).toBe('loom-inner');
    s = reduce(s, { type: 'MOVE', to: 'loom' }, world);
    expect(s.currentPlaceId).toBe('loom');
  });

  it('返答が用意されていない断片には、共通の返答が使われる', () => {
    const gate = findGate(world, 'g-work')!;
    expect(gateResponse(gate, 'f-autonomy')).toBe(gate.responses['f-autonomy']);
    expect(gateResponse(gate, 'f-unknown')).toBe(gate.fallback);
  });
});

describe('世界の整合性', () => {
  it('扉が指す場所と断片は、すべて定義済みである', () => {
    for (const gate of world.gates) {
      expect(findPlace(world, gate.beyond), `${gate.id} の行き先が無い`).toBeDefined();
      for (const id of [...gate.tension, ...Object.keys(gate.responses)]) {
        expect(findFragment(world, id), `${gate.id} が未定義の断片 ${id} を指している`).toBeDefined();
      }
    }
  });

  it('扉の向こうへは、その扉を通る道しか無い', () => {
    for (const gate of world.gates) {
      const neighbors = world.places.filter((p) => p.links.includes(gate.beyond));
      expect(neighbors.length, `${gate.beyond} に扉を通らない入口がある`).toBe(1);
    }
  });

  it('開始地点が存在する', () => {
    expect(findPlace(world, world.start)).toBeDefined();
  });

  it('場所・断片・対話の id に重複が無い', () => {
    const ids = [
      ...world.places.map((p) => p.id),
      ...world.fragments.map((f) => f.id),
      ...world.places.flatMap((p) => p.talks.map((t) => t.id)),
    ];
    expect(new Set(ids).size, `重複した id がある: ${ids.join(', ')}`).toBe(ids.length);
  });

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
